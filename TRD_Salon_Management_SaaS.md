# Technical Requirements Document (TRD)
## Salon Management SaaS — MVP

| Field | Detail |
|---|---|
| **Product** | Salon Management SaaS |
| **Version** | MVP 1.0 |
| **Status** | Draft |
| **Last Updated** | June 2026 |

---

## 1. System Overview

### 1.1 Architecture Style
- **Backend:** RESTful API (with WebSocket support deferred to post-MVP)
- **Frontend:** Single Page Application (SPA)
- **Deployment Model:** Cloud-hosted, multi-tenant SaaS
- **Tenancy Model:** Shared database with row-level tenant isolation (via `tenant_id` / `owner_id` scoping on all queries)

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│               React SPA  ←→  REST API calls                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                      API Gateway / Load Balancer            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Application Server                       │
│             Node.js (Express) / Python (FastAPI)            │
│                                                             │
│   Auth Middleware → RBAC Middleware → Route Handlers        │
│                                                             │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Auth Svc   │  │  Salon Svc   │  │  Billing Svc     │  │
│   │  Users Svc  │  │  Earning Svc │  │  (Razorpay)      │  │
│   │             │  │  Expense Svc │  │                  │  │
│   └─────────────┘  └──────────────┘  └──────────────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│         PostgreSQL Database         │
│   (Row-level isolation by owner_id) │
└─────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React + TypeScript | Component reusability, strong typing, ecosystem |
| **Styling** | Tailwind CSS | Rapid UI development, mobile-first |
| **Backend** | Node.js + Express **or** Python + FastAPI | Lightweight, fast iteration for MVP |
| **Database** | PostgreSQL | ACID compliance, row-level security, mature |
| **ORM** | Prisma (Node) / SQLAlchemy (Python) | Type-safe queries, migration management |
| **Auth** | JWT (access token) + Refresh Token | Stateless, scalable |
| **Payment** | Razorpay (primary) | INR support, Indian market standard |
| **Hosting** | AWS / GCP / Railway / Render | Managed infra, scalable |
| **File/Media** | Not required for MVP | — |
| **Email** | Resend / SendGrid | Transactional emails (invites, billing) |
| **Monitoring** | Sentry + basic logging | Error tracking from day one |

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
owners
  └── salons (one owner → many salons)
        └── barbers (one salon → many barbers, via salon_barbers join table)
        └── services (logged by barbers, per salon)
        └── expenses (added by owner, per salon)

subscriptions
  └── linked to owners (one active subscription per owner)
```

---

### 3.2 Table Definitions

#### `owners`
```sql
CREATE TABLE owners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `salons`
```sql
CREATE TABLE salons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_salons_owner_id ON salons(owner_id);
```

#### `barbers`
```sql
CREATE TABLE barbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `salon_barbers` *(join table — barber may work at multiple salons under same owner)*
```sql
CREATE TABLE salon_barbers (
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  barber_id  UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (salon_id, barber_id)
);
```

#### `services`
```sql
CREATE TABLE services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  barber_id    UUID NOT NULL REFERENCES barbers(id),
  name         TEXT NOT NULL,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('CASH', 'UPI')),
  service_date DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_salon_id ON services(salon_id);
CREATE INDEX idx_services_barber_id ON services(barber_id);
CREATE INDEX idx_services_service_date ON services(service_date);
```

#### `expenses`
```sql
CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  owner_id     UUID NOT NULL REFERENCES owners(id),
  amount       NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category     TEXT NOT NULL,
  expense_date DATE NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_salon_id ON expenses(salon_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
```

#### `subscriptions`
```sql
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'GRACE', 'LAPSED', 'CANCELLED')),
  plan_name           TEXT NOT NULL,
  billing_provider    TEXT NOT NULL CHECK (billing_provider IN ('RAZORPAY', 'STRIPE')),
  provider_sub_id     TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (owner_id)
);
```

---

## 4. API Design

### 4.1 Base URL
```
https://api.yourdomain.com/v1
```

### 4.2 Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Owner self-registration | Public |
| POST | `/auth/login` | Login (Owner or Barber) | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/logout` | Invalidate refresh token | Bearer |
| POST | `/auth/invite-barber` | Owner invites a barber | Owner |
| POST | `/auth/accept-invite` | Barber sets password | Token (email link) |

---

### 4.3 Salon Management

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/salons` | List owner's salons | Owner |
| POST | `/salons` | Create a new salon | Owner |
| GET | `/salons/:id` | Get salon details | Owner |
| PATCH | `/salons/:id` | Update salon details | Owner |
| DELETE | `/salons/:id` | Delete salon | Owner |
| GET | `/salons/:id/barbers` | List barbers in salon | Owner |
| POST | `/salons/:id/barbers/:barber_id` | Add barber to salon | Owner |
| DELETE | `/salons/:id/barbers/:barber_id` | Remove barber from salon | Owner |

---

### 4.4 Earnings & Dashboard

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/salons/:id/earnings` | Earnings summary for date range | Owner |
| GET | `/salons/:id/earnings?consolidated=true` | All salons combined | Owner |
| GET | `/salons/:id/earnings/barbers` | Per-barber breakdown | Owner, Barber |

**Query Parameters for Earnings:**
```
?period=today|week|month|custom
&from=YYYY-MM-DD    (required if period=custom)
&to=YYYY-MM-DD      (required if period=custom)
```

**Earnings Response Shape:**
```json
{
  "period": { "from": "2026-06-01", "to": "2026-06-03" },
  "cash": 4200.00,
  "upi": 3100.00,
  "product": 800.00,
  "total_gross": 8100.00,
  "total_expenses": 1500.00,
  "net_earning": 6600.00
}
```

---

### 4.5 Services (Barber logging)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/salons/:id/services` | Log a service | Barber, Owner |
| GET | `/salons/:id/services` | List services (own only for Barber) | Barber, Owner |
| PATCH | `/salons/:id/services/:svc_id` | Edit own service | Barber (own), Owner |
| DELETE | `/salons/:id/services/:svc_id` | Delete service | Barber (own), Owner |

---

### 4.6 Expenses

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/salons/:id/expenses` | Add an expense | Owner |
| GET | `/salons/:id/expenses` | List expenses | Owner |
| PATCH | `/salons/:id/expenses/:exp_id` | Edit expense | Owner |
| DELETE | `/salons/:id/expenses/:exp_id` | Delete expense | Owner |

---

### 4.7 Subscriptions

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/subscription` | Get current subscription status | Owner |
| POST | `/subscription/checkout` | Create payment/checkout session | Owner |
| POST | `/subscription/webhook` | Payment provider webhook | Provider (HMAC) |

---

## 5. Authentication & Security

### 5.1 JWT Strategy
- **Access Token:** Short-lived (15 minutes), signed with RS256 or HS256
- **Refresh Token:** Long-lived (30 days), stored in HttpOnly cookie
- Token payload includes: `user_id`, `role` (`OWNER` | `BARBER`), `owner_id` (for barbers, references their owning tenant)

### 5.2 RBAC Middleware

Every request passes through two middleware layers:

1. **Auth middleware** — verifies JWT, extracts user context
2. **Tenant middleware** — resolves `owner_id` from token; all DB queries are scoped to this `owner_id`

```
Request → AuthMiddleware → TenantMiddleware → RBACMiddleware → RouteHandler
```

**Role permission matrix:**

| Resource | Owner | Barber |
|---|---|---|
| Salons (CRUD) | ✅ | ❌ |
| Earnings dashboard | ✅ | ❌ |
| Expenses (CRUD) | ✅ | ❌ |
| Net earning view | ✅ | ❌ |
| Services — log own | ✅ | ✅ |
| Services — edit own | ✅ | ✅ |
| Services — view all | ✅ | ✅ |
| Barber earnings view | ✅ | ✅ (gross only) |
| Subscription settings | ✅ | ❌ |

### 5.3 Data Isolation Rules
- All queries must include `WHERE owner_id = :current_owner_id`
- No endpoint exposes a resource without validating it belongs to the requesting tenant
- Barbers can only exist within one owner's tenant
- Database-level: consider PostgreSQL Row Level Security (RLS) as an additional safety net

### 5.4 Data Encryption
- Passwords hashed with **bcrypt** (cost factor ≥ 12)
- Database at rest: encrypted storage volumes (cloud provider managed)
- All traffic over **TLS 1.2+** (HTTPS enforced, HSTS enabled)
- Secrets (JWT secret, DB credentials, Razorpay keys) stored in environment variables / secrets manager

---

## 6. Subscription & Billing Integration

### 6.1 Razorpay Integration Flow

```
Owner clicks Subscribe
       ↓
POST /subscription/checkout  →  Create Razorpay Subscription / Order
       ↓
Client receives order_id / subscription_id
       ↓
Razorpay Checkout opens in browser
       ↓
Payment success / failure in frontend
       ↓
Razorpay sends webhook to POST /subscription/webhook
       ↓
Backend verifies HMAC signature
       ↓
Update subscriptions table: status = ACTIVE, period dates
```

### 6.2 Subscription States

```
TRIAL → ACTIVE → GRACE (payment failed, 3–7 days) → LAPSED
                                                         ↑
                                              ACTIVE ← Re-subscribe
```

Access gating logic:
- `TRIAL` or `ACTIVE` → full access
- `GRACE` → read-only access with renewal banner
- `LAPSED` or `CANCELLED` → login allowed, all features locked, upgrade prompt shown

---

## 7. Non-Functional Requirements

### 7.1 Performance
| Metric | Target |
|---|---|
| API response time (p95) | < 300ms |
| Dashboard data load | < 2 seconds end-to-end |
| Concurrent users (MVP launch) | 500 simultaneous |
| Database query timeout | 5 seconds max |

### 7.2 Availability
- Target uptime: **99.5%** (MVP acceptable; 99.9% post-MVP)
- Graceful error messages on service unavailability

### 7.3 Scalability Considerations (Architecture for Future)
- All business logic encapsulated in service layer (not route handlers) for easy extraction to microservices
- Stateless API — horizontal scaling ready
- Database: single PostgreSQL instance for MVP; read replicas and connection pooling (PgBouncer) when needed
- Queue-based processing (e.g. BullMQ / SQS) added post-MVP for notifications and reports

### 7.4 Security Hardening
- Rate limiting on all auth endpoints (e.g. 10 req/min per IP)
- CORS configured to allowed origins only
- Helmet.js (Node) or equivalent headers set
- Input validation on all endpoints (Zod / Joi / Pydantic)
- SQL injection prevention via ORM parameterized queries only

---

## 8. Project Structure (Recommended)

```
/
├── apps/
│   ├── api/                    # Backend application
│   │   ├── src/
│   │   │   ├── auth/           # Auth routes, middleware, JWT utils
│   │   │   ├── salons/         # Salon CRUD
│   │   │   ├── services/       # Service logging
│   │   │   ├── expenses/       # Expense management
│   │   │   ├── earnings/       # Earnings aggregation logic
│   │   │   ├── subscriptions/  # Billing integration
│   │   │   ├── middleware/     # Auth, tenant, RBAC, error handler
│   │   │   └── db/             # Prisma client, migrations, schema
│   │   └── tests/
│   │
│   └── web/                    # Frontend SPA (React)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── owner/      # Dashboard, Expenses, Salons
│       │   │   └── barber/     # Service log, Earnings view
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── api/            # API client (axios/fetch wrappers)
│       │   └── store/          # Auth state, salon context
│       └── tests/
│
├── packages/
│   └── shared-types/           # Shared TypeScript types/interfaces
│
└── infra/                      # Docker, CI/CD, env configs
```

---

## 9. Testing Strategy

| Type | Scope | Tool |
|---|---|---|
| Unit tests | Service logic, utility functions | Jest / Pytest |
| Integration tests | API endpoints with test DB | Supertest / HTTPX |
| Auth/RBAC tests | Role boundary enforcement | Automated test suite |
| Tenant isolation tests | Cross-tenant data access attempts | Automated (critical) |
| E2E tests | Core user flows (Owner + Barber) | Playwright (post-MVP) |

**Critical test cases (MVP must-pass):**
- Barber cannot access any expense data
- Owner A cannot access Owner B's salons/data
- Lapsed subscription blocks all feature routes
- Earnings calculation matches sum of services minus expenses for date range

---

## 10. Deployment & Infrastructure

### 10.1 Environments
| Environment | Purpose |
|---|---|
| `development` | Local development |
| `staging` | QA and pre-release testing |
| `production` | Live system |

### 10.2 CI/CD Pipeline
```
Push to branch
    ↓
Lint + Type Check
    ↓
Unit + Integration Tests
    ↓
Build Docker image
    ↓
Deploy to Staging (on merge to main)
    ↓
Manual approval
    ↓
Deploy to Production
```

### 10.3 Secrets Management
- Never commit secrets to source control
- Use `.env` locally; cloud provider secrets manager (AWS Secrets Manager / GCP Secret Manager) in staging/prod

---

## 11. Future Architecture Hooks
*(Not implemented in MVP, but design must not block these)*

| Future Feature | Design Consideration Now |
|---|---|
| Appointments | `services` table supports `appointment_id` nullable FK |
| Inventory | Separate `products` table; `product_sale_id` nullable on services |
| Payroll | `barbers` table includes `rate_type` field placeholder |
| Customer profiles | `customer_id` nullable FK on services |
| Native apps | API is REST — mobile clients connect identically to web |
| Multi-currency | All money stored as `NUMERIC` with currency column; display layer converts |
| Analytics / Reports | Aggregation queries isolated in `earnings` service for easy caching layer addition |
