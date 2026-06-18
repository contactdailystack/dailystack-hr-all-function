import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// ✅ P0.3: Security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

import clockRoutes from './routes/clock';
import scheduleRoutes from './routes/schedule';
import leaveRoutes from './routes/leave';
import payslipRoutes from './routes/payslip';
import profileRoutes from './routes/profile';
import lineWebhookRouter from './routes/lineWebhook';
import { config } from './config';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

// ✅ Helmet: secure HTTP headers (ป้องกัน XSS, clickjacking, sniffing)
app.use(helmet());

// ✅ CORS: whitelist เฉพาะ LINE LIFF domains
const allowedOrigins = [
  'https://liff.line.me',
  // เพิ่ม production domain ตรงนี้:
  // 'https://your-domain.com',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ✅ Rate Limiting: ป้องกัน abuse / DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // สูงสุด 100 requests ต่อ IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter); // ใช้เฉพาะ API routes

// ─── Body Parser ─────────────────────────────────────────────────────────────

app.use(express.json({ verify: (req, _res, buf) => { (req as unknown as Record<string, unknown>).rawBody = buf.toString(); } }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/', clockRoutes);        // POST /clock_in, /clock_out, /get_clock_status
app.use('/', scheduleRoutes);     // POST /get_schedule
app.use('/', leaveRoutes);        // POST /submit_leave, /get_leave_history
app.use('/', payslipRoutes);      // POST /get_payslip
app.use('/', profileRoutes);      // POST /get_profile
app.use('/', lineWebhookRouter);  // GET/POST /line/webhook

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

const port = config.server.port;

app.listen(port, () => {
  console.log(`🚀 DailyStack-HR API running on port ${port}`);
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   LINE configured: ${!!config.line.channelAccessToken}`);
  console.log(`   Supabase configured: ${!!process.env.SUPABASE_URL}`);
});

export default app;
