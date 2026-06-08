# Production System Architecture & Deployment Guide

This document provides a comprehensive overview of the CutBook Lite (Salon Management SaaS) system architecture, connection flows, and instructions on how to securely deploy and manage the project in a **production environment**.

---

## 1. System Overview & Architecture

CutBook Lite is a multi-tenant SaaS application built for salon owners to manage their barbers, services, expenses, and earnings. To maximize simplicity and reduce operational overhead, it uses a **Backend-as-a-Service (BaaS)** architecture.

### Core Architecture Components

*   **Frontend (Web Client):** Single Page Application (SPA) built with React, TypeScript, Vite, Tailwind CSS, and Zustand. Located in `apps/web`.
*   **Backend & Database:** **Supabase** handles all database interactions (PostgreSQL), authentication, and Row Level Security (RLS). There is no custom backend server.
*   **Hosting:** **Cloudflare Pages** hosts the React frontend.

### Connection Flow

1.  **Client Request:** A user interacts with the React frontend hosted on Cloudflare Pages.
2.  **Authentication:** The app uses `@supabase/supabase-js` to authenticate users directly against Supabase.
3.  **Database Query:** The frontend queries the Supabase PostgreSQL database directly using the Supabase client.
4.  **Security:** Supabase Row Level Security (RLS) ensures that tenants (owners and barbers) can only access data belonging to their own salon.

---

## 2. Directory Structure

```text
/
├── apps/
│   └── web/            # Frontend (React, Vite, Tailwind, Zustand, Supabase Client)
│       ├── src/        # Components, Pages, Hooks
│       ├── wrangler.toml # Cloudflare Pages configuration
│       └── .env        # Vite Environment Variables (VITE_SUPABASE_URL, etc.)
├── packages/
│   └── shared-types/   # Shared TypeScript definitions
├── package.json        # Root package.json (Turborepo scripts)
└── turbo.json          # Turborepo configuration
```

---

## 3. Environment Variables

Create a `.env` file in the `apps/web` directory with your Supabase credentials:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

> **Security Note:** The Anon Key is safe to expose in the frontend. Security is enforced via Supabase Row Level Security (RLS) policies.

---

## 4. Production Deployment Setup

### 4.1. Set up Supabase (Database & Auth)
1. Navigate to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Under **Project Settings > API**, copy the **URL** and **anon public** key.
3. Add these to your `.env` or Cloudflare Pages environment variables as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. In the Supabase SQL Editor, run your schema migrations to create the required tables (`owners`, `salons`, `barbers`, `services`, `expenses`, `subscriptions`). Be sure to enable Row Level Security (RLS) and configure policies.
5. In Supabase **Authentication > Providers**, ensure Email/Password is enabled.

### 4.2. Deploy the Frontend (Cloudflare Pages)
1. Push your code to GitHub.
2. Navigate to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Pages > Create a project > Connect to Git**.
3. Select your repository.
4. Build command: `npm run build`
5. Build output directory: `apps/web/dist`
6. Add Environment Variables:
   * `NODE_VERSION`: `18` (or your preferred version)
   * `VITE_SUPABASE_URL`: `<your-url>`
   * `VITE_SUPABASE_ANON_KEY`: `<your-key>`
7. Click **Save and Deploy**. Cloudflare Pages will build and deploy your application globally.

Alternatively, you can deploy using the Wrangler CLI directly from your machine:
```bash
cd apps/web
npx wrangler pages deploy dist --project-name cutbooklite
```

---

## 5. Local Development

To run the application locally:

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. The app will be available at `http://localhost:5173`.
