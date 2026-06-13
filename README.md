# PayForme

Ghana's rental finance and property collaboration platform connecting **Tenants**, **Landlords**, **Agents**, **Lenders**, and **Administrators**.

## Tech Stack

- **Frontend:** Next.js 16 App Router, TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, React Hook Form, Zod, Zustand, TanStack Query
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL, Redis
- **Auth:** Auth.js (NextAuth v5), JWT, OTP, 2FA-ready
- **Infra:** Docker, Vercel-ready

## Core Modules

- Authentication & role-based dashboards (Tenant, Landlord, Agent, Lender, Admin)
- Profile, Ghana Card KYC, and bank account validation
- Property listings, tenant applications, and landlord/agent review
- Pay for Rent financing, mandate lifecycle, and lender decisioning
- Repayment schedules, deductions, settlements, and reconciliation
- Notifications, audit logs, and admin review queues

## Quick Start

### 1. Environment

```bash
cp .env.example .env
```

Update `DATABASE_URL`, `AUTH_SECRET`, `JWT_*`, and `ENCRYPTION_KEY`.

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
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

| Role     | Email                 | Password        |
|----------|-----------------------|-----------------|
| CEO      | ceo@rentvest.com      | Password123!    |
| Admin    | admin@rentvest.com    | Password123!    |
| Tenant   | tenant@rentvest.com   | Password123!    |
| Landlord | landlord@rentvest.com | Password123!    |
| Agent    | agent@rentvest.com    | Password123!    |
| Lender   | lender@rentvest.com | Password123!    |

## Project Structure

```
app/
  (marketing)/     # Landing, properties browse
  (auth)/          # Login, register
  dashboard/       # Tenant, landlord, agent, lender dashboards
  admin/           # Super admin panel
  ceo/             # CEO analytics
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

- Multi-role auth (Tenant, Landlord, Agent, Lender, Admin, CEO)
- Property applications before Pay for Rent financing
- Ghana Card KYC and bank account validation workflows
- Mandate management and admin review queues
- Settlement tracking and reconciliation exceptions
- Wallet system with commission/fees
- Subscription plans (Free, Standard, Premium)
- OTP, audit logs, rate limiting
- CEO analytics dashboard
- Docker deployment

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register user |
| `/api/properties` | GET/POST | Browse / create properties |
| `/api/financing` | GET/POST | Financing requests |
| `/api/financing/approve` | POST | Lender approve |
| `/api/wallet` | GET/POST | Balance & deposits |
| `/api/analytics/ceo` | GET | CEO dashboard data |

## Deployment

- **Frontend:** Vercel — connect repo, set env vars
- **Database:** Railway, Supabase, or AWS RDS (PostgreSQL)
- **Redis:** Upstash or Railway Redis
- **Full stack:** `docker compose up` for local/staging

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
- Encrypted sensitive fields (AES-256-GCM)
- Transaction PINs, OTP verification
- Audit & login logs

## License

Private — RentVest Platform
