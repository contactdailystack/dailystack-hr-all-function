import { Request, Response, NextFunction } from 'express';
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
export declare function verifyLineToken(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Legacy: validate userId from body (DEPRECATED — ใช้ verifyLineToken แทน)
 * ยังคงเก็บไว้สำหรับ backward compatibility ชั่วคราว
 */
export declare function validateUserId(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to parse and validate action from request body.
 */
export declare function validateAction(req: Request, res: Response, next: NextFunction): void;
/**
 * Error handler wrapper for async route handlers.
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map