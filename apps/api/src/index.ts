import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { router } from './router';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';
import { prisma, disconnectPrisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Trust Proxy (required behind load balancers / reverse proxies) ───────────
app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ─── Global Rate Limit ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Health Check (liveness) ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Readiness Check (verifies DB connectivity) ──────────────────────────────
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Readiness check failed', err);
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 CutBook API running on port ${PORT}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await disconnectPrisma();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error during shutdown', err);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
