import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import salonsRoutes from './routes/salons.routes';
import servicesRoutes from './routes/services.routes';
import expensesRoutes from './routes/expenses.routes';
import earningsRoutes from './routes/earnings.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';
import barbersRoutes from './routes/barbers.routes';
import { errorHandler } from './middleware/error';
import prisma from './db/prisma';

const app = express();
const port = Number(process.env.PORT) || 3000;

// ── Security headers ──────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Auth rate limiter (10 req/min per IP) ─────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again in a minute.' }
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/v1/auth', authLimiter, authRoutes);
app.use('/v1/salons', salonsRoutes);
app.use('/v1/services', servicesRoutes);
app.use('/v1/expenses', expensesRoutes);
app.use('/v1/earnings', earningsRoutes);
app.use('/v1/subscription', subscriptionRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/barbers', barbersRoutes);

app.get('/', (_req, res) => {
  res.json({ name: 'CutBook API', version: '1.0.0' });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`[server] Listening on port ${port} (${process.env.NODE_ENV || 'development'})`);
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[server] Shutdown complete');
    process.exit(0);
  });
  // Force exit after 10s if connections don't close
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
