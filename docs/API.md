# RentVest API Documentation

Base URL: `/api`

All authenticated endpoints require a valid session cookie (Auth.js) or Bearer JWT access token.

## Authentication

### POST `/api/auth/register`
Register a new user.

```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "fullName": "John Doe",
  "phone": "+233200000000",
  "role": "TENANT"
}
```

### POST `/api/auth/callback/credentials`
Sign in via Auth.js (use `/login` UI or NextAuth client).

## Properties

### GET `/api/properties?search=&page=1&limit=12`
List active properties (public).

### GET `/api/properties/:id`
Property details (public).

### POST `/api/properties`
Create listing (Landlord).

### GET/POST/DELETE `/api/properties/saved`
Saved properties (Tenant).

## Financing

### GET `/api/financing`
Tenant: own requests. Lender: pending requests.

### POST `/api/financing`
Create financing request (Tenant).

### POST `/api/financing/approve`
Approve and fund (Lender).

### POST `/api/financing/reject`
Reject request (Lender).

## Wallet

### GET `/api/wallet`
Balance and transaction history.

### POST `/api/wallet`
```json
{ "action": "deposit", "amount": 1000, "description": "MoMo" }
```

## Withdrawals

### GET/POST `/api/withdrawals`
List or request withdrawal (Lender, Landlord).

## Subscriptions

### GET `/api/subscriptions/plans`
Public plan listing.

### GET/POST `/api/subscriptions`
Current subscription / upgrade / cancel (Tenant).

## Messages

### GET/POST `/api/messages`
List conversations / send message.

## Notifications

### GET `/api/notifications`
Unread notifications.

### PATCH `/api/notifications`
Mark as read: `{ "id": "..." }`

## OTP

### POST `/api/otp`
```json
{ "code": "123456", "purpose": "EMAIL_VERIFY" }
```

## Admin

### GET `/api/admin/users?role=TENANT&page=1`
User list (Admin, CEO).

## Analytics

### GET `/api/analytics/ceo`
CEO dashboard metrics.

### GET `/api/admin/stats`
Admin dashboard overview stats.

### GET `/api/admin/transactions`
Transaction list and audit logs.

### GET/POST `/api/financing/installments`
Tenant repayment schedule and pay installment.

### GET `/api/messages/:conversationId`
Fetch messages for a conversation (marks as read).

### GET `/api/notifications?all=true`
All notifications (default: unread only).

## Rate Limiting

Default: 100 requests per minute per IP (Redis or in-memory).

## Error Format

```json
{
  "success": false,
  "error": { "message": "...", "code": "ERROR_CODE" }
}
```
