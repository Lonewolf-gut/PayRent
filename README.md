# PayRent

This repository contains the **split source code** for PayRent during migration.

## Separate repositories (recommended)

The platform is intended to live in **two independent GitHub repos**:

| Repo | Purpose |
|------|---------|
| [PayRent-Backend](https://github.com/Lonewolf-gut/PayRent-Backend) | API, database, business logic, partner integrations |
| [PayRent-Frontend](https://github.com/Lonewolf-gut/PayRent-Frontend) | Web UI, dashboards, admin panel |

### Clone and run separately

**Backend:**

```bash
git clone https://github.com/Lonewolf-gut/PayRent-Backend.git
cd PayRent-Backend
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:push && npm run db:seed
npm run dev   # http://localhost:3001
```

**Frontend:**

```bash
git clone https://github.com/Lonewolf-gut/PayRent-Frontend.git
cd PayRent-Frontend
cp .env.example .env
npm install
npm run dev   # http://localhost:3000
```

Use the **same `AUTH_SECRET`** in both `.env` files.

## Publish to separate repos

From this branch, run:

```bash
chmod +x scripts/publish-separate-repos.sh
./scripts/publish-separate-repos.sh
```

This creates/updates `PayRent-Backend` and `PayRent-Frontend` on GitHub.

## Folders in this repo

- `payrent-backend/` — backend source (mirrors PayRent-Backend repo)
- `payrent-frontend/` — frontend source (mirrors PayRent-Frontend repo)

You can develop here during migration, but for production use the separate repos above.
