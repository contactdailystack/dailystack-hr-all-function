"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushMessage = pushMessage;
exports.pushText = pushText;
exports.pushUrgent = pushUrgent;
exports.replyMessage = replyMessage;
exports.replyText = replyText;
exports.notifyManager = notifyManager;
exports.notifyManagerUrgent = notifyManagerUrgent;
exports.sendLeaveApprovalFlex = sendLeaveApprovalFlex;
exports.verifyLineSignature = verifyLineSignature;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const LINE_API_BASE = 'https://api.line.me/v2/bot';
// ─── LINE Messaging API ──────────────────────────────────────────────────────
async function lineApi(method, path, body) {
    const url = `${LINE_API_BASE}${path}`;
    const response = await axios_1.default.request({
        method,
        url,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config_1.config.line.channelAccessToken}`,
        },
        data: body,
        timeout: 8000,
    });
    return response.data;
}
// ─── Push Message ─────────────────────────────────────────────────────────────
async function pushMessage(userId, messages) {
    if (!config_1.config.line.channelAccessToken) {
        throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
    }
    const payload = { to: userId, messages };
    await lineApi('POST', '/message/push', payload);
}
async function pushText(userId, text) {
    await pushMessage(userId, [{ type: 'text', text }]);
}
async function pushUrgent(userId, text) {
    await pushText(userId, `🚨 ${text}`);
}
// ─── Reply Message ────────────────────────────────────────────────────────────
async function replyMessage(replyToken, messages) {
    if (!config_1.config.line.channelAccessToken) {
        throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
    }
    const payload = { replyToken, messages };
    await lineApi('POST', '/message/reply', payload);
}
async function replyText(replyToken, text) {
    await replyMessage(replyToken, [{ type: 'text', text }]);
}
// ─── Rich Notification Helpers ───────────────────────────────────────────────
async function notifyManager(message, managerLineId) {
    try {
        await pushText(managerLineId, `🔔 ${message}`);
    }
    catch (err) {
        console.error('[NotifyManager] Failed to send notification:', err);
        console.log(`[NotifyManager] MANUAL FOLLOW-UP REQUIRED: ${message}`);
    }
}
async function notifyManagerUrgent(message, managerLineId) {
    await notifyManager(`🚨 ${message}`, managerLineId);
}
// ─── Leave Approval Flex Message ─────────────────────────────────────────────
async function sendLeaveApprovalFlex(managerLineId, employeeName, leaveLabel, startDate, endDate, note, postbackData) {
    const postbackPayload = JSON.stringify(postbackData);
    const flexMessage = {
        type: 'flex',
        altText: `📝 คำขอลาใหม่จาก ${employeeName}`,
        contents: {
            type: 'bubble',
            styles: {
                footer: { separator: true },
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '📝 คำขอลาใหม่',
                        weight: 'bold',
                        size: 'lg',
                        color: '#1a1a1a',
                    },
                    {
                        type: 'text',
                        text: `พนักงาน: ${employeeName}`,
                        margin: 'md',
                        color: '#333333',
                        size: 'md',
                    },
                    {
                        type: 'text',
                        text: `ประเภท: ${leaveLabel}`,
                        margin: 'sm',
                        color: '#555555',
                        size: 'sm',
                    },
                    {
                        type: 'text',
                        text: `วันที่: ${startDate}${endDate ? ` → ${endDate}` : ''}`,
                        margin: 'sm',
                        color: '#555555',
                        size: 'sm',
                    },
                    {
                        type: 'text',
                        text: `หมายเหตุ: ${note || '-'}`,
                        margin: 'sm',
                        wrap: true,
                        color: '#555555',
                        size: 'sm',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#00A040',
                        action: {
                            type: 'postback',
                            label: '✅ อนุมัติ',
                            data: postbackPayload.replace('"action":"approve_leave"', '"action":"approve_leave"'),
                            displayText: '✅ อนุมัติ',
                        },
                    },
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#CC0000',
                        action: {
                            type: 'postback',
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
    }
    catch {
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
async function verifyLineSignature(body, signature) {
    if (!config_1.config.line.channelSecret || !signature)
        return false;
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const hash = crypto
        .createHmac('SHA256', config_1.config.line.channelSecret)
        .update(body, 'utf8')
        .digest('base64');
    return hash === signature;
}
//# sourceMappingURL=notification.js.map