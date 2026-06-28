# CutBook Lite Deployment Guide

This guide covers how to deploy the CutBook Lite monorepo to production. 

The monorepo contains:
- `apps/api`: Express.js backend with Prisma (Port 4000)
- `apps/web`: Next.js frontend (Port 3000)
- PostgreSQL database (Supabase recommended for production)
- Redis (Upstash recommended for production)

---

## 1. Prerequisites

Before deploying, ensure you have:
- A server or PaaS account (DigitalOcean, AWS, Vercel, Railway, Render, etc.)
- Node.js 20+ (if not using Docker)
- Docker & Docker Compose (if using the Docker setup)
- A Supabase account for managed PostgreSQL (or any Postgres hosting)
- An Upstash account for managed Redis (or any Redis hosting)

---

## 2. Environment Variables

Create your production environment file by copying the template:

```bash
cp .env.production.example .env
```

Fill in all the required variables. For standard production, the key ones are:
- `DATABASE_URL` / `DIRECT_URL`: Your Supabase connection strings
- `JWT_SECRET`: Generate a secure random string (e.g., `openssl rand -base64 48`)
- `UPSTASH_REDIS_REST_URL` / `TOKEN`: For the OTP and cache
- `FRONTEND_URL` / `NEXT_PUBLIC_API_URL`: The domains where your apps will live

---

## 3. Deployment Options

### Option A: Docker Compose (Single VPS)
**Best for**: Cost-effective deployments on a single server (e.g., $10/mo DigitalOcean droplet).

1. Clone your repository onto the server.
2. Ensure Docker and Docker Compose are installed.
3. Configure your `.env` file at the root.
4. Run the production override stack (which spins up the API and Web containers but expects you to use external managed Postgres/Redis):
   ```bash
   npm run docker:prod
   ```
5. **Updates**: To pull new code and redeploy without downtime:
   ```bash
   git pull
   npm run docker:prod
   ```

*(Note: If you want to host Postgres and Redis yourself on the same server, just run `npm run docker:up` which uses the base `docker-compose.yml`.)*

### Option B: Platform-as-a-Service (Vercel + Railway/Render)
**Best for**: Zero-configuration scaling, global CDN for the frontend.

#### Frontend (Vercel)
1. Import the repository into Vercel.
2. Set the Framework Preset to **Next.js**.
3. Set the Root Directory to `apps/web`.
4. Add the Environment Variable: `NEXT_PUBLIC_API_URL` (pointing to your API domain).
5. Deploy.

#### Backend API (Railway / Render)
1. Import the repository.
2. Set the Root Directory to `apps/api`.
3. Build Command: `npm run build`
4. Start Command: `npm run start:prod` (This automatically runs `prisma migrate deploy` before starting).
5. Add all the backend environment variables from `.env.production.example`.
6. Deploy.

---

## 4. Database Migrations

In the Docker setup, migrations are run automatically when the API container starts.
In a PaaS setup, the `start:prod` script handles it.

If you ever need to run migrations manually against production:
```bash
npx prisma migrate deploy
```

---

## 5. Reverse Proxy & SSL (For Option A / VPS)

If you deployed via Docker on a VPS, you should put Nginx or Caddy in front of your containers to handle SSL (HTTPS) and route traffic.

**Example Nginx config snippet:**
```nginx
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Monitoring & Logging

- **Docker Logs**: View logs using `docker compose logs -f api` or `docker compose logs -f web`.
- **Log Files**: In production, the API writes logs to `apps/api/logs/combined.log` and `error.log`.
- **Health Checks**: 
  - API Liveness: `GET /health`
  - API Readiness (DB check): `GET /ready`

---

## 7. Rollbacks

If a bad deployment goes out:
1. Revert the commit in Git: `git revert <commit-hash>`
2. Push to your main branch.
3. If using Vercel/Railway, they will auto-deploy the revert.
4. If using Docker, pull the changes and run `npm run docker:prod`. 

*Note: Database migrations (`prisma migrate deploy`) only move forward. If a migration broke the app, you may need to write a down-migration or manually alter the schema, then deploy the fix.*
