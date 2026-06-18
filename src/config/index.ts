import { createClient } from '@supabase/supabase-js';

function getEnv(key: string, fallback = ''): string {
  return (globalThis as unknown as Record<string, string>)[key]
    || (typeof process !== 'undefined' ? (process.env as Record<string, string>)[key] : undefined)
    || fallback;
}

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy-initialized clients — only created when first accessed, not at import time.
// This allows the Worker to start even if env vars are missing from local .dev.vars,
// as long as the routes that need them are not called.
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabase(): ReturnType<typeof createClient> {
  if (!_supabase) {
    _supabase = createClient(
      requireEnv('SUPABASE_URL', supabaseUrl),
      requireEnv('SUPABASE_ANON_KEY', supabaseAnonKey),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

function getSupabaseAdmin(): ReturnType<typeof createClient> | null {
  if (!_supabaseAdmin) {
    const serviceKey = requireEnv('SUPABASE_SERVICE_KEY', supabaseServiceKey);
    _supabaseAdmin = createClient(
      requireEnv('SUPABASE_URL', supabaseUrl),
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabaseAdmin;
}

// Named exports for route usage
export const supabase = { get client() { return getSupabase(); } };
export const supabaseAdmin = { get client() { return getSupabaseAdmin(); } };

export const config = {
  line: {
    channelAccessToken: getEnv('LINE_CHANNEL_ACCESS_TOKEN'),
    channelSecret: getEnv('LINE_CHANNEL_SECRET'),
    liffId: getEnv('LINE_LIFF_ID'),
  },
  geofence: {
    maxAccuracy: 50,
    defaultBranch: {
      lat: 13.692087686713544,
      lng: 100.5281857510635,
      radius: 80,
    } as const,
  },
  server: {
    nodeEnv: getEnv('NODE_ENV', 'development'),
  },
} as const;

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  LINE_LIFF_ID: string;
  NODE_ENV: string;
};

export default config;
