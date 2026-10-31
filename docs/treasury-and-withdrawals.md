# PayForMe Treasury & Withdrawals

**Audience:** Product, engineering, compliance, and partner banks  
**Related:** `docs/bank-partner-api.md`

---

## 1. Primary merchant account (admin treasury)

PayForMe operates a **single primary merchant collection account** (`PlatformSettlementAccount`) configured by the platform administrator. This is the real bank account where:

- Subscription payments settle
- Customer bank transfers (deposit instructions) land
- Financed purchase amounts are notionally custodied before role allocation
- Mandate repayment collections are received
- Platform fees accumulate

The admin configures this account under **Admin → Settlement account**. Partner banks reconcile against this account using references from the Bank Partner API.

---

## 2. Role wallets (ledger allocations)

Each role has a **virtual wallet** that records their allocatable balance. These are not separate bank accounts — they are ledger entries tied to the treasury.

| Role | Wallet type | Can deposit | Can withdraw | Primary activity |
|------|-------------|-------------|--------------|------------------|
| **Customer (buyer)** | `BUYER` | No | **No** | Request financing, accept lender offers, sign mandates, repay via bank debit |
| **Merchant** | `MERCHANT` | Yes | Yes | Receive financed/purchase proceeds, confirm delivery, withdraw to MoMo/bank |
| **Lender** | `LENDER` | Yes | Yes | Fund financing offers, receive repayments, withdraw earnings |
| **Affiliate (marketer)** | `MARKETER` | Yes | Yes | Earn commissions, withdraw to MoMo/bank |
| **Admin** | `PLATFORM` | N/A | Yes (fees) | Platform fee pool and treasury oversight |

Customers **do not withdraw** from the platform. They pay merchants through financing or direct purchase flows, and repay lenders through bank mandates.

---

## 3. Money flows

### 3.1 Financing (Pay-for-Me)

1. Customer requests financing and accepts a lender offer.
2. PayForMe registers the **repayment mandate** with the partner bank (`POST {BANK_API_URL}/mandates`).
3. Lender clicks **Finance listing** — funds move from lender wallet → merchant wallet (recorded as treasury disbursement on behalf of the customer).
4. Merchant delivers the product and confirms delivery.
5. Customer repays monthly via bank mandate debit → bank reports `POST /api/bank/v1/charges` → installment marked paid.

### 3.2 Subscriptions & deposits

- User initiates deposit → receives reference → transfers to **primary collection account**.
- Bank calls `POST /api/bank/v1/deposits` → role wallet credited.

### 3.3 Withdrawals (merchant, lender, affiliate, admin)

1. User requests withdrawal to verified MoMo/bank account (OTP + 2FA).
2. PayForMe creates `WithdrawalRequest` and bank instruction (`POST /api/bank/v1/withdrawals/initiate`).
3. Bank pays from the **primary collection account** to the user's linked account.
4. Bank confirms with `POST /api/bank/v1/withdrawals` → role wallet debited.

---

## 4. Audit trail

Every treasury movement creates a `BankPartnerTransaction` with metadata:

- `treasuryFlow`: `FINANCING_DISBURSEMENT`, `AGENT_COMMISSION`, `MANDATE_REPAYMENT`, `ROLE_WITHDRAWAL`, etc.
- `collectionAccountId`: admin primary account
- `beneficiaryUserId` / `beneficiaryWalletType`
- `buyerUserId` and `onBehalfOfCustomer` when financing is for a customer purchase
- `financingRequestId` when applicable

This gives banks and compliance a single reconcilable chain from collection account → role allocation → payout.

---

## 5. Bank API responsibilities

| Direction | Endpoint | Who calls |
|-----------|----------|-----------|
| PayForMe → Bank | `POST /mandates` | PayForMe (mandate registration) |
| PayForMe → Bank | `POST /debit` | PayForMe (scheduled repayment) |
| Bank → PayForMe | `POST /deposits` | Bank (customer paid into collection account) |
| Bank → PayForMe | `POST /withdrawals` | Bank (payout to role account completed) |
| Bank → PayForMe | `POST /charges` | Bank (mandate debit result) |
| Bank → PayForMe | `POST /mandates/callback` | Bank (mandate status update) |

Full request/response schemas: **`docs/bank-partner-api.md`**.

---

## 6. Implementation reference

| Component | Path |
|-----------|------|
| Treasury service | `lib/services/treasury.service.ts` |
| Bank partner orchestration | `lib/services/payment/bank-partner.service.ts` |
| Mandate bank client | `lib/integrations/mandate/bank-mandate.client.ts` |
| Role wallet rules | `lib/wallet/role-wallet.ts` |
| Collection account | `lib/services/payment/settlement-account.service.ts` |
