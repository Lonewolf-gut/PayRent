# Supabase database setup (PayRent Backend)

PayRent uses **Prisma + PostgreSQL**. Supabase is fully supported; you do **not** need Docker Postgres when `DATABASE_URL` points at Supabase.

## 1. Get connection strings

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database**:

| Variable | Supabase UI label | Host / port |
|----------|-------------------|-------------|
| `DATABASE_URL` | **Connection pooling** → **Transaction** | `….pooler.supabase.com` **:6543** + `pgbouncer=true` |
| `DIRECT_URL` | **Connection pooling** → **Session** (recommended on Windows) | **Same pooler host** **:5432** (no `pgbouncer=true`) |

**Windows / P1001 on `db.….supabase.co`:** The dashboard “Direct connection” host is often **IPv6-only**. Many PCs cannot reach it. Use **Session pooler on port 5432** (same `aws-0-….pooler.supabase.com` as Transaction) for `DIRECT_URL` instead of `db.….supabase.co`.

Alternative: Supabase **Add-ons → IPv4** for the project, then `db.….supabase.co:5432` may work.

Example for **eu-west-1** (replace password; `#` → `%23`):

```env
DATABASE_URL="postgresql://postgres.dfwkbgtyznbjgbupgokw:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

DIRECT_URL="postgresql://postgres.dfwkbgtyznbjgbupgokw:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Paste both into **`PayRent-Backend/.env`** only (not the frontend).

The app normalizes URLs at runtime (`sslmode=require`, `pgbouncer=true` on pooler) in `lib/db/database-url.ts`.

## 2. Apply schema

From `PayRent-Backend`:

```bash
npm run db:test-connection
npm run db:push
npm run db:seed
```

### If `db:push` fails with **P1001** (cannot reach `:5432` or pooler)

Your PC cannot open a TCP connection to Supabase (firewall, ISP, or **Database → Network** IP allowlist).

1. **Supabase Dashboard → Project Settings → Database → Network**  
   - Turn off “Restrict connections” for development, **or** add your [public IP](https://ifconfig.me).  
2. Run:

   ```bash
   npm run db:test-connection
   ```

3. **Apply schema without local Postgres TCP** (works on premium Supabase from the browser):

   ```bash
   npm run db:export-schema-sql
   ```

   Open `prisma/supabase-bootstrap.sql` → copy all → **Supabase → SQL Editor → Run**.  
   Then locally:

   ```bash
   npm run db:generate
   npm run dev
   ```

4. Optional: **Add-ons → IPv4** and use the IPv4 strings from the dashboard.

For one-off SQL (e.g. payment invoices), use **Supabase → SQL Editor** and run `prisma/sql/payment-invoices-migration.sql`.

**Legacy `FinancingRequestDocument` rows:** before `db push`, run `prisma/sql/migrate-financing-request-documents-to-tenant.sql` in the SQL Editor to copy into `TenantFinancingDocument` and archive the old table.

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
| **`P1001` on pooler `:5432` or `:6543`** | Network / IP allowlist — see **Apply schema → P1001** above; use **`npm run db:export-schema-sql`** + SQL Editor |
| Migrations / `db:push` fail on 6543 URL | `DIRECT_URL` must be **5432** (Session pooler or direct), never `:6543` |
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
