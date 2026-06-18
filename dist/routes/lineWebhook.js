"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notification_1 = require("../services/notification");
const supabase_1 = require("../services/supabase");
const notification_2 = require("../services/notification");
const supabase_2 = require("../services/supabase");
const router = (0, express_1.Router)();
/**
 * POST /line/webhook
 * LINE Server-Side Verification (GET with hub.verify params)
 */
router.get('/line/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.LINE_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[LINE Webhook] Webhook verified');
        res.status(200).send(challenge);
    }
    else {
        console.warn('[LINE Webhook] Verification failed — wrong token or mode');
        res.sendStatus(403);
    }
});
/**
 * POST /line/webhook
 * Receives LINE webhook events (postback, message, etc.)
 */
router.post('/line/webhook', (0, auth_1.asyncHandler)(async (req, res) => {
    // 1. Verify LINE signature
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-line-signature'];
    const valid = await (0, notification_1.verifyLineSignature)(rawBody, signature ?? null);
    if (!valid) {
        console.warn('[LINE Webhook] Invalid signature — rejected');
        res.sendStatus(403);
        return;
    }
    const events = req.body.events;
    for (const event of events) {
        await handleWebhookEvent(event);
    }
    res.status(200).json({ success: true });
}));
async function handleWebhookEvent(event) {
    // Handle postback (e.g., approve/reject leave buttons)
    if (event.type === 'postback' && event.postback?.data) {
        let postbackData;
        try {
            postbackData = JSON.parse(event.postback.data);
        }
        catch {
            console.error('[LINE Webhook] Failed to parse postback data:', event.postback.data);
            return;
        }
        if (!postbackData.action || !postbackData.requestId)
            return;
        const { action, requestId, employeeId, employeeLineId } = postbackData;
        // Get manager LINE ID to verify the approver is the manager
        const managerLineId = await (0, supabase_2.getSetting)('LINE Manager ID');
        const sourceUserId = event.source?.userId;
        // Authorization check: only manager can approve/reject
        if (sourceUserId !== managerLineId) {
            console.warn('[LINE Webhook] Unauthorized approval attempt from', sourceUserId);
            if (event.replyToken) {
                await (0, notification_2.pushText)(event.replyToken, '❌ คุณไม่มีสิทธิ์ดำเนินการนี้');
            }
            return;
        }
        try {
            if (action === 'approve_leave') {
                await (0, supabase_1.approveLeaveRequest)(requestId, managerLineId);
                await (0, notification_2.pushText)(employeeLineId, '✅ คำขอลาของคุณได้รับการอนุมัติแล้ว');
                if (event.replyToken) {
                    await (0, notification_2.pushText)(event.replyToken, '✅ อนุมัติคำขอลาแล้ว');
                }
            }
            else if (action === 'reject_leave') {
                await (0, supabase_1.rejectLeaveRequest)(requestId, managerLineId);
                await (0, notification_2.pushText)(employeeLineId, '❌ คำขอลาของคุณไม่ได้รับการอนุมัติ');
                if (event.replyToken) {
                    await (0, notification_2.pushText)(event.replyToken, '❌ ปฏิเสธคำขอลาแล้ว');
                }
            }
        }
        catch (err) {
            console.error('[LINE Webhook] Leave action failed:', err);
            if (event.replyToken) {
                await (0, notification_2.pushText)(event.replyToken, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        }
        return;
    }
    // Handle follow/unfollow events
    if (event.type === 'follow') {
        console.log('[LINE Webhook] User followed:', event.source?.userId);
        return;
    }
    if (event.type === 'unfollow') {
        console.log('[LINE Webhook] User unfollowed:', event.source?.userId);
        return;
    }
    // Ignore other event types
    console.log('[LINE Webhook] Unhandled event type:', event.type);
}
exports.default = router;
//# sourceMappingURL=lineWebhook.js.map