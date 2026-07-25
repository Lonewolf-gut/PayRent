# PayForMe — Business Documents by Integration

**Version:** 1.0  
**Purpose:** One checklist of company documents and which integration each is required for  
**Use this when:** Applying to Arkesel, Hubtel SMS, MTN MoMo, Cloudflare R2, AWS S3, or partner banks

---

## 1. Company details to prepare once

Fill these in once and reuse across all applications.

| Field | Example / notes |
|-------|-----------------|
| Legal entity name | PayForMe Ghana Ltd |
| Trading / brand name | PayForMe |
| Entity type | Private Limited Company |
| Country of incorporation | Ghana |
| Date of incorporation | From Certificate of Incorporation |
| **Certificate of Incorporation number** | RGD / Registrar number |
| **Business Registration number** | Ghana RGD unique ID |
| **TIN (Tax Identification Number)** | GRA-issued |
| VAT registration number | If VAT-registered |
| Registered office address | Full postal address |
| Operational address | If different from registered |
| Official company email | Prefer `@yourdomain.com` |
| Company phone & website | Live contact details |
| Authorized signatory | Name, title, ID, email, phone |
| Corporate bank account | Bank name, account name, account number |

---

## 2. Master document list

| # | Document | What it proves |
|---|----------|----------------|
| D1 | Certificate of Incorporation | Legal existence |
| D2 | Memorandum & Articles / Constitution | Governance structure |
| D3 | Business Registration certificate / extract | Current registration with RGD |
| D4 | TIN certificate | Tax identity (GRA) |
| D5 | VAT registration certificate | VAT status (if applicable) |
| D6 | Business operating license | Permission to operate in your sector |
| D7 | Proof of business address | Utility bill, lease, or bank stmt (≤ 3 months) |
| D8 | Register of directors | Current directors |
| D9 | Beneficial ownership (UBO) declaration | Owners with ≥ 25% |
| D10 | Director / UBO Ghana Card or passport | Identity of controllers |
| D11 | Board resolution | Authorizes signatory to sign partner agreements |
| D12 | Corporate bank account confirmation letter | Settlement / billing account |
| D13 | Audited financial statements | Financial standing (often requested for payments) |
| D14 | AML / CFT policy | Anti-money laundering programme |
| D15 | KYC / customer due diligence policy | How users are verified |
| D16 | Privacy policy (published) | Data processing notice |
| D17 | Terms of service (published) | Customer contract |
| D18 | Information security policy | Data & infrastructure security |
| D19 | Complaints / dispute procedure | Customer redress |
| D20 | Data Protection Commission registration | Ghana DPA compliance (if applicable) |
| D21 | Sample SMS message templates | OTP / notification wording |
| D22 | HTTPS production domain proof | Live website or callback URLs |
| D23 | Technical contact details | API / webhook engineering contact |

---

## 3. Documents required per integration

### Legend

| Symbol | Meaning |
|--------|---------|
| **Required** | Must submit or provider will reject application |
| **Often** | Commonly requested; have ready |
| **Optional** | Only if provider asks |
| **—** | Not typically needed |

---

### SMS — Arkesel

| Document | Required |
|----------|----------|
| D1 Certificate of Incorporation | **Required** |
| D3 Business Registration | **Required** |
| D4 TIN certificate | **Required** |
| D6 Business operating license | Often |
| D7 Proof of business address | **Required** |
| D8 Register of directors | Often |
| D10 Director / signatory ID | **Required** |
| D11 Board resolution | Often |
| D16 Privacy policy | **Required** |
| D21 Sample SMS templates (OTP, alerts) | **Required** |
| D22 Live website / app URL | **Required** |
| Approved **Sender ID** application (≤ 11 chars) | **Required** (Arkesel-specific) |

**Also provide:** use case description (verification OTP, withdrawal OTP, notifications), estimated monthly SMS volume.

---

### SMS — Hubtel

| Document | Required |
|----------|----------|
| D1 Certificate of Incorporation | **Required** |
| D3 Business Registration | **Required** |
| D4 TIN certificate | **Required** |
| D6 Business operating license | Often |
| D7 Proof of business address | **Required** |
| D8 Register of directors | Often |
| D10 Director / signatory ID | **Required** |
| D11 Board resolution | Often |
| D12 Corporate bank account letter | Often |
| D16 Privacy policy | **Required** |
| D21 Sample SMS templates | **Required** |
| D22 Live website / app URL | **Required** |
| Hubtel merchant / SMS onboarding form | **Required** (Hubtel-specific) |

**Env when approved:** `SMS_PROVIDER=hubtel`, `HUBTEL_SMS_CLIENT_ID`, `HUBTEL_SMS_CLIENT_SECRET`, `HUBTEL_SMS_SENDER_ID`

---

### MTN MoMo (Collections)

| Document | Required |
|----------|----------|
| D1 Certificate of Incorporation | **Required** |
| D2 Memorandum & Articles | **Required** |
| D3 Business Registration | **Required** |
| D4 TIN certificate | **Required** |
| D5 VAT certificate | Often |
| D6 Business operating license | **Required** |
| D7 Proof of business address | **Required** |
| D8 Register of directors | **Required** |
| D9 UBO declaration | **Required** |
| D10 Director / UBO IDs | **Required** |
| D11 Board resolution | **Required** |
| D12 Corporate bank account letter | **Required** |
| D13 Audited financials | Often |
| D14 AML / CFT policy | **Required** |
| D15 KYC policy | **Required** |
| D16 Privacy policy | **Required** |
| D17 Terms of service | **Required** |
| D18 Information security policy | Often |
| D22 HTTPS callback URL (`/api/webhooks/payments/momo`) | **Required** |
| D23 Technical contact | **Required** |
| MTN merchant / Collections agreement | **Required** (MoMo-specific) |

**Also provide:** business category, estimated transaction volume, settlement account, production domain.

**Env when approved:** `PAYMENT_PROVIDER=momo`, `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_CALLBACK_URL`

---

### Cloud storage — Cloudflare R2

| Document | Required |
|----------|----------|
| D1 Certificate of Incorporation | **Required** (billing identity) |
| D3 Business Registration | **Required** |
| D4 TIN certificate | **Required** |
| D7 Proof of business address | Often |
| D10 Signatory ID | Often |
| D12 Corporate bank / card for billing | **Required** |
| D16 Privacy policy | **Required** |
| D18 Information security policy | Often |
| D20 DPA registration (Ghana) | Often (if storing personal/KYC data) |
| Cloudflare account verification | **Required** (R2-specific) |

**Use case to describe:** private KYC & financing documents, property images, signed URL access, audit logging.

**Env when approved:** `STORAGE_DRIVER=s3`, `S3_ENDPOINT` (R2), `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto`

---

### Cloud storage — AWS S3

| Document | Required |
|----------|----------|
| D1 Certificate of Incorporation | **Required** (AWS account / billing) |
| D3 Business Registration | **Required** |
| D4 TIN certificate | **Required** |
| D7 Proof of business address | Often |
| D10 Signatory ID | Often |
| D12 Corporate bank / card for billing | **Required** |
| D16 Privacy policy | **Required** |
| D18 Information security policy | Often |
| D20 DPA registration (Ghana) | Often |
| AWS account verification | **Required** (S3-specific) |

**Use case to describe:** same as R2 — private `private/kyc/*`, `private/financing/*`; public `public/properties/*`.

**Env when approved:** `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`

---

## 4. Quick comparison matrix

| Document | Arkesel SMS | Hubtel SMS | MTN MoMo | R2 | AWS S3 |
|----------|:-----------:|:----------:|:--------:|:--:|:------:|
| Certificate of Incorporation (D1) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Business Registration (D3) | ✓ | ✓ | ✓ | ✓ | ✓ |
| TIN certificate (D4) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Proof of address (D7) | ✓ | ✓ | ✓ | ○ | ○ |
| Director / signatory ID (D10) | ✓ | ✓ | ✓ | ○ | ○ |
| Board resolution (D11) | ○ | ○ | ✓ | — | — |
| UBO declaration (D9) | — | — | ✓ | — | — |
| Corporate bank letter (D12) | — | ○ | ✓ | ✓ | ✓ |
| AML / KYC policies (D14–D15) | — | — | ✓ | — | — |
| Privacy policy (D16) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Info security policy (D18) | — | — | ○ | ○ | ○ |
| Sample SMS templates (D21) | ✓ | ✓ | — | — | — |
| HTTPS callback / domain (D22) | ○ | ○ | ✓ | — | — |
| Provider-specific agreement | Sender ID | Hubtel form | MoMo merchant | Cloudflare | AWS |

**✓** = Required · **○** = Often requested · **—** = Rarely needed

---

## 5. Recommended submission order

1. **Prepare core KYB pack once** — D1, D3, D4, D7, D10, D16  
2. **SMS** (Arkesel or Hubtel) — fastest; add D21 + Sender ID  
3. **Cloud** (R2 or S3) — for KYC document storage in production  
4. **MoMo** — heaviest pack; submit when core policies and website are live  
5. **Partner Bank API** — see [bank-partner-api.md](./bank-partner-api.md) (separate bank KYB)

---

## 6. Where documents are stored internally

- Secure folder: private cloud path `private/compliance/kyb/` (see [cloud-storage-setup.md](./cloud-storage-setup.md))
- **Never** commit certificates, TIN scans, or API keys to git
- Access: admin / compliance roles only; downloads audit-logged

---

## 7. Technical setup guides (after KYB approved)

| Integration | Setup guide |
|-------------|-------------|
| Arkesel SMS | [sms-integration.md](./sms-integration.md) |
| Hubtel SMS | [sms-integration.md](./sms-integration.md) (Hubtel section) |
| MTN MoMo | [momo-integration.md](./momo-integration.md) |
| R2 / S3 | [cloud-storage-setup.md](./cloud-storage-setup.md) |
| Partner banks | [bank-partner-api.md](./bank-partner-api.md) |

---

## 8. PDF export

```bash
npm run docs:kyb-matrix-pdf
```

Output: `docs/integration-business-documents.pdf`
