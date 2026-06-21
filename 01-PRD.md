# Product Requirements Document (PRD)
## Salon SaaS Management Platform

**Version:** 1.0
**Date:** June 2026
**Status:** Draft for review

---

## 1. Executive Summary

This document defines the product requirements for a multi-tenant, cloud-based SaaS platform that allows salon and barbershop businesses to manage staff, services, customers, appointments, payments, inventory, and business analytics from a single web and mobile-friendly application. One deployment of the platform serves many independent salons ("tenants"), each with isolated data, its own staff, customers, and billing.

The platform targets the Indian salon/barbershop market specifically (UPI payments, GST billing, WhatsApp/SMS notifications) but is architected to generalize to other markets.

---

## 2. Problem Statement

Most small and mid-sized salons currently run on a mix of paper registers, WhatsApp groups, and basic billing apps. This leads to:

- No reliable visibility into daily cash vs UPI vs card revenue
- No structured way to track barber performance or commission
- Missed appointment reminders and poor repeat-customer retention
- No inventory tracking, leading to stockouts or wastage
- No consolidated reporting across multiple branches

Salon owners need a single, affordable, mobile-friendly system that replaces these manual processes without requiring technical expertise to operate.

---

## 3. Goals & Objectives

### 3.1 Business Goals
- Acquire and retain thousands of independent salons on a subscription model
- Provide a low-friction onboarding experience (salon live within minutes)
- Create expansion revenue through tiered plans and premium AI features

### 3.2 Product Goals
- Give every salon owner a real-time view of revenue, staff performance, and inventory
- Reduce manual billing and appointment errors
- Improve customer retention through loyalty and reminders
- Support salons with a single chair up to multi-branch chains

### 3.3 Non-Goals (for this PRD)
- Point-of-sale hardware integration (card machines, receipt printers) — future consideration
- Franchise royalty/financial settlement between branches — future consideration
- Marketplace/booking discovery for end-customers (i.e., a public "find a salon" app) — future consideration

---

## 4. Target Users & Personas

### 4.1 Super Admin (Platform Admin)
The internal platform operations team. Manages the platform itself: onboarding salons, billing, support, and platform-wide health. Not involved in any single salon's day-to-day operations.

### 4.2 Salon Owner
Owns or manages one salon (or one branch in a multi-branch account). Cares about daily revenue, staff accountability, and growing repeat business. Often not highly technical — needs a dashboard that surfaces insights without configuration.

### 4.3 Barber / Staff
Works in the salon day to day. Needs a fast way to log completed services, clock in/out, and see their own earnings. Should never see salon-wide financials or be able to delete records.

---

## 5. User Roles & Permissions Matrix

| Capability | Super Admin | Salon Owner | Barber/Staff |
|---|:---:|:---:|:---:|
| Create/suspend salons | ✅ | ❌ | ❌ |
| Manage subscription plans | ✅ | View only | ❌ |
| Add/edit/remove staff | ❌ | ✅ | ❌ |
| Add/edit services | ❌ | ✅ | ❌ |
| Create appointments | ❌ | ✅ | ✅ (own queue) |
| Record walk-ins & billing | ❌ | ✅ | ✅ |
| View salon financial reports | View all (support) | ✅ | ❌ |
| View own earnings/performance | ❌ | ✅ | ✅ |
| Manage inventory | ❌ | ✅ | Stock-out entry only |
| Manage salon settings | ❌ | ✅ | ❌ |
| Mark attendance | ❌ | View | Self clock-in/out |
| Delete records | Platform-level only | ✅ | ❌ |

---

## 6. Functional Requirements by Module

Each module below lists representative user stories and acceptance criteria. Detailed field-level specs live in the Database Schema document; API contracts live in the TRD/API documentation.

### 6.1 Authentication
- As a user, I can log in with email/password or phone number + OTP.
- As a user, I can reset a forgotten password via email link or OTP.
- As a platform, sessions are managed via short-lived JWT access tokens + long-lived refresh tokens, revocable per device.
- Acceptance: a user can be logged in on a phone and a laptop simultaneously; logging out of one does not affect the other unless "log out all devices" is used.

### 6.2 Salon Onboarding
- As a Super Admin, I approve new salon registrations before they go live.
- As a Salon Owner, I complete a guided setup: salon details, logo, first branch, first services, first staff member.
- Acceptance: a salon cannot accept appointments or billing until onboarding is marked complete and approved.

### 6.3 Barber/Staff Management
- As an Owner, I can add a barber with name, mobile, joining date, salary type (fixed/commission/hybrid), and commission %.
- As an Owner, I can assign specific services to specific barbers (skill mapping).
- As an Owner, I can deactivate a barber without deleting their historical records.
- Acceptance: deactivated barbers disappear from "assign to appointment" pickers but remain in historical reports.

### 6.4 Service Management
- As an Owner, I can create services with category, duration, price, tax %, and active/inactive status.
- Acceptance: inactive services are hidden from booking flows but preserved on past invoices.

### 6.5 Customer Management
- As an Owner/Staff, I can search customers by name or mobile number in under 1 second for typical salon-size datasets.
- As an Owner, I can see a customer's full visit history, total spend, and loyalty points.
- Acceptance: duplicate customers (same mobile number) are prevented at creation time within a salon.

### 6.6 Appointment Management
- As an Owner/Staff, I can view appointments in day/week/month calendar views.
- As an Owner, I can assign a barber, service, and time slot to an appointment.
- Appointment status flows: Scheduled → Confirmed → In Progress → Completed, or → Cancelled at any point before Completed.
- Acceptance: the system prevents double-booking the same barber for overlapping time slots.

### 6.7 Walk-In Module
- As Staff, I can record a walk-in customer and bill them in under 30 seconds without creating a full customer profile (customer is optional).
- Flow: Walk-In → Select Service(s) → Select Barber → Payment → Complete.

### 6.8 Billing & Payments
- As Staff/Owner, I can generate an invoice with cash, UPI, card, or wallet as payment method (or split across methods).
- As an Owner, I can generate GST-compliant invoices when GST number is configured.
- Acceptance: every completed appointment or walk-in produces exactly one invoice record.

### 6.9 Earnings Dashboard
- As an Owner, I see today's total revenue broken down by payment method, customer count, and services completed, updating in near real time.
- As an Owner, I can filter revenue by Today/Yesterday/This Week/This Month/Custom Range.
- As an Owner, I see service-level and barber-level revenue breakdowns as sortable tables/charts.

### 6.10 Expense Management
- As an Owner, I can log expenses by category (rent, electricity, water, salary, inventory purchase, marketing, other).
- As an Owner, my dashboard shows Revenue − Expenses = Profit for any selected period.

### 6.11 Inventory Management
- As an Owner, I can track stock-in and stock-out of products, with automatic low-stock alerts at a configurable threshold.
- As Staff, I can log product usage/sale against a service or walk-in.
- Acceptance: stock levels never go negative without an explicit override flag (for reconciliation purposes).

### 6.12 Attendance
- As Staff, I can clock in/out from the mobile app; location/timestamp is recorded.
- As an Owner, I see daily and monthly attendance with computed working hours per staff member.

### 6.13 Commission Management
- As an Owner, I configure commission as a flat %, revenue-based tier, or per-service rate.
- As an Owner, I can generate weekly/monthly commission reports per barber.

### 6.14 Loyalty Program
- As a platform default, customers earn 1 point per ₹100 spent (configurable per salon).
- As a customer (via owner/staff), points can be redeemed against future invoices.
- As an Owner, I see a loyalty leaderboard/ranking of top customers.

### 6.15 Reports
- As an Owner, I can generate revenue, staff, and customer reports for daily/weekly/monthly/yearly periods.
- As an Owner, I can export any report as PDF, Excel, or CSV.

### 6.16 Notifications
- Owner-facing: daily revenue summary, low inventory alert, staff absence alert.
- Customer-facing: appointment reminders, birthday wishes, loyalty offers.
- Channels: push notification, SMS, WhatsApp, email — configurable per salon based on subscription plan and provider credentials.

### 6.17 Subscription Management (SaaS billing)
- As a Super Admin, I define plans (Basic, Professional, Enterprise) with feature gates and staff limits.
- As an Owner, I can view my current plan, usage against limits, and upgrade/downgrade.
- Acceptance: feature access is enforced server-side based on the salon's active plan, not just hidden in the UI.

### 6.18 Multi-Branch Support
- As an Owner of a multi-branch account, I can view per-branch revenue and a combined cross-branch analytics view.
- As an Owner, staff and inventory are scoped to a branch by default but reportable at the account level.

### 6.19 Analytics Dashboard
- As an Owner, I see revenue trend, customer growth, top services, best-performing barber, and peak business hours as interactive charts.

### 6.20 AI Features (Premium tier)
- AI-generated revenue forecasts based on historical trend.
- AI-generated staff performance insights (e.g., flagging a barber whose average ticket size is dropping).
- AI customer retention/churn risk flags.
- AI business health score (composite of revenue trend, expense ratio, attendance, inventory turnover).
- AI recommendations, e.g., "Facial services generate 30% higher profit on weekends — consider promoting them on Fridays."
- Acceptance: AI features are clearly labeled as AI-generated and degrade gracefully (hidden, not broken) for salons below the required plan tier or with insufficient historical data.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard initial load < 2s on 4G; API p95 latency < 300ms for read endpoints |
| Scalability | Support 10,000+ tenant salons and 100,000+ staff users without architectural change |
| Security | Strict tenant data isolation; encrypted data in transit (TLS) and at rest; RBAC enforced server-side |
| Availability | 99.5% uptime target for core billing/appointment flows |
| Mobile responsiveness | Fully usable on Android, iPhone, tablet, and desktop browsers |
| Compliance | GST-compliant invoicing (India); payment data handled via PCI-DSS-compliant processor (Razorpay), never stored directly |
| Localization | INR currency by default; multi-currency architecture for future expansion |
| Accessibility | WCAG 2.1 AA for core owner-dashboard flows |

---

## 8. Subscription Plans

| Plan | Staff Limit | Branches | Reports | Inventory | Analytics | AI Features | Support |
|---|---|---|---|---|---|---|---|
| Basic | Up to 5 | 1 | Basic | ❌ | ❌ | ❌ | Standard |
| Professional | Unlimited | 1 | Advanced | ✅ | ✅ | Limited | Standard |
| Enterprise | Unlimited | Multi-branch | Advanced + custom | ✅ | ✅ Combined cross-branch | ✅ Full | Priority |

---

## 9. Success Metrics / KPIs

- **Activation:** % of new salons that complete onboarding and log their first invoice within 48 hours
- **Engagement:** % of salons logging in daily; average invoices/day per active salon
- **Retention:** monthly churn rate by plan tier
- **Revenue:** MRR, expansion revenue from plan upgrades and AI add-ons
- **Reliability:** uptime, error rate on billing endpoints
- **Customer impact (downstream):** repeat-visit rate uplift for salons using loyalty + reminders vs those that don't

---

## 10. Assumptions & Constraints

- Most salons have intermittent, low-bandwidth mobile internet — UI must work acceptably on 3G/4G and tolerate brief offline gaps for walk-in billing.
- Salon owners are not technical; defaults must be sensible out of the box (e.g., default service categories, default commission templates).
- Payment processing (UPI/card) is delegated entirely to Razorpay; the platform never directly handles card numbers.
- WhatsApp Business API access requires separate approval/cost and is treated as a pluggable notification channel, not a hard dependency for MVP.

---

## 11. Out of Scope (current release)

- Public-facing customer booking website/app (salon discovery)
- POS hardware integrations
- Inter-branch financial settlement/franchise royalties
- Payroll/tax filing automation beyond commission reporting

---

## 12. Phased Release Plan

### Phase 1 — MVP (single branch)
Auth, onboarding, barber/service/customer management, appointments, walk-ins, billing, earnings dashboard, basic reports, attendance.

### Phase 2 — Growth
Inventory, expenses, commission management, loyalty program, notifications, subscription billing enforcement, full reports module (export).

### Phase 3 — Scale
Multi-branch support, advanced analytics dashboard, AI features, priority support tooling for Super Admin.

---

*Next documents: Technical Requirements Document (TRD), Database Schema & ER Diagram, SaaS Architecture.*
