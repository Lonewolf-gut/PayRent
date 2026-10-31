# Supabase database setup (PayRent Backend)

PayRent uses **Prisma + PostgreSQL**. Supabase is fully supported; you do **not** need Docker Postgres when `DATABASE_URL` points at Supabase.

## 1. Get connection strings

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database**:

| Variable | Supabase UI label | Typical host / port |
|----------|-------------------|------------------------|
| `DATABASE_URL` | **Connection pooling** → **Transaction** mode | `….pooler.supabase.com` **:6543** |
| `DIRECT_URL` | **Direct connection** | `….supabase.co` **:5432** |

Replace `[YOUR-PASSWORD]` with the database password (URL-encode special characters).

Example (replace region, ref, password):

```env
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.abcdefghijklmnop:YOUR_PASSWORD@aws-0-eu-central-1.supabase.co:5432/postgres?sslmode=require"
```

Paste both into **`PayRent-Backend/.env`** only (not the frontend).

The app normalizes URLs at runtime (`sslmode=require`, `pgbouncer=true` on pooler) in `lib/db/database-url.ts`.

## 2. Apply schema

From `PayRent-Backend`:

```bash
npm run db:push
npm run db:seed
```

For one-off SQL (e.g. payment invoices), use **Supabase → SQL Editor** and run `prisma/sql/payment-invoices-migration.sql`.

## 3. Verify

```bash
npm run dev
```

Then:

```bash
curl http://localhost:3001/api/health
```

Expect `"postgres": true`. Redis may be `false` without Redis; **sign-in still works** (in-memory rate limit fallback).

## 4. Frontend

Frontend does **not** connect to Supabase for login. It calls the backend:

```env
API_URL=http://localhost:3001
AUTH_SECRET=<same as backend>
```

Sign in at **http://localhost:3000/login**.

## Common mistakes

| Symptom | Fix |
|--------|-----|
| `P1001` / database unavailable | Wrong password, missing `sslmode=require`, or using **session** pooler string without `pgbouncer=true` on transaction pooler |
| Migrations / `db:push` fail on pooler URL | Use **`DIRECT_URL`** (5432 direct), not the 6543 pooler URL, for `prisma db push` |
| Only `DATABASE_URL` set on Supabase | Add **`DIRECT_URL`** (required in `schema.prisma`) |
| Toast says “Docker” | Update app from `sync/payrent-backend-5e51` / `sync/payrent-frontend-5e51` — messages are Supabase-aware |
| Login 401 in logs | Wrong password — not a database issue (check `POST /api/auth/login` status) |

## Premium / production

- Prefer **Transaction pooler** (`6543`) for `DATABASE_URL` under load.
- Enable **IPv4 add-on** if your network cannot reach Supabase over IPv6.
- Restrict database access with Supabase **network restrictions** only after your deploy IPs are fixed.
- Store secrets in Supabase / hosting env, never in git.

## Optional Redis

Rate limiting uses Redis when `REDIS_URL` is set (e.g. [Upstash](https://upstash.com)). Optional for auth.
