# PayForMe Partner Bank API

| | |
|---|---|
| **Version** | 1.0 |
| **Base URL** | `https://<your-domain>/api/bank/v1` |
| **Webhook URL** | `https://<your-domain>/api/webhooks/bank` |
| **Currency** | GHS |

Banks call PayForMe to credit/debit wallets, execute charges, and report transaction status.

---

## Authentication

```http
x-bank-api-key: <BANK_API_KEY>
Content-Type: application/json
```

| Header | Webhooks only |
|--------|---------------|
| `x-bank-signature: sha256=<HMAC-SHA256(body, BANK_WEBHOOK_SECRET)>` | Required if secret configured |
| `x-bank-event-id: <unique-id>` | Recommended |

| HTTP | Code | Meaning |
|------|------|---------|
| 401 | `BANK_API_UNAUTHORIZED` | Invalid or missing API key |
| 503 | `BANK_API_DISABLED` | API not enabled |

---

## Response envelope

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {},
  "errors": null,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Conventions

**Status values:** `PENDING` · `PROCESSING` · `COMPLETED` · `FAILED` · `CANCELLED`

**Idempotency:** Every mutating request requires a unique `reference` (min 6 chars). Repeats with the same reference return `200` and `alreadyProcessed: true`.

**Deposits:** Customer transfers to the PayForMe **collection account** with a platform deposit reference. Bank calls `POST /deposits` on confirmation.

---

## Endpoints

### `GET /health`

Connectivity check. No API key required.

**Response `200`**

```json
{
  "status": "ok",
  "version": "1.0",
  "environment": "production"
}
```

---

### `POST /deposits`

Credit a user wallet after a collection-account deposit.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | PayForMe user ID |
| `amount` | number | Yes | Gross amount (GHS) |
| `reference` | string | Yes | Unique bank reference |
| `partnerReference` | string | No | Alternate reference |
| `bankCode` | string | No | Originating bank |
| `description` | string | No | Narration |
| `status` | enum | No | Default `COMPLETED` |

**Request**

```json
{
  "userId": "clx1234567890abcdefghij",
  "amount": 1500.00,
  "reference": "GCB-IN-20260725-0001842",
  "bankCode": "040",
  "description": "Wallet top-up"
}
```

**Response `201`** · `200` if duplicate

```json
{
  "alreadyProcessed": false,
  "transaction": {
    "id": "clxtx987",
    "type": "DEPOSIT",
    "status": "COMPLETED",
    "amount": "1500.00",
    "fee": "30.00",
    "netAmount": "1470.00",
    "reference": "GCB-IN-20260725-0001842"
  }
}
```

---

### `POST /withdrawals`

Debit a user wallet after the bank has paid the customer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | PayForMe user ID |
| `bankAccountId` | string | Yes | Verified linked account |
| `amount` | number | Yes | Payout amount (GHS) |
| `reference` | string | Yes | Unique bank reference |
| `withdrawalRequestId` | string | No | Link to app withdrawal |
| `status` | enum | No | Default `COMPLETED` |

**Request**

```json
{
  "userId": "clx1234567890abcdefghij",
  "bankAccountId": "clxbank222",
  "amount": 500.00,
  "reference": "GCB-OUT-20260725-0000911"
}
```

**Response `201`**

```json
{
  "alreadyProcessed": false,
  "transaction": {
    "type": "WITHDRAWAL",
    "status": "COMPLETED",
    "amount": "500.00",
    "reference": "GCB-OUT-20260725-0000911"
  }
}
```

---

### `POST /withdrawals/initiate`

Fetch payout instructions for an in-app withdrawal.

**Request**

```json
{
  "withdrawalRequestId": "clxwd333"
}
```

**Response `200`**

```json
{
  "withdrawalRequestId": "clxwd333",
  "reference": "PFM-WDR-20260725-88",
  "status": "PROCESSING",
  "amount": 500.00,
  "currency": "GHS",
  "payout": {
    "bankCode": "040",
    "bankName": "GCB Bank",
    "accountNumber": "1234567890",
    "accountName": "JOHN DOE"
  }
}
```

---

### `PATCH /withdrawals/{withdrawalRequestId}`

Update withdrawal status after GhIPSS settlement.

**Completed**

```json
{
  "status": "COMPLETED",
  "reference": "GCB-OUT-20260725-0000911",
  "completedAt": "2026-07-25T10:28:00Z"
}
```

**Failed**

```json
{
  "status": "FAILED",
  "failureCode": "INSUFFICIENT_FUNDS",
  "failureMessage": "Customer account could not be credited"
}
```

---

### `POST /charges`

Debit a linked bank account for installments or mandates.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | Yes | Unique charge reference |
| `userId` | string | Yes | PayForMe user ID |
| `bankAccountId` | string | Yes | Linked account |
| `amount` | number | Yes | Amount (GHS) |
| `chargeType` | enum | Yes | `INSTALLMENT` · `INVOICE` · `MANDATE` |
| `installmentId` | string | Conditional | For `INSTALLMENT` |
| `mandateId` | string | Conditional | For `MANDATE` |
| `description` | string | No | Narration |

**Request**

```json
{
  "reference": "GCB-DD-20260725-0044",
  "userId": "clx123",
  "bankAccountId": "clxbank222",
  "amount": 850.00,
  "chargeType": "INSTALLMENT",
  "installmentId": "clxinst444",
  "mandateId": "clxmand555",
  "description": "Rent installment #3"
}
```

**Response `202`**

```json
{
  "chargeId": "clxcharge666",
  "status": "PROCESSING",
  "reference": "GCB-DD-20260725-0044"
}
```

---

### `GET /transactions/{reference}`

Reconciliation lookup by bank or platform reference.

**Response `200`**

```json
{
  "reference": "GCB-IN-20260725-0001842",
  "type": "DEPOSIT",
  "status": "COMPLETED",
  "amount": "1500.00",
  "userId": "clx123",
  "createdAt": "2026-07-25T10:15:00Z",
  "completedAt": "2026-07-25T10:15:01Z"
}
```

---

### `GET /users/lookup`

Resolve `userId` from account details (missing deposit reference).

| Query | Required |
|-------|----------|
| `accountNumber` | Yes |
| `bankCode` | Yes |

**Response `200`**

```json
{
  "userId": "clx123",
  "fullName": "John Doe",
  "email": "j***@example.com",
  "defaultBankAccountId": "clxbank222"
}
```

---

### `POST /mandates/callback`

Report mandate lifecycle updates.

```json
{
  "mandateId": "clxmand555",
  "providerReference": "BANK-MAND-9988",
  "status": "ACTIVE",
  "activatedAt": "2026-07-20T08:00:00Z"
}
```

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Mandate approved |
| `REJECTED` | Mandate declined |
| `REVOKED` | Mandate cancelled |
| `EXPIRED` | Mandate lapsed |

---

### `POST /api/webhooks/bank`

Async events (alternative to polling / PATCH).

| Event | Purpose |
|-------|---------|
| `deposit.completed` | Wallet credit confirmed |
| `deposit.failed` | Deposit failed |
| `withdrawal.completed` | Payout confirmed |
| `withdrawal.failed` | Payout failed |
| `charge.completed` | Direct debit succeeded |
| `charge.failed` | Direct debit failed |

**Example**

```json
{
  "event": "deposit.completed",
  "reference": "GCB-IN-20260725-0001842",
  "userId": "clx123",
  "amount": 1500.00,
  "status": "COMPLETED",
  "completedAt": "2026-07-25T10:15:00Z"
}
```

**Response `200`:** `{ "received": true }`

---

## Error codes

| Code | HTTP | Description |
|------|------|-------------|
| `BANK_API_UNAUTHORIZED` | 401 | Invalid API key |
| `BANK_API_DISABLED` | 503 | API not configured |
| `VALIDATION_ERROR` | 400 | Invalid payload |
| `USER_NOT_FOUND` | 404 | Unknown user |
| `BANK_ACCOUNT_NOT_FOUND` | 404 | Unknown or unverified account |
| `INSUFFICIENT_BALANCE` | 400 | Wallet overdraw |
| `DUPLICATE_REFERENCE` | 409 | Reference conflict |
| `MANDATE_INACTIVE` | 400 | Mandate not active |

---

## PDF export

```bash
npm run docs:bank-partner-pdf
```

Output: `docs/bank-partner-api.pdf`
