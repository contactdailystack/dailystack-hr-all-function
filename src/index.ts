import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getEmployeeByLineId, getLeaveLabel } from './services/employee';
import { getSetting, approveLeaveRequest, rejectLeaveRequest } from './services/supabase';
import { pushText, verifyLineSignature } from './services/notification';
import { errorHandler } from './middleware/auth';
import { clockInRoute, clockOutRoute, getClockStatusRoute } from './routes/clock';
import { getScheduleRoute } from './routes/schedule';
import { submitLeaveRoute, getLeaveHistoryRoute } from './routes/leave';
import { getPayslipRoute } from './routes/payslip';
import { getProfileRoute } from './routes/profile';
import type { Env } from './config';
import type { LineWebhookEvent, PostbackData } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://liff.line.me'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', errorHandler);

app.get('/health', c => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/line/webhook', c => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  const verifyToken = (globalThis as unknown as Record<string,string>)['LINE_WEBHOOK_VERIFY_TOKEN'];
  if (mode === 'subscribe' && token === verifyToken) { console.log('[LINE Webhook] Verified'); return c.text(challenge ?? '', 200); }
  return c.text('Forbidden', 403);
});

app.post('/line/webhook', async c => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-line-signature');
  const valid = await verifyLineSignature(rawBody, signature ?? null);
  if (!valid) { console.warn('[LINE Webhook] Invalid signature'); return c.json({ success: false }, 403); }
  const body = JSON.parse(rawBody);
  const events: LineWebhookEvent[] = body.events ?? [];
  for (const event of events) { await handleWebhookEvent(event); }
  return c.json({ success: true }, 200);
});

async function handleWebhookEvent(event: LineWebhookEvent) {
  if (event.type === 'postback' && event.postback?.data) {
    let postbackData: PostbackData;
    try { postbackData = JSON.parse(event.postback.data); }
    catch { console.error('[LINE Webhook] Failed to parse postback'); return; }
    const { action, requestId, employeeLineId } = postbackData;
    if (!action || !requestId) return;
    const managerLineId = await getSetting('LINE Manager ID');
    const sourceUserId = event.source?.userId;
    if (sourceUserId !== managerLineId) {
      console.warn('[LINE Webhook] Unauthorized from', sourceUserId);
      if (event.replyToken) await pushText(event.replyToken, 'Not authorized');
      return;
    }
    try {
      if (action === 'approve_leave') {
        await approveLeaveRequest(requestId, managerLineId!);
        await pushText(employeeLineId, 'Leave request approved');
        if (event.replyToken) await pushText(event.replyToken, 'Leave approved');
      } else if (action === 'reject_leave') {
        await rejectLeaveRequest(requestId, managerLineId!);
        await pushText(employeeLineId, 'Leave request rejected');
        if (event.replyToken) await pushText(event.replyToken, 'Leave rejected');
      }
    } catch (err) { console.error('[LINE Webhook]', err); if (event.replyToken) await pushText(event.replyToken, 'Error'); }
    return;
  }
  if (event.type === 'follow') { console.log('[LINE Webhook] Followed:', event.source?.userId); return; }
  if (event.type === 'unfollow') { console.log('[LINE Webhook] Unfollowed:', event.source?.userId); return; }
}

app.post('/clock_in', clockInRoute);
app.post('/clock_out', clockOutRoute);
app.post('/get_clock_status', getClockStatusRoute);
app.post('/get_schedule', getScheduleRoute);
app.post('/submit_leave', submitLeaveRoute);
app.post('/get_leave_history', getLeaveHistoryRoute);
app.post('/get_payslip', getPayslipRoute);
app.post('/get_profile', getProfileRoute);
app.notFound(c => c.json({ success: false, error: 'Not found' }, 404));

export default app;
