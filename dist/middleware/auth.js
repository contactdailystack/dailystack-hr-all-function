"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLineToken = verifyLineToken;
exports.validateUserId = validateUserId;
exports.validateAction = validateAction;
exports.asyncHandler = asyncHandler;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
/**
 * ✅ P0.1: LINE ID Token Verification Middleware
 *
 * Logic:
 * 1. รับ idToken จาก LIFF SDK (ส่งมาพร้อม header: Authorization: Bearer <idToken>)
 * 2. Verify กับ LINE API — ถ้า token ถูกต้อง → ดึง userId จริงจาก LINE
 * 3. Attach verifiedUserId ให้ request
 *
 * Security: ป้องกัน userId spoofing — ไม่ต้องเชื่อ userId จาก request body อีกต่อไป
 *
 * LIFF ส่ง idToken มาทาง Authorization header (Bearer token)
 * ใน development ยังรองรับ { userId } จาก body (fallback)
 */
async function verifyLineToken(req, res, next) {
    // ── 1. ดึง idToken จาก Authorization header ──────────────────────────────
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;
    // ── 2. Production: Verify กับ LINE API ───────────────────────────────────
    if (idToken) {
        try {
            const verifyResp = await axios_1.default.get('https://api.line.me/oauth2/v2.1/verify', {
                params: {
                    id_token: idToken,
                    client_id: config_1.config.line.liffId,
                },
                timeout: 5000,
            });
            const lineUserId = verifyResp.data?.sub;
            if (lineUserId) {
                req.verifiedUserId = lineUserId;
                next();
                return;
            }
        }
        catch (verifyErr) {
            const err = verifyErr;
            console.error('[Auth] LINE token verify failed:', err?.response?.data?.error || err?.message);
            // Token ไม่ valid → reject
            res.status(401).json({
                success: false,
                error: 'Invalid or expired LINE ID token',
            });
            return;
        }
    }
    // ── 3. Fallback: Development mode (รับ userId จาก body) ─────────────────
    if (config_1.config.server.nodeEnv === 'development' && !idToken) {
        const bodyUserId = req.body?.userId;
        if (bodyUserId && typeof bodyUserId === 'string' && bodyUserId.trim() !== '') {
            console.warn('[Auth] ⚠️  DEV MODE — trusting userId from body (DO NOT use in production)');
            req.verifiedUserId = bodyUserId.trim();
            next();
            return;
        }
    }
    // ── 4. ไม่มี token ที่ valid ────────────────────────────────────────────
    res.status(401).json({
        success: false,
        error: 'Missing LINE ID token. Please log in via LINE.',
    });
}
/**
 * Legacy: validate userId from body (DEPRECATED — ใช้ verifyLineToken แทน)
 * ยังคงเก็บไว้สำหรับ backward compatibility ชั่วคราว
 */
function validateUserId(req, res, next) {
    const userId = req.body?.userId;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        const response = {
            success: false,
            error: 'Missing or invalid userId',
        };
        res.status(400).json(response);
        return;
    }
    req.validatedUserId = userId.trim();
    next();
}
/**
 * Middleware to parse and validate action from request body.
 */
function validateAction(req, res, next) {
    const action = req.body?.action;
    if (!action || typeof action !== 'string') {
        const response = {
            success: false,
            error: 'Missing or invalid action',
        };
        res.status(400).json(response);
        return;
    }
    req.validatedAction = action.trim();
    next();
}
/**
 * Error handler wrapper for async route handlers.
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
//# sourceMappingURL=auth.js.map