# Test Data - Kolekto

Version: 1.1
Date: 2026-06-28
Status: Canonical reference

This file documents the seeded demo dataset that should be used for QA, local smoke tests, and TestSprite automation.

## 1. Canonical Dataset Purpose

Use this dataset as the default test baseline after running the seed script.

## 2. Canonical Demo Accounts

| Label | Email | Password | Role | Status | Notes |
|---|---|---|---|---|---|
| Demo Admin | admin@demo.com | password123 | OWNER | ACTIVE | Primary owner/admin account for dashboard and approval flows. |
| Demo Member | budi@demo.com | password123 | MEMBER | ACTIVE | Primary member account for payment submission flows. |
| Super Admin | admin@kolekto.local | GantiPasswordKuat123! | SUPER_ADMIN | ACTIVE | Seeded from environment variables when not overridden. |

## 3. Canonical Demo Records

| Field | Value | Notes |
|---|---|---|
| Team Name | Futsal Squad | Main seeded team used for core workflow tests. |
| Invite Code | FUTSAL2026 | Stable invite code for join-team tests. |
| Role Name | Pemain Aktif | Used for invoice generation and member assignment. |
| Account Name | Kas Utama | Team cash account for balance and transaction tests. |
| Account Type | CASH | Default account type in the seed data. |
| Invoice Code | INV-DEMO-001 | Primary invoice used for payment submission and approval tests. |
| Invoice Amount | 50000 | Seeded amount for the demo invoice. |
| Invoice Status | UNPAID | Starting state before payment submission. |

## 4. Seeded Relationship Map

- `Admin Demo` owns `Futsal Squad`.
- `Budi Santoso` is a member of `Futsal Squad`.
- Both demo users use `password123`.
- `Kas Utama` is the default team account.
- `INV-DEMO-001` is the initial unpaid invoice for Budi.

## 5. Expected Seeded State

After seeding, the database should contain:

- Users: 3
- Team: 1
- Team members: 2
- Role: 1
- Account: 1
- ContributionInvoice: 1
- ContributionPayment: 0
- Transaction: 0

## 6. Determinism Notes

Stable values:

- Demo emails
- Team invite code
- Invoice code
- Role name
- Account name

Semi-deterministic values:

- `joinedAt`
- `periodDate`
- license trial dates

Seed behavior:

- The seed uses upsert/find-first logic for the main demo records.
- Re-running the seed should not duplicate the canonical demo dataset.

## 7. How to Use This Data

### Login tests

- Use `admin@demo.com` for owner/admin flows.
- Use `budi@demo.com` for member-only flows.

### Payment approval tests

- Start from `INV-DEMO-001` with status `UNPAID`.
- Submit a payment from the member account.
- Approve or reject from the admin account.

### Duplicate prevention tests

- After one active payment exists, try to submit another payment for the same invoice.
- The second active payment should be blocked.

### Transaction history tests

- After approval, verify that a transaction record exists.
- Verify that the dashboard summary reflects the approved payment.

## 8. Missing or Unclear Data

- Dedicated reset script for tests: Unknown / Needs confirmation
- Separate demo payment record in seed: Missing
- Frozen expected balance number: Missing
- Documented live production URL: Missing in repository configuration
