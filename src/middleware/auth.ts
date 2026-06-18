import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import type { ApiResponse } from '../types';
import { config } from '../config';

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
export async function verifyLineToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // ── 1. ดึง idToken จาก Authorization header ──────────────────────────────
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  // ── 2. Production: Verify กับ LINE API ───────────────────────────────────
  if (idToken) {
    try {
      const verifyResp = await axios.get(
        'https://api.line.me/oauth2/v2.1/verify',
        {
          params: {
            id_token: idToken,
            client_id: config.line.liffId,
          },
          timeout: 5000,
        }
      );

      const lineUserId = verifyResp.data?.sub;
      if (lineUserId) {
        (req as Request & { verifiedUserId: string }).verifiedUserId = lineUserId;
        next();
        return;
      }
    } catch (verifyErr: unknown) {
      const err = verifyErr as { response?: { status?: number; data?: { error?: string } }; message?: string };
      console.error('[Auth] LINE token verify failed:', err?.response?.data?.error || err?.message);
      // Token ไม่ valid → reject
      res.status(401).json({
        success: false,
        error: 'Invalid or expired LINE ID token',
      } satisfies ApiResponse);
      return;
    }
  }

  // ── 3. Fallback: Development mode (รับ userId จาก body) ─────────────────
  if (config.server.nodeEnv === 'development' && !idToken) {
    const bodyUserId = req.body?.userId as string | undefined;
    if (bodyUserId && typeof bodyUserId === 'string' && bodyUserId.trim() !== '') {
      console.warn('[Auth] ⚠️  DEV MODE — trusting userId from body (DO NOT use in production)');
      (req as Request & { verifiedUserId: string }).verifiedUserId = bodyUserId.trim();
      next();
      return;
    }
  }

  // ── 4. ไม่มี token ที่ valid ────────────────────────────────────────────
  res.status(401).json({
    success: false,
    error: 'Missing LINE ID token. Please log in via LINE.',
  } satisfies ApiResponse);
}

/**
 * Legacy: validate userId from body (DEPRECATED — ใช้ verifyLineToken แทน)
 * ยังคงเก็บไว้สำหรับ backward compatibility ชั่วคราว
 */
export function validateUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = req.body?.userId as string | undefined;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    const response: ApiResponse = {
      success: false,
      error: 'Missing or invalid userId',
    };
    res.status(400).json(response);
    return;
  }

  (req as Request & { validatedUserId: string }).validatedUserId = userId.trim();
  next();
}

/**
 * Middleware to parse and validate action from request body.
 */
export function validateAction(req: Request, res: Response, next: NextFunction): void {
  const action = req.body?.action as string | undefined;

  if (!action || typeof action !== 'string') {
    const response: ApiResponse = {
      success: false,
      error: 'Missing or invalid action',
    };
    res.status(400).json(response);
    return;
  }

  (req as Request & { validatedAction: string }).validatedAction = action.trim();
  next();
}

/**
 * Error handler wrapper for async route handlers.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
