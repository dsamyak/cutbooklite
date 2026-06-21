# Technical Requirements Document (TRD)
## Salon SaaS Management Platform

**Version:** 1.0
**Date:** June 2026
**Companion to:** 01-PRD.md, 03-database-schema.md, 04-architecture.md

---

## 1. Overview

This document defines how the platform described in the PRD will be built: stack, API conventions, multi-tenancy approach, security model, and operational requirements. It is the implementation contract between product and engineering.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (App Router) | SSR for dashboard, fast TTFB on mobile networks |
| Language | TypeScript | end-to-end, frontend + backend |
| Styling | Tailwind CSS + ShadCN UI | consistent design system, fast iteration |
| Client data layer | TanStack Query | caching, optimistic updates for billing flows |
| Backend framework | Node.js + Express.js | TypeScript throughout |
| Database | PostgreSQL | strong relational integrity for financial data |
| ORM | Prisma | type-safe queries, migrations |
| Auth | JWT (access) + refresh tokens | RBAC middleware per route |
| File storage | Cloudinary or AWS S3 | logos, profile photos, exported reports |
| Payments | Razorpay | UPI, card, wallet; webhook-driven reconciliation |
| Notifications | FCM (push), SMS gateway, WhatsApp Business API, SMTP/email provider | pluggable provider interface |
| Cache/Queue | Redis (cache) + a job queue (e.g., BullMQ on Redis) | daily summaries, reminders, report generation |
| Frontend hosting | Vercel | |
| Backend hosting | Railway or Render | containerized Node service |
| Database hosting | Managed PostgreSQL (e.g., Railway/Render/Neon) | automated backups |

---

## 3. System Architecture Overview

The platform is built as a **modular monolith**: a single deployable Express/TypeScript service organized into clearly bounded modules (auth, salons, staff, services, customers, appointments, billing, inventory, reports, notifications, subscriptions). This is intentional for an MVP/early-growth SaaS — it minimizes operational overhead while preserving clean module boundaries that can be extracted into microservices later (see 04-architecture.md, Section 11) if/when specific modules (e.g., notifications, reporting) need independent scaling.

---

## 4. Multi-Tenancy Strategy

**Approach: Shared database, shared schema, row-level isolation via `tenant_id` (salon_id).**

Rationale:
- Salons are numerous (target: thousands) but individually small in data volume — schema-per-tenant would multiply migration and connection-pool overhead unnecessarily.
- A single schema with a mandatory `salon_id` foreign key on every tenant-scoped table keeps cross-tenant analytics (for Super Admin) and migrations simple.
- PostgreSQL **Row-Level Security (RLS)** policies are enabled on every tenant-scoped table as a defense-in-depth backstop against application-layer bugs that might omit a tenant filter.

Tenant resolution:
- On login, the JWT access token embeds `salon_id` (or `null`/platform scope for Super Admin) and `role`.
- Every backend request resolves the active tenant from the JWT — never from client-supplied request parameters — to prevent tenant-spoofing.
- Multi-branch accounts additionally carry a `branch_id` claim/selector; Super Admin tokens carry neither and operate platform-wide.

Enterprise customers requiring physical data isolation can be migrated to a dedicated schema or database later; the data model is designed so that migration path doesn't require an application rewrite.

---

## 5. Authentication & Authorization

- **Login methods:** email + password, phone + OTP (delivered via SMS gateway).
- **Tokens:** short-lived access token (15 min) + rotating refresh token (30 days), refresh tokens stored hashed and revocable per device for multi-device support and "log out everywhere."
- **Password reset:** time-limited signed token via email link, or OTP via SMS.
- **RBAC:** role (`super_admin`, `owner`, `staff`) plus tenant/branch scope checked in middleware before every route handler executes. Authorization is enforced server-side; the frontend hiding a button is a UX convenience only, never the security boundary.
- **Session management:** device list visible to the user; ability to revoke individual sessions.

---

## 6. API Design Principles

- REST over HTTPS, versioned under `/api/v1/...`.
- Standard JSON response envelope:
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "pageSize": 20, "total": 134 },
  "error": null
}
```
- Errors follow a consistent shape with a machine-readable `code` and human-readable `message`, e.g. `{"success": false, "data": null, "error": {"code": "APPOINTMENT_CONFLICT", "message": "Barber already booked for this slot"}}`.
- Pagination: `?page=&pageSize=` with sane defaults and a hard max page size.
- Filtering/sorting: `?filter[status]=completed&sort=-createdAt` convention.
- Idempotency: billing-related POST endpoints (invoice creation, payment capture) accept an `Idempotency-Key` header to prevent duplicate charges on retry.

---

## 7. Core API Surface (representative, not exhaustive)

| Module | Example Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout` |
| Salons (Super Admin) | `GET/POST /admin/salons`, `PATCH /admin/salons/:id/status` |
| Onboarding | `POST /salons`, `PATCH /salons/:id`, `POST /salons/:id/branches` |
| Staff | `GET/POST /staff`, `PATCH /staff/:id`, `DELETE /staff/:id`, `POST /staff/:id/services` |
| Services | `GET/POST /services`, `PATCH /services/:id` |
| Customers | `GET/POST /customers`, `GET /customers/:id/history` |
| Appointments | `GET/POST /appointments`, `PATCH /appointments/:id/status` |
| Walk-ins | `POST /walk-ins` |
| Billing | `POST /invoices`, `GET /invoices/:id`, `POST /payments/capture`, `POST /webhooks/razorpay` |
| Earnings | `GET /dashboard/earnings?range=` |
| Expenses | `GET/POST /expenses` |
| Inventory | `GET/POST /inventory/items`, `POST /inventory/stock-movements` |
| Attendance | `POST /attendance/clock-in`, `POST /attendance/clock-out`, `GET /attendance` |
| Commission | `GET /commission/report?period=` |
| Loyalty | `GET /customers/:id/loyalty`, `POST /loyalty/redeem` |
| Reports | `GET /reports/revenue`, `GET /reports/staff`, `GET /reports/customers`, `GET /reports/:id/export?format=pdf` |
| Notifications | `GET/PATCH /notifications/preferences` |
| Subscriptions | `GET /subscriptions/plans`, `POST /subscriptions/upgrade` |
| Analytics | `GET /analytics/overview`, `GET /analytics/peak-hours` |

A full OpenAPI/Swagger specification should be generated from the implementation in the coding phase rather than hand-maintained here, to avoid drift.

---

## 8. Data Validation & Business Rules

- All input validated at the API boundary (e.g., Zod schemas) before reaching business logic — never trust client-side validation alone.
- Server-side enforcement of: no overlapping barber bookings, no negative inventory without override flag, one invoice per completed appointment/walk-in, commission % within configured bounds, customer mobile-number uniqueness per salon.

---

## 9. File Storage

- Salon logos, staff/customer photos, and generated report exports stored in Cloudinary or S3, never on the application server's local disk (stateless app servers for horizontal scaling).
- Signed, time-limited URLs for any private exports (e.g., a financial report PDF).

---

## 10. Payments Integration (Razorpay)

- Order creation server-side → client completes payment via Razorpay Checkout (UPI/card/wallet) → Razorpay webhook confirms payment → invoice marked paid.
- Webhook signature verified on every callback; webhook handler is idempotent (keyed on Razorpay payment ID).
- Cash payments recorded directly without a Razorpay order, but follow the same `payments` table shape for unified reporting.

---

## 11. Notifications Infrastructure

- Provider-agnostic notification service with adapters for Push (FCM), SMS, WhatsApp Business API, and Email (SMTP/provider API).
- Notification triggers are queued jobs (not synchronous in the request path) so a slow SMS provider never blocks a billing or appointment API call.
- Per-salon notification preferences gate which channels are active, respecting subscription-plan limits.

---

## 12. Background Jobs & Scheduling

| Job | Schedule | Purpose |
|---|---|---|
| Daily revenue summary | Nightly per salon | Owner notification |
| Low stock check | Hourly | Inventory alerts |
| Appointment reminders | Rolling, N hours before slot | Customer notification |
| Birthday/anniversary wishes | Daily | Customer notification |
| Attendance absence check | Daily, post cutoff time | Owner alert |
| Subscription renewal/expiry check | Daily | Billing/dunning |
| Report export generation | On-demand, async | Large export jobs (PDF/Excel) off the request thread |

---

## 13. Caching Strategy

- Redis cache for read-heavy, slow-changing data: service lists, subscription plan definitions, dashboard aggregates with short TTL (e.g., 60s) to keep "real-time" dashboards responsive under load without hammering Postgres on every refresh.
- Cache keys are always tenant-scoped (`salon:{id}:...`) to prevent cross-tenant leakage.

---

## 14. Security Requirements

- TLS everywhere; HSTS enabled.
- Tenant isolation enforced at both application layer (mandatory `salon_id` filter) and database layer (Postgres RLS) as defense in depth.
- Rate limiting on auth endpoints (login, OTP request) to prevent brute force/OTP abuse.
- Input sanitization against injection (Prisma parameterizes queries by default; raw queries are disallowed by lint rule).
- Secrets (API keys, DB credentials) managed via environment variables/secret manager, never committed to source.
- Audit log table for sensitive actions: staff deletion, role changes, subscription changes, salon suspension.
- Payment card data never touches platform servers — handled entirely within Razorpay's hosted checkout.

---

## 15. Scalability & Performance

- Stateless application servers behind a load balancer; horizontal scaling by adding instances.
- Database connection pooling (e.g., PgBouncer) to handle many short-lived tenant requests efficiently.
- Heavy/report-generation work offloaded to background workers, not the request/response cycle.
- Database indexes on all `salon_id` foreign keys and common query patterns (see 03-database-schema.md, Section 6).

---

## 16. DevOps & Deployment

- **Environments:** local → staging → production, each with isolated database and credentials.
- **CI/CD:** on every PR — lint, type-check, unit tests, Prisma migration dry-run; on merge to main — deploy to staging automatically, production deploy gated by manual approval.
- **Infrastructure:**
  - Frontend (Next.js) → Vercel
  - Backend (Express API) → Railway or Render, containerized
  - PostgreSQL → managed cloud Postgres with automated daily backups and point-in-time recovery
  - Redis → managed instance colocated with backend region
- **Migrations:** Prisma Migrate, applied as a release-pipeline step before traffic is shifted to new app version.

---

## 17. Monitoring & Logging

- Structured JSON logging (request ID, salon ID, route, latency, status) shipped to a log aggregator.
- Application performance monitoring (error tracking + latency tracing) on the API layer.
- Alerting on: elevated 5xx rate, payment webhook failures, queue backlog growth, database connection saturation.
- Per-tenant usage metrics feed the Super Admin platform-analytics view.

---

## 18. Testing Strategy

- Unit tests for business logic (commission calculation, loyalty point accrual, inventory deduction).
- Integration tests for API routes against a test database (transactional rollback per test).
- Contract tests for the Razorpay webhook handler using recorded payloads.
- A seed script producing a realistic demo salon (staff, services, customers, appointments) for manual QA and demos.

---

*See 03-database-schema.md for the full data model and 04-architecture.md for system/deployment diagrams.*
