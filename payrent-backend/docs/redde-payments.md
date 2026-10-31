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

## Webhook

In the Redde developer portal (**PAYBRIDGE MARKETPLACE** app), set **Callback URL** to:

`https://<your-api-host>/api/webhooks/payments/redde`

Example production: `https://api.payforme.example/api/webhooks/payments/redde`

Local dev: use a tunnel (ngrok, Cloudflare Tunnel) pointing to port `3001`.

Subscription and wallet deposits create a **PaymentInvoice** (`PFM-YYYY-000001`) and complete when Redde posts a successful callback.

## Database

Apply migration:

`psql $DATABASE_URL -f prisma/sql/payment-invoices-migration.sql`

Then `npx prisma generate`.

## Settlement

Subscription collections settle to your **Redde merchant bank account** (platform company account on Redde). Property purchases (next phase) will target each listing merchant’s verified payout account.
