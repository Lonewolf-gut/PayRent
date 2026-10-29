# PayRent

PayRent uses **two separate projects** — not a nested monorepo on your machine.

| Local folder | What belongs there |
|--------------|-------------------|
| `PayRent-Frontend` | Frontend only: `app/`, `components/`, `lib/`, `package.json` at the **root** |
| `PayRent-Backend` | Backend only: `app/api/`, `lib/`, `prisma/`, `package.json` at the **root** |

If you see `payrent-backend/` and `payrent-frontend/` **inside** one folder, you pulled the wrong branch. That layout is for cloud-agent development only.

## Restore your local folders (Windows)

### Option A — separate GitHub repos (recommended)

```powershell
# Frontend
cd C:\Users\USER\Desktop
Rename-Item PayRent-Frontend PayRent-Frontend-old
git clone https://github.com/Lonewolf-gut/PayRent-Frontend.git PayRent-Frontend
cd PayRent-Frontend
copy .env.example .env
npm install
npm run dev
```

```powershell
# Backend
cd C:\Users\USER\Desktop
Rename-Item PayRent-Backend PayRent-Backend-old
git clone https://github.com/Lonewolf-gut/PayRent-Backend.git PayRent-Backend
cd PayRent-Backend
copy .env.example .env
docker compose up -d postgres redis
npm install
npm run db:push
npm run db:seed
npm run dev
```

Copy `.env` values from your `-old` folders before deleting them. Use the **same `AUTH_SECRET`** in both apps.

### Option B — sync branches on this repo

If the separate repos are behind, clone from the sync branches instead:

```powershell
git clone -b sync/payrent-frontend-5e51 https://github.com/Lonewolf-gut/PayRent.git PayRent-Frontend
git clone -b sync/payrent-backend-5e51 https://github.com/Lonewolf-gut/PayRent.git PayRent-Backend
```

### Fix an existing folder without re-cloning

```powershell
cd C:\Users\USER\Desktop\PayRent-Frontend
git fetch origin sync/payrent-frontend-5e51
git checkout sync/payrent-frontend-5e51
git reset --hard origin/sync/payrent-frontend-5e51
```

```powershell
cd C:\Users\USER\Desktop\PayRent-Backend
git fetch origin sync/payrent-backend-5e51
git checkout sync/payrent-backend-5e51
git reset --hard origin/sync/payrent-backend-5e51
```

## Run commands

| App | Folder | Dev | Build | Production |
|-----|--------|-----|-------|------------|
| Frontend | `PayRent-Frontend` | `npm run dev` | `npm run build` | `npm run build` then `npm start` |
| Backend | `PayRent-Backend` | `npm run dev` | `npm run build` | `npm run build` then `npm start` |

Run each command **inside its own folder**. Do not run `npm run build` from a parent folder that contains both sub-projects.

## Cloud-agent monorepo (do not use locally)

The `cursor/monorepo-split-5e51` branch keeps `payrent-backend/` and `payrent-frontend/` subfolders for agent work. Sync to split branches with:

```bash
./scripts/sync-split-branches.sh
```
