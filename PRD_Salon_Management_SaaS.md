# Product Requirements Document (PRD)
## Salon Management SaaS — MVP

| Field | Detail |
|---|---|
| **Product** | Salon Management SaaS |
| **Version** | MVP 1.0 |
| **Status** | Draft |
| **Last Updated** | June 2026 |

---

## 1. Overview

### 1.1 Product Vision
A lightweight, multi-tenant SaaS platform that enables salon owners to track earnings, manage expenses, and give barbers structured access to service logging — all without the overhead of a full-featured salon suite.

### 1.2 Problem Statement
Salon owners operating one or more locations lack a simple, affordable tool to:
- Monitor daily/weekly/monthly earnings broken down by payment type
- Track expenses and calculate true net profit
- Give barbers a controlled view of their own and peer earnings without exposing sensitive financial data

### 1.3 Goals (MVP)
- Launch a working multi-tenant platform with strict data isolation
- Support two roles: Owner and Barber
- Deliver an earnings dashboard with expense-aware net profit reporting
- Enable per-owner subscription billing via Razorpay or Stripe
- Lay an architecture foundation that supports future feature expansion

### 1.4 Non-Goals (MVP)
The following are explicitly out of scope for MVP:
- Appointment scheduling
- Inventory management
- Payroll processing
- Customer profiles / CRM
- Native mobile apps (iOS / Android)

---

## 2. User Roles & Personas

### 2.1 Owner
**Who:** Salon proprietor managing one or more locations.

**Needs:**
- See earnings and expenses across all salons or per location
- Understand net profit at a glance (daily, weekly, monthly, custom)
- Add and categorize expenses
- Manage barber accounts under their salons

**Access:** Full access to all features within their own tenancy.

---

### 2.2 Barber
**Who:** Staff member working at one or more salons owned by the same owner.

**Needs:**
- Quickly log a service after completion
- View their own earnings history
- Optionally view other barbers' earnings (encourages transparency and healthy competition)

**Access:** Service logging + earnings view only. No access to expenses, net profit, or subscription settings.

---

## 3. Feature Requirements

### 3.1 Authentication & Onboarding

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Email + password sign-up and login | P0 |
| AUTH-02 | Secure session management with token expiry | P0 |
| AUTH-03 | Owner selects role during registration | P0 |
| AUTH-04 | Barbers are invited by Owner (no self-registration) | P0 |
| AUTH-05 | Password reset via email | P1 |

---

### 3.2 Multi-Tenant Architecture

| ID | Requirement | Priority |
|---|---|---|
| MT-01 | Each Owner account is an isolated tenant | P0 |
| MT-02 | No data bleed between tenants at any layer (API, DB, storage) | P0 |
| MT-03 | All data access enforced via tenant-scoped RBAC | P0 |
| MT-04 | Subscription lapse restricts access to all tenant data/features | P0 |

---

### 3.3 Multi-Salon Management (Owner)

| ID | Requirement | Priority |
|---|---|---|
| SAL-01 | Owner can create and name multiple salons under their account | P0 |
| SAL-02 | Owner can switch between salons via a salon selector | P0 |
| SAL-03 | Owner can view a consolidated report across all salons | P1 |
| SAL-04 | Each salon has its own barber roster | P0 |

---

### 3.4 Earnings Dashboard (Owner)

| ID | Requirement | Priority |
|---|---|---|
| EARN-01 | Dashboard shows earnings for: Today, This Week, This Month | P0 |
| EARN-02 | Custom date range via calendar picker | P0 |
| EARN-03 | Earnings broken down by: Cash, UPI, Product Sales, Total | P0 |
| EARN-04 | Expenses are auto-deducted to show Net Earning | P0 |
| EARN-05 | Per-salon and all-salons consolidated view | P1 |
| EARN-06 | Breakdown visible per barber within the selected period | P1 |

**Dashboard Layout (Wireframe Intent):**
```
[ Salon Selector ]           [ Date: Today | Week | Month | Custom ]

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Cash    │ │   UPI    │ │ Product  │ │  Total   │
│  ₹X,XXX  │ │  ₹X,XXX  │ │  ₹X,XXX  │ │  ₹X,XXX  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

  Total Expenses: ₹X,XXX
  ──────────────────────
  Net Earning:    ₹X,XXX  ✅
```

---

### 3.5 Expense Management (Owner)

| ID | Requirement | Priority |
|---|---|---|
| EXP-01 | Owner can add an expense with: amount, category, date, note | P0 |
| EXP-02 | Predefined categories (Rent, Supplies, Utilities, Salary, Other) | P0 |
| EXP-03 | Custom category support | P1 |
| EXP-04 | Expenses are reflected in all earnings period breakdowns | P0 |
| EXP-05 | Owner can view, edit, and delete past expenses | P1 |

---

### 3.6 Service Logging (Barber)

| ID | Requirement | Priority |
|---|---|---|
| SVC-01 | Barber can log a service: name, price, payment type (Cash/UPI), date | P0 |
| SVC-02 | Default date is today; barber can edit to past dates | P1 |
| SVC-03 | Barber can view their own service history | P0 |
| SVC-04 | Barber can view other barbers' earnings (not itemized services) | P0 |
| SVC-05 | Barber cannot view expenses or net profit | P0 |
| SVC-06 | Barber can edit or delete their own logged services | P1 |

---

### 3.7 Subscription & Billing

| ID | Requirement | Priority |
|---|---|---|
| SUB-01 | Per-owner subscription billing (not per barber) | P0 |
| SUB-02 | Integration with Razorpay (primary) or Stripe | P0 |
| SUB-03 | Access is gated — lapses restrict all features | P0 |
| SUB-04 | Owner can view subscription status and renewal date | P0 |
| SUB-05 | Grace period (e.g. 3–7 days) before hard lock | P1 |
| SUB-06 | Email notification on upcoming expiry | P1 |

---

## 4. User Stories

### Owner
- As an Owner, I want to see today's earnings split by Cash, UPI, and Product so I know how my salon performed.
- As an Owner, I want net earnings to automatically reflect my expenses so I don't need to calculate manually.
- As an Owner managing two salons, I want to switch between them quickly and also see a combined report.
- As an Owner, I want to add a monthly rent expense so it reduces my net profit view for that period.
- As an Owner, I want to invite barbers to my salon and revoke access when they leave.

### Barber
- As a Barber, I want to log a haircut I just completed so the owner has an accurate record.
- As a Barber, I want to see how much I've earned this week compared to my colleagues.
- As a Barber, I don't want to see expenses or net profit — that's not my concern.

---

## 5. UX & Design Principles

- **Mobile-first** — barbers primarily log services on phone
- **Fast logging** — service logging must be completable in under 30 seconds
- **Clear data hierarchy** — owner dashboard shows summary first, drill-down on demand
- **Role-appropriate UI** — barber interface hides all expense/profit data, not just restricts it

---

## 6. Success Metrics (MVP)

| Metric | Target |
|---|---|
| Owner onboarding time | < 5 minutes from sign-up to first salon |
| Service log time (Barber) | < 30 seconds per entry |
| Dashboard load time | < 2 seconds |
| Data isolation audit | Zero cross-tenant data leaks in testing |
| Subscription conversion | > 60% trial-to-paid within 14 days |

---

## 7. Assumptions & Constraints

- INR (₹) is the primary currency for MVP; multi-currency is post-MVP
- Razorpay is available and used as primary payment gateway (Indian market focus)
- No offline mode in MVP — internet connectivity required
- MVP targets web browsers; native app is post-MVP

---

## 8. Open Questions

1. Should barbers see the earnings of **all** other barbers, or only those in the same salon?
2. What is the MVP subscription price point and trial period length?
3. Are product sales logged separately from services, or as a service type?
4. Should the Owner be able to restrict barber access to peer earnings?
