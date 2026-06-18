"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// ✅ P0.3: Security middleware
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const clock_1 = __importDefault(require("./routes/clock"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const leave_1 = __importDefault(require("./routes/leave"));
const payslip_1 = __importDefault(require("./routes/payslip"));
const profile_1 = __importDefault(require("./routes/profile"));
const lineWebhook_1 = __importDefault(require("./routes/lineWebhook"));
const config_1 = require("./config");
const app = (0, express_1.default)();
// ─── Security Middleware ─────────────────────────────────────────────────────
// ✅ Helmet: secure HTTP headers (ป้องกัน XSS, clickjacking, sniffing)
app.use((0, helmet_1.default)());
// ✅ CORS: whitelist เฉพาะ LINE LIFF domains
const allowedOrigins = [
    'https://liff.line.me',
    // เพิ่ม production domain ตรงนี้:
    // 'https://your-domain.com',
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ✅ Rate Limiting: ป้องกัน abuse / DDoS
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 100, // สูงสุด 100 requests ต่อ IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter); // ใช้เฉพาะ API routes
// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express_1.default.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/', clock_1.default); // POST /clock_in, /clock_out, /get_clock_status
app.use('/', schedule_1.default); // POST /get_schedule
app.use('/', leave_1.default); // POST /submit_leave, /get_leave_history
app.use('/', payslip_1.default); // POST /get_payslip
app.use('/', profile_1.default); // POST /get_profile
app.use('/', lineWebhook_1.default); // GET/POST /line/webhook
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});
// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[Global Error]', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ─── Start Server ────────────────────────────────────────────────────────────
const port = config_1.config.server.port;
app.listen(port, () => {
    console.log(`🚀 DailyStack-HR API running on port ${port}`);
    console.log(`   Environment: ${config_1.config.server.nodeEnv}`);
    console.log(`   LINE configured: ${!!config_1.config.line.channelAccessToken}`);
    console.log(`   Supabase configured: ${!!process.env.SUPABASE_URL}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map