import { createClient } from '@supabase/supabase-js';

function getEnv(key: string, fallback = ''): string {
  return (globalThis as unknown as Record<string, string>)[key]
    || (typeof process !== 'undefined' ? (process.env as Record<string, string>)[key] : undefined)
    || fallback;
}

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

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
