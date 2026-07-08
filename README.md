# PayForme

Ghana's rental finance and property collaboration platform connecting **Tenants**, **Landlords**, **Agents**, **Lenders**, and **Administrators**.

## Tech Stack

- **Frontend:** Next.js 16 App Router, TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, React Hook Form, Zod, TanStack Query
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL, Redis
- **Auth:** Auth.js (NextAuth v5), JWT (API clients), OTP, 2FA (TOTP)
- **Infra:** Docker, Vercel-ready with scheduled cron jobs

## Core Modules

- Authentication & role-based dashboards (Tenant, Landlord, Agent, Lender, Admin)
- Profile, Ghana Card KYC, and bank account validation
- Property listings, tenant applications, and landlord/agent review
- Pay for Rent financing, mandate lifecycle, and lender decisioning
- Repayment schedules, deductions, settlements, and reconciliation
- Notifications, audit logs, and admin review queues
- Wallet deposits/withdrawals via saved MoMo and bank accounts (Hubtel)
- Subscriptions (Free, Premium) with listing limits

## Quick Start

### 1. Environment

```bash
cp .env.example .env
```

Update `DATABASE_URL`, `AUTH_SECRET`, `JWT_*`, `ENCRYPTION_KEY`, and `CRON_SECRET`.

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET, CRON_SECRET
openssl rand -hex 32     # ENCRYPTION_KEY
```

### 2. Database (Docker)

```bash
docker compose up -d postgres redis
```

### 3. Install & migrate

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role               | Email                    | Password        |
|--------------------|--------------------------|-----------------|
| Admin              | admin@payforme.com       | Password123!    |
| Buyer              | tenant@payforme.com      | Password123!    |
| Merchant           | landlord@payforme.com    | Password123!    |
| Marketer           | agent@payforme.com       | Password123!    |
| Lender             | lender@payforme.com      | Password123!    |
| Compliance Officer | compliance@payforme.com  | Password123!    |

## Project Structure

```
app/
  (marketing)/     # Landing, properties browse
  (auth)/          # Login, register
  dashboard/       # Buyer, merchant, marketer, lender dashboards
  admin/           # Administrator panel
  compliance/      # Compliance officer portal
  api/             # REST API routes
lib/
  auth/            # NextAuth, JWT, permissions
  db/              # Prisma client
  redis/           # Caching & rate limiting
  repositories/    # Data access layer
  services/        # Business logic
  validations/     # Zod schemas
prisma/
  schema.prisma    # Full database schema
```

## Features

- Multi-role auth (Buyer, Merchant, Marketer, Lender, Admin, Compliance Officer)
- Property applications before Pay for Rent financing
- Ghana Card KYC and bank account validation workflows
- Mandate management and admin review queues
- Settlement tracking and reconciliation exceptions
- Wallet system with commission/fees
- Subscription plans (Free, Premium)
- OTP, 2FA (Settings), audit logs, rate limiting
- Landlord agent assignment per listing
- Admin analytics dashboard
- Docker deployment
- Scheduled cron: repayments (daily 06:00 UTC), subscription expiry (daily 00:00 UTC)

## API Overview

See **[docs/API.md](docs/API.md)** for the full reference.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register user |
| `/api/auth/refresh` | POST | JWT access/refresh tokens |
| `/api/auth/2fa` | GET/POST | 2FA status, enable, verify, disable |
| `/api/properties` | GET/POST | Browse / create properties |
| `/api/financing` | GET/POST | Financing requests |
| `/api/payments/deposit` | POST | Wallet deposit via saved account |
| `/api/wallet` | GET | Balance & transaction history |
| `/api/withdrawals` | GET/POST | Withdrawal request + OTP + 2FA confirm |
| `/api/kyc` | GET/POST | Profile, identity, bank accounts |
| `/api/settings` | GET/PATCH | User settings |
| `/api/merchant/agents` | GET/PATCH | Assign agents to listings |
| `/api/analytics/ceo` | GET | Admin analytics data |

Authenticated browser requests use **session cookies**. API/mobile clients may send `Authorization: Bearer <access_token>` from `/api/auth/refresh`.

## Deployment

- **Frontend:** Vercel — connect repo, set env vars (including `CRON_SECRET` for cron routes)
- **Database:** Railway, Supabase, or AWS RDS (PostgreSQL)
- **Redis:** Upstash or Railway Redis
- **Full stack:** `docker compose up` for local/staging

## Integration notes (configure separately)

These require external credentials and are not fully live without them:

- **Hubtel payments** — `PAYMENT_PROVIDER=hubtel` + Hubtel keys + public webhook URL
- **Hubtel SMS** — `SMS_PROVIDER=hubtel`
- **Dojah KYC** — `KYC_PROVIDER=dojah` + Dojah keys (default is manual admin review)
- **Bank mandates / direct debit** — `BANK_API_KEY` + `BANK_API_URL` for GhIPSS or sponsor bank
- **Subscription billing** — Premium upgrades are recorded in-app; payment collection for renewals is not yet integrated

## Scripts

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:generate  # Prisma client
npm run db:push      # Push schema
npm run db:seed      # Seed demo data
npm run db:studio    # Prisma Studio
```

## Security

- Rate limiting (Redis or in-memory fallback)
- CSRF via Auth.js, XSS headers in middleware
- Encrypted 2FA secrets (AES-256-GCM)
- OTP verification for withdrawals; 2FA required on confirm
- Audit & login logs

## License

Private — RentVest Platform
