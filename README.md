# PayRent Monorepo

Ghana's rental finance and property collaboration platform — split into separate **frontend** and **backend** applications.

## Structure

```
payrent/
├── payrent-backend/     # API, database, business logic, partner integrations
├── payrent-frontend/    # Next.js web UI
├── docs/                # API and integration documentation
└── docker-compose.yml   # Postgres, Redis, backend, frontend
```

| App | Port (dev) | Description |
|-----|------------|-------------|
| **payrent-frontend** | 3000 | Web dashboards, marketing pages, admin UI |
| **payrent-backend** | 3001 | REST API, webhooks, cron jobs, partner bank API |

The frontend proxies `/api/*` requests to the backend (except NextAuth session routes). Mobile apps and partners should call the backend URL directly.

## Quick Start

### 1. Environment

```bash
cp payrent-backend/.env.example payrent-backend/.env
cp payrent-frontend/.env.example payrent-frontend/.env
```

Use the **same** `AUTH_SECRET` in both files. Update database credentials and integration keys in `payrent-backend/.env`.

### 2. Database

```bash
npm run docker:up
```

### 3. Install & migrate

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Run both apps

```bash
npm run dev
```

- Web UI: http://localhost:3000
- API: http://localhost:3001/api/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:backend` | Backend only (port 3001) |
| `npm run dev:frontend` | Frontend only (port 3000) |
| `npm run build` | Build both apps |
| `npm run test` | Run backend tests |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

- **Frontend** → Vercel (`payrent-frontend/`), set `API_URL` to your backend URL
- **Backend** → Railway, Render, or AWS (`payrent-backend/`), set `FRONTEND_URL` for CORS
- **Database** → PostgreSQL (Railway, Supabase, RDS)
- **Redis** → Upstash or Railway
- **Cron jobs** → Configured in `payrent-backend/vercel.json`

## API Documentation

See [docs/API.md](./docs/API.md) and [docs/bank-partner-api.md](./docs/bank-partner-api.md).

## Mobile & Partners

- **Mobile apps** (future): call `https://api.yourdomain.com` with JWT (`/api/auth/refresh`)
- **Partner banks**: `/api/bank/v1` with `x-bank-api-key` header
