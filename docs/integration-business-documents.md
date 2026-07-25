# PayForMe — Business Documents & Integrations

**Version:** 1.3  
**Purpose:** Short checklist — documents to prepare and which integrations they are for

---

## 1. Documents to prepare (once)

Submit the **same four documents** to every provider below.

| # | Document | Used for |
|---|----------|----------|
| **1** | Certificate of Incorporation | Arkesel SMS · Hubtel SMS · MTN MoMo · Cloudflare R2 |
| **2** | Business Registration certificate (RGD) | Arkesel SMS · Hubtel SMS · MTN MoMo · Cloudflare R2 |
| **3** | TIN certificate (GRA) | Arkesel SMS · Hubtel SMS · MTN MoMo · Cloudflare R2 |
| **4** | Proof of business address (utility, lease, or bank stmt ≤ 3 months) | Arkesel SMS · Hubtel SMS · MTN MoMo · Cloudflare R2 |

Scan each to PDF (e.g. `01-incorporation.pdf`) and keep copies ready for applications.

---

## 2. Integrations PayForMe uses

| Integration | Provider | What it is for |
|-------------|----------|----------------|
| **SMS** | Arkesel *(primary)* or Hubtel | OTP codes, withdrawal alerts, notifications |
| **Mobile money** | MTN MoMo | Rent payments, wallet deposits & collections |
| **Cloud storage** | Cloudflare R2 (`payforme` bucket) | KYC documents, financing files, property images |

---

## 3. At a glance

| | Arkesel SMS | Hubtel SMS | MTN MoMo | Cloudflare R2 |
|---|:---:|:---:|:---:|:---:|
| Certificate of Incorporation | ✓ | ✓ | ✓ | ✓ |
| Business Registration | ✓ | ✓ | ✓ | ✓ |
| TIN certificate | ✓ | ✓ | ✓ | ✓ |
| Proof of address | ✓ | ✓ | ✓ | ✓ |

**✓** = submit the core document pack for that integration.

---

## PDF export

```bash
npm run docs:kyb-matrix-pdf
```

Output: `docs/integration-business-documents.pdf`

For technical setup after approval, see [platform-integrations-guide.md](./platform-integrations-guide.md).
