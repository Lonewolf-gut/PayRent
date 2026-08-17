# Split repo pull guide (PayRent-Frontend vs PayRent-Backend)

PayRent is split into two apps:

| Repo | Port | Role |
|------|------|------|
| **PayRent-Frontend** | 3000 | UI, NextAuth (`/api/auth/*`), proxies other `/api/*` to backend |
| **PayRent-Backend** | 3001 | Prisma, all business APIs, webhooks, cron |

## Fix: `Module not found` on Frontend build

If `npm run build` in **PayRent-Frontend** fails with missing modules such as:

- `@/lib/api/handler`
- `@/lib/auth/jwt`
- `@/lib/repositories/property.repository`
- `@/lib/services/property-detail.service`
- `@/lib/integrations/documents`

those files belong on the **backend only**. Remove them from the frontend repo (or do not pull them):

```powershell
# In PayRent-Frontend — remove backend-only paths if they were pulled by mistake
git rm -r app/api/properties lib/services/property-detail.service.ts 2>$null
```

Then pull **frontend-safe** paths only (pages, components, constants, auth permissions).

## What goes where

**Frontend-safe**

- `app/(marketing)/**`
- `app/dashboard/**` (pages)
- `components/**`
- `lib/auth/permissions.ts`
- `constants/**`

**Backend-only**

- `app/api/**` (except NextAuth if frontend hosts auth)
- `lib/services/**`
- `lib/repositories/**`
- `lib/integrations/**`
- `prisma/**`

## Environment

**PayRent-Frontend `.env`**

```env
INTERNAL_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
AUTH_URL=http://localhost:3000
DATABASE_URL=<same as backend>
```

**PayRent-Backend `.env`**

```env
PORT=3001
PAYMENT_PROVIDER=demo
DEMO_MODE=true
DATABASE_URL=<same as frontend>
REDIS_URL=redis://localhost:6379
```

## Demo flows (backend)

Set on **PayRent-Backend** (or monorepo `.env`):

```env
PAYMENT_PROVIDER=demo
DEMO_MODE=true
```

Then:

1. **Subscriptions / listing checkout** — user is sent to `/payment/demo?reference=…`
2. **Affiliate withdrawals** — MoMo/bank payouts simulate success after OTP + 2FA
3. **Financing walkthrough** — admin → `/admin/financing/demo` → advance steps or run full demo

Demo accounts (after `npm run db:seed`): `tenant@payforme.com`, `landlord@payforme.com`, `lender@payforme.com`, `agent@payforme.com`, `admin@payforme.com` — password `Password123!`
