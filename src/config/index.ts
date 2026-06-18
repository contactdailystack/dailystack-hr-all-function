import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Supabase Clients ────────────────────────────────────────────────────────
// ✅ P0.2: แยก anon key (สำหรับ RLS) กับ service key (server-only admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

// ✅ สำหรับ API ทั่วไป — RLS จะทำงานถูกต้อง
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ✅ สำหรับ server-side admin operations (เช่น cross-user updates) — อย่า expose ผ่าน API สาธารณะ
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// ─── App Config ─────────────────────────────────────────────────────────────

export const config = {
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    // ✅ P0.1: LIFF ID สำหรับ verify LINE ID Token
    liffId: process.env.LINE_LIFF_ID || '',
  },
  geofence: {
    maxAccuracy: 50,
    // ✅ P1.1: อัปเดตพิกัดจริง (2026-06-17)
    defaultBranch: {
      lat: 13.692087686713544,
      lng: 100.5281857510635,
      radius: 80,
    } as const,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
} as const;

export default config;
