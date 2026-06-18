"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ─── Supabase Clients ────────────────────────────────────────────────────────
// ✅ P0.2: แยก anon key (สำหรับ RLS) กับ service key (server-only admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}
// ✅ สำหรับ API ทั่วไป — RLS จะทำงานถูกต้อง
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
// ✅ สำหรับ server-side admin operations (เช่น cross-user updates) — อย่า expose ผ่าน API สาธารณะ
exports.supabaseAdmin = supabaseServiceKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;
// ─── App Config ─────────────────────────────────────────────────────────────
exports.config = {
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
        },
    },
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
    },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map