# Redde payments (PayForMe)

Collections and payouts run through [Redde](https://developers.reddeonline.com/). Paystack is kept **only** for bank list / account resolve in user settings.

## Environment (backend `.env`)

```env
PAYMENT_PROVIDER=redde

REDDE_APP_ID=1750
REDDE_API_KEY=your_api_key_from_wigal

# Optional overrides
# REDDE_RECEIVE_URL=https://api.reddeonline.com/v1/receive/
# REDDE_CASHOUT_URL=https://api.reddeonline.com/v1/cashout
# REDDE_MERCHANT_NICKNAME=PayForMe
# REDDE_BANK_PAYMENT_OPTION=BANK
# REDDE_CALLBACK_SECRET=

# Paystack — lookup only (bank resolve in dashboards)
PAYSTACK_SECRET_KEY=sk_...
PAYSTACK_PUBLIC_KEY=pk_...
```

## Webhook (production / staging)

Redde’s servers must reach your **backend** (port **3001** in dev), not the Next.js UI port.

**Callback URL:**

```text
https://<your-public-api-host>/api/webhooks/payments/redde
```

Example: `https://api.yourdomain.com/api/webhooks/payments/redde`

In the Redde app (**PAYBRIDGE MARKETPLACE**), replace the old Wigal USSD callback with this URL.

---

## Localhost (`localhost:3001`)

Redde **cannot** POST to `http://localhost:3001/...` from the internet. Use one of these:

### Option A — Tunnel (recommended for real MoMo tests)

1. Start backend: `npm run dev` in `payrent-backend` (listens on **3001**).
2. Expose it, e.g. [ngrok](https://ngrok.com/):

   ```bash
   ngrok http 3001
   ```

3. Copy the HTTPS URL, e.g. `https://a1b2c3.ngrok-free.app`.
4. In Redde portal set **Callback URL** to:

   ```text
   https://a1b2c3.ngrok-free.app/api/webhooks/payments/redde
   ```

5. Keep ngrok running while testing payments.

**Important:** Tunnel **port 3001** (backend API) only. Do not use the ngrok URL in the browser to use PayForMe — open **http://localhost:3000** for the UI. Ngrok is only so Redde can POST the webhook.

Optional backend `.env` (stops the dev “Blocked cross-origin request” warning):

```env
ALLOWED_DEV_ORIGINS=your-subdomain.ngrok-free.dev
```

Same hostname works if you set `REDDE_CALLBACK_PUBLIC_ORIGIN=https://your-subdomain.ngrok-free.dev`.

Same pattern works with Cloudflare Tunnel, localtunnel, etc.

### Option B — Dev simulate (no tunnel)

After starting a payment, note the **`reference`** from the API response (e.g. `SUB-AB12CD34`).

```bash
curl -X POST http://localhost:3001/api/dev/redde/simulate-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{"clientReference":"SUB-AB12CD34","amount":199,"status":"SUCCESS"}'
```

This runs the same completion logic as a real Redde callback. **Disabled in production.**

---

## Database

```bash
psql $DATABASE_URL -f prisma/sql/payment-invoices-migration.sql
npx prisma generate
```

## Settlement

- **Subscriptions** → your Redde merchant bank (platform account).
- **Property sales** → buyer pays via Redde; invoice records merchant beneficiary; funds settle per your Redde merchant bank setup (confirm split/settlement rules with Wigal if payee-specific routing is required).
- **Payouts** (affiliate/lender withdrawals) → Redde cashout API.

## Invoices

Each collection creates `PaymentInvoice` with number `PFM-YYYY-000001`. List via `GET /api/payments/invoices` (authenticated).
