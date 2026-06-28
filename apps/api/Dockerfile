# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy package.json files for workspace dependency resolution
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the API
RUN cd apps/api && npx tsc

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy root workspace files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=@cutbooklite/api --workspace=@cutbooklite/shared && \
    npm cache clean --force

# Copy Prisma schema and generate client in production image
COPY apps/api/prisma/ ./apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Copy built output
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/packages/shared/src/ ./packages/shared/src/

# Create logs directory
RUN mkdir -p /app/apps/api/logs && chown appuser:nodejs /app/apps/api/logs

USER appuser

WORKDIR /app/apps/api

EXPOSE 4000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
