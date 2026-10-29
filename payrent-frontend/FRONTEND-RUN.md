# PayRent Frontend — run on Windows

## Manifests error on `npm start`

This was caused by the home page (`/`) being treated as a **static** route in production while the marketing layout uses **auth()**. That broke `next start` with:

`Invariant: The manifests singleton was not initialized`

**Fixed in the latest sync branch** (`force-dynamic` on the marketing layout + separate `.next-dev` for dev).

---

## Recommended commands (PowerShell)

```powershell
cd C:\Users\USER\Desktop\PayRent-Frontend
git fetch origin sync/payrent-frontend-5e51
git reset --hard origin/sync/payrent-frontend-5e51
npm run clean
npm install
npm run dev
```

Open **http://localhost:3000**

Use **`npm run dev`** for daily work (not raw `next start`).

---

## If you use `npm start`

After pulling the latest code:

- Valid **`npm run build`** output → runs production server
- Otherwise → clears stale cache and runs **`npm run dev`**

Production mode:

```powershell
npm run clean
npm run build
npm run start:prod
```

---

## Backend

Run **PayRent-Backend** on port **3001**. In frontend `.env`:

```env
API_URL=http://localhost:3001
AUTH_SECRET=any-long-random-string-for-local-dev
```

---

## Pull without a `payrent` remote

If `origin` is your frontend repo and sync lives on GitHub monorepo:

```powershell
git fetch origin sync/payrent-frontend-5e51
git merge --ff-only origin/sync/payrent-frontend-5e51
```

Or add the monorepo once:

```powershell
git remote add payrent https://github.com/Lonewolf-gut/PayRent.git
git fetch payrent sync/payrent-frontend-5e51
git reset --hard payrent/sync/payrent-frontend-5e51
```
