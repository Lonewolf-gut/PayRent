# PayRent Frontend — run on Windows

## Manifests error (`The manifests singleton was not initialized`)

This happens when **`npm start`** runs **without** a completed **`npm run build`**, or when old **`.next-dev`** folders conflict with **`.next`**.

### Fix (do this in `PayRent-Frontend`)

```powershell
cd C:\Users\USER\Desktop\PayRent-Frontend
# Stop any running node/next process (Ctrl+C in those terminals)

npm run clean
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run dev
```

Open **http://localhost:3000**

Use **`npm run dev`** for daily work — not **`npm start`**.

### Production mode only

```powershell
npm run clean
npm install
npm run build
npm start
```

If `npm start` runs without a build, the `prestart` script now prints clear instructions instead of the manifests error.

## Backend

Run **PayRent-Backend** on port **3001** and set in `.env`:

```env
API_URL=http://localhost:3001
```
