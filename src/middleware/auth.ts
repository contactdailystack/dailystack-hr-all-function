import type { Context, Next } from 'hono';
import axios from 'axios';
import { config } from '../config';
import type { ApiResponse } from '../types';

export async function verifyLineToken(c: Context, next: Next) {
  const authHeader = c.req.header('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (idToken) {
    try {
      const verifyResp = await axios.get(
        'https://api.line.me/oauth2/v2.1/verify',
        { params: { id_token: idToken, client_id: config.line.liffId }, timeout: 5000 }
      );
      const lineUserId = verifyResp.data?.sub;
      if (lineUserId) { c.set('verifiedUserId', lineUserId); return next(); }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      console.error('[Auth] LINE token verify failed:', e?.response?.data?.error || e?.message);
      return c.json({ success: false, error: 'Invalid or expired LINE ID token' } satisfies ApiResponse, 401);
    }
  }

  if (config.server.nodeEnv === 'development' && !idToken) {
    try {
      const body = await c.req.json();
      const bodyUserId = body?.userId as string | undefined;
      if (bodyUserId && typeof bodyUserId === 'string' && bodyUserId.trim() !== '') {
        console.warn('[Auth] DEV MODE - trusting userId from body');
        c.set('verifiedUserId', bodyUserId.trim());
        return next();
      }
    } catch { /* ignore */ }
  }

  return c.json({ success: false, error: 'Missing LINE ID token. Please log in via LINE.' } satisfies ApiResponse, 401);
}

export async function errorHandler(c: Context, next: Next) {
  try { await next(); }
  catch (err: unknown) {
    const message = config.server.nodeEnv === 'development' ? (err as Error).message : 'Internal server error';
    console.error('[Global Error]', err);
    return c.json({ success: false, error: message }, 500);
  }
}
