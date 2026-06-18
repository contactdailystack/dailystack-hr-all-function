import axios from 'axios';
import { config } from '../config';
import type { PostbackData } from '../types';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// ─── LINE Messaging API ──────────────────────────────────────────────────────

async function lineApi<T>(
  method: 'POST' | 'GET' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${LINE_API_BASE}${path}`;
  const response = await axios.request<T>({
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.line.channelAccessToken}`,
    },
    data: body,
    timeout: 8000,
  });
  return response.data;
}

interface LinePushPayload {
  to: string;
  messages: LineMessage[];
}

interface LineMessage {
  type: 'text' | 'flex';
  text?: string;
  altText?: string;
  contents?: unknown;
}

interface LineReplyPayload {
  replyToken: string;
  messages: LineMessage[];
}

interface LinePushResponse {
  success: boolean;
}

// ─── Push Message ─────────────────────────────────────────────────────────────

export async function pushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<void> {
  if (!config.line.channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  }

  const payload: LinePushPayload = { to: userId, messages };
  await lineApi<LinePushResponse>('POST', '/message/push', payload);
}

export async function pushText(userId: string, text: string): Promise<void> {
  await pushMessage(userId, [{ type: 'text', text }]);
}

export async function pushUrgent(userId: string, text: string): Promise<void> {
  await pushText(userId, `🚨 ${text}`);
}

// ─── Reply Message ────────────────────────────────────────────────────────────

export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  if (!config.line.channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  }

  const payload: LineReplyPayload = { replyToken, messages };
  await lineApi<LinePushResponse>('POST', '/message/reply', payload);
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  await replyMessage(replyToken, [{ type: 'text', text }]);
}

// ─── Rich Notification Helpers ───────────────────────────────────────────────

export async function notifyManager(message: string, managerLineId: string): Promise<void> {
  try {
    await pushText(managerLineId, `🔔 ${message}`);
  } catch (err) {
    console.error('[NotifyManager] Failed to send notification:', err);
    console.log(`[NotifyManager] MANUAL FOLLOW-UP REQUIRED: ${message}`);
  }
}

export async function notifyManagerUrgent(
  message: string,
  managerLineId: string
): Promise<void> {
  await notifyManager(`🚨 ${message}`, managerLineId);
}

// ─── Leave Approval Flex Message ─────────────────────────────────────────────

export async function sendLeaveApprovalFlex(
  managerLineId: string,
  employeeName: string,
  leaveLabel: string,
  startDate: string,
  endDate: string | null,
  note: string | null,
  postbackData: PostbackData
): Promise<void> {
  const postbackPayload = JSON.stringify(postbackData);

  const flexMessage = {
    type: 'flex' as const,
    altText: `📝 คำขอลาใหม่จาก ${employeeName}`,
    contents: {
      type: 'bubble',
      styles: {
        footer: { separator: true },
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: '📝 คำขอลาใหม่',
            weight: 'bold' as const,
            size: 'lg' as const,
            color: '#1a1a1a',
          },
          {
            type: 'text' as const,
            text: `พนักงาน: ${employeeName}`,
            margin: 'md' as const,
            color: '#333333',
            size: 'md' as const,
          },
          {
            type: 'text' as const,
            text: `ประเภท: ${leaveLabel}`,
            margin: 'sm' as const,
            color: '#555555',
            size: 'sm' as const,
          },
          {
            type: 'text' as const,
            text: `วันที่: ${startDate}${endDate ? ` → ${endDate}` : ''}`,
            margin: 'sm' as const,
            color: '#555555',
            size: 'sm' as const,
          },
          {
            type: 'text' as const,
            text: `หมายเหตุ: ${note || '-'}`,
            margin: 'sm' as const,
            wrap: true,
            color: '#555555',
            size: 'sm' as const,
          },
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'horizontal' as const,
        spacing: 'sm' as const,
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            color: '#00A040',
            action: {
              type: 'postback' as const,
              label: '✅ อนุมัติ',
              data: postbackPayload.replace('"action":"approve_leave"', '"action":"approve_leave"'),
              displayText: '✅ อนุมัติ',
            },
          },
          {
            type: 'button' as const,
            style: 'primary' as const,
            color: '#CC0000',
            action: {
              type: 'postback' as const,
              label: '❌ ปฏิเสธ',
              data: postbackPayload.replace('"action":"reject_leave"', '"action":"reject_leave"'),
              displayText: '❌ ปฏิเสธ',
            },
          },
        ],
      },
    },
  };

  try {
    await pushMessage(managerLineId, [flexMessage]);
  } catch {
    // Fallback to plain text
    await pushText(managerLineId, [
      `📝 คำขอลาใหม่`,
      `พนักงาน: ${employeeName}`,
      `ประเภท: ${leaveLabel}`,
      `วันที่: ${startDate}${endDate ? ` → ${endDate}` : ''}`,
      `หมายเหตุ: ${note || '-'}`,
      '',
      'กรุณาเปิด LIFF เพื่ออนุมัติ/ปฏิเสธ',
    ].join('\n'));
  }
}

// ─── Verification ─────────────────────────────────────────────────────────────

export async function verifyLineSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!config.line.channelSecret || !signature) return false;

  const crypto = await import('crypto');
  const hash = crypto
    .createHmac('SHA256', config.line.channelSecret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === signature;
}
