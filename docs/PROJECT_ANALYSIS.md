# Project Analysis - Kolekto

## 1. Executive Summary

Kolekto is a monorepo with a NestJS backend and a Next.js frontend. The core business flow is already implemented end-to-end in code: team management, member management, invoice generation, payment submission, payment approval/rejection, transaction creation, and transaction history. The project also has Prisma models, seed data, Docker files, and a TestSprite workflow for live deployment validation.

The codebase is close to being usable for production and hackathon testing, but several documentation and deployment gaps still exist:

- The frontend and backend env files still contain some stale or placeholder values.
- The TestSprite workflow exists and is configured, but the live run still depends on secrets and deployment readiness.
- README has been refreshed, but live deployment URLs still need final confirmation.
- Some balance behavior is derived from transactions instead of a dedicated balance table.

This report is based on the current repository state only. If something is not clearly visible in the code, it is marked as `Missing` or `Unknown / Needs confirmation`.

## 2. Repository Structure

This repository is a monorepo.

Main folders:

- `backend/` - NestJS API, Prisma schema, migrations, seed data, Dockerfile, backend env example.
- `web-admin/` - Next.js frontend for admin and member workflows.
- `docs/` - existing project documentation folder.
- `.github/workflows/` - GitHub Actions workflows.
- `assets/` - static project assets.
- `uploads/` - upload storage area used by the app and/or local testing.

Important root files:

- `docker-compose.yml`
- `docker-compose.override.yml`
- `.env`
- `.env.example`
- `README.md`
- `LOOP.md`
- `ENV-SETUP.md`

Config files found:

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/prisma/schema.prisma`
- `backend/.env.example`
- `backend/Dockerfile`
- `web-admin/package.json`
- `web-admin/next.config.ts`
- `web-admin/.env.local`
- `web-admin/Dockerfile`
- `.github/workflows/testsprite.yml`

Current folder structure summary:

- Backend source is under `backend/src/`.
- Frontend source is under `web-admin/app/`, `web-admin/components/`, `web-admin/hooks/`, and `web-admin/lib/`.
- Prisma schema and seed files are under `backend/prisma/`.
- GitHub Actions is present, but only one workflow file is visible.

## 3. Backend Analysis

Backend framework:

- NestJS 10

Package manager:

- `pnpm` for backend

Evidence:

- `backend/package.json`
- `backend/Dockerfile`

Main backend modules:

- Auth
- Users
- Teams
- Members
- Invitations
- Roles
- Plans
- Licenses
- Accounts
- Invoices
- Payments
- Transactions
- Transaction categories
- Admin
- Donations
- Notifications
- Audit logs
- Email templates
- Scheduler
- Uploads
- Queue
- Cache
- National holidays
- Assist

Evidence:

- `backend/src/app.module.ts`
- `backend/src/`

Controllers and routes that are currently visible:

- `GET /health` in `backend/src/app.controller.ts`
- Auth routes in `backend/src/auth/auth.controller.ts`
- Team routes in `backend/src/teams/teams.controller.ts`
- Member routes in `backend/src/members/members.controller.ts`
- Invoice routes in `backend/src/invoices/invoices.controller.ts`
- Payment routes in `backend/src/payments/payments.controller.ts`
- Transaction routes in `backend/src/transactions/transactions.controller.ts`
- Admin routes in `backend/src/admin/admin.controller.ts`

Services and key behavior:

- `backend/src/teams/teams.service.ts`
  - Creates teams.
  - Generates invite codes.
  - Lets users join teams by invite code.
  - Restores owner membership if needed.
  - Updates team data.
  - Writes audit logs.
- `backend/src/members/members.service.ts`
  - Lists members.
  - Creates team members.
  - Updates team members.
  - Restricts management to owner/admin.
- `backend/src/invoices/invoices.service.ts`
  - Lists invoices.
  - Lists member-owned invoices.
  - Generates invoices for active team members.
  - Updates invoice status.
  - Uses billing dates and due dates.
  - Supports monthly billing automation.
- `backend/src/payments/payments.service.ts`
  - Submits payment proofs.
  - Blocks duplicate active payments.
  - Approves payments.
  - Rejects payments.
  - Creates transactions when payment is approved.
  - Updates invoice status to `PAID` or `PARTIAL`.
  - Writes activity logs and audit logs.
- `backend/src/transactions/transactions.service.ts`
  - Lists transaction history.
  - Creates manual expense transactions.
  - Uploads proof files.
  - Returns signed proof URLs.
- `backend/src/accounts/accounts.service.ts`
  - Computes account balance from transactions.
  - Uses cache for balance reads.
  - Clears balance cache after writes.

Authentication flow:

- JWT-based authentication is used.
- Login, register, refresh, logout, forgot password, and reset password endpoints exist.
- `auth/me` returns the current user.
- Login is rate-limited.
- Password reset token is stored hashed in the database.

Evidence:

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/jwt.strategy.ts`

Authorization and role guard flow:

- `RolesGuard` checks global user role and team membership role.
- `TeamMembershipGuard` checks active membership for a team.
- `TeamAccessGuard` allows team access for active members and super admin.
- Super admin has bypass behavior in the role guard.

Evidence:

- `backend/src/common/guards/roles.guard.ts`
- `backend/src/common/guards/team-membership.guard.ts`
- `backend/src/common/guards/team-access.guard.ts`

Validation logic:

- Global `ValidationPipe` is enabled in `backend/src/main.ts`.
- Whitelist and forbid-non-whitelisted behavior are enabled.
- DTO validation is used in backend modules.
- Error messages are formatted through a global exception filter.

Evidence:

- `backend/src/main.ts`
- `backend/src/common/filters/all-exceptions.filter.ts`
- `backend/src/**/dto/*.ts`

Team management logic:

- Team creation exists.
- Join by invite code exists.
- Team update exists.
- Team list and team detail endpoints exist.

Member management logic:

- Team member list exists.
- Team member create exists.
- Team member update exists.
- Owner/admin restriction exists.

Invoice management logic:

- Invoice list exists.
- My invoice list exists.
- Invoice generation exists.
- Invoice update exists.
- Automatic monthly invoice generation exists.
- Invoice status values include unpaid, partial, paid, and overdue behavior in the UI and backend.

Payment submission logic:

- Members can submit payment proof files.
- Submission uses `POST /invoices/:invoiceId/payments`.
- File upload limit is enforced.

Payment approval/rejection logic:

- Approval and rejection routes exist.
- Approval and rejection are limited to owner/admin/treasurer roles.
- Approval creates a transaction record.
- Rejection stores a reason.

Duplicate payment approval prevention:

- Present.
- A second active payment for the same invoice is blocked.
- Approved or pending active payment states are checked before creating a new one.

Balance update logic:

- Partially implemented.
- There is no dedicated balance table visible in the schema.
- Balance is derived from transaction totals.
- Account balance is cached and cleared after writes.

Transaction history logic:

- Present.
- Transaction list endpoint exists.
- Expense transaction creation exists.
- Transaction attachments are supported.

Error handling patterns:

- Structured JSON error responses are returned by the global exception filter.
- Validation errors are normalized.
- Indonesian user-facing error messages are used in several places.

Health check endpoint:

- Present at `GET /health`

## 4. Frontend Analysis

Frontend framework:

- Next.js App Router

Package manager:

- `npm` for frontend

Evidence:

- `web-admin/package.json`
- `web-admin/app/`

Main routes and pages:

- Landing page
- Login
- Register
- Forgot password
- Reset password
- Dashboard
- Overview
- Accounts
- Approvals
- Audit
- Donations
- Holidays
- Invoices
- License
- Member view
- Members
- Notifications
- Reports
- Settings
- Email templates
- Super admin
- Transactions

Evidence:

- `web-admin/app/`

Layout and navigation:

- The dashboard layout blocks unauthenticated users.
- The dashboard layout redirects users without admin panel access.
- The sidebar contains team switching and role-based navigation.
- Create team and join team actions are exposed from the sidebar.

Evidence:

- `web-admin/app/(dashboard)/layout.tsx`
- `web-admin/components/layout/Sidebar.tsx`

Login page:

- Present.
- It has demo login buttons.
- It has a login submit button with a stable test id.

Evidence:

- `web-admin/app/(auth)/login/page.tsx`

Demo login:

- Present.
- Demo admin and demo member credentials are visible in the login UI.

Evidence:

- `web-admin/app/(auth)/login/page.tsx`
- `backend/prisma/seed.ts`

Dashboard page:

- Present.
- Shows balance, income, expense, member count, and invoice/payment summaries.
- Uses team-scoped data.

Evidence:

- `web-admin/app/(dashboard)/dashboard/page.tsx`

Team page:

- Missing as a dedicated route.
- Team management is done through sidebar actions and team switching, not a separate `/teams` page in the frontend structure that was inspected.

Member page:

- Present.
- Includes member listing and member invite flow.

Evidence:

- `web-admin/app/(dashboard)/members/page.tsx`

Invoice page:

- Present.
- Includes invoice listing, invoice creation, and payment submission entry points.

Evidence:

- `web-admin/app/(dashboard)/invoices/page.tsx`

Payment page:

- Missing as a dedicated page.
- Payment actions are handled from the invoice page and the approvals page.

Transaction page:

- Present.
- Shows transaction history and expense creation flow.

Evidence:

- `web-admin/app/(dashboard)/transactions/page.tsx`

Forms and validation messages:

- Team create form has visible validation messaging for empty team name.
- Login page has demo actions and submit validation behavior.
- Member invite form exists.
- Invoice creation form exists.
- Payment approval and rejection buttons exist on the approvals page.

Evidence:

- `web-admin/components/layout/Sidebar.tsx`
- `web-admin/app/(auth)/login/page.tsx`
- `web-admin/app/(dashboard)/members/page.tsx`
- `web-admin/app/(dashboard)/invoices/page.tsx`
- `web-admin/app/(dashboard)/approvals/page.tsx`

Role-based UI restrictions:

- Present.
- Dashboard layout redirects by role.
- Sidebar menu changes by role.
- Approval actions are hidden for roles that cannot manage payments.

Evidence:

- `web-admin/app/(dashboard)/layout.tsx`
- `web-admin/components/layout/Sidebar.tsx`
- `web-admin/app/(dashboard)/approvals/page.tsx`

Stable `data-testid` attributes found:

- `login-button`
- `create-team-form`
- `add-member-form`
- `create-invoice-form`
- `invoice-status`
- `submit-payment-button`
- `payment-status`
- `approve-payment-button`
- `reject-payment-button`

Evidence:

- `web-admin/app/(auth)/login/page.tsx`
- `web-admin/components/layout/Sidebar.tsx`
- `web-admin/app/(dashboard)/members/page.tsx`
- `web-admin/app/(dashboard)/invoices/page.tsx`
- `web-admin/app/(dashboard)/approvals/page.tsx`

Important UI flows that are testable:

- Login with demo admin.
- Login with demo member.
- Create team.
- Join team by code.
- Invite member.
- Create invoice.
- Submit payment proof.
- Approve payment.
- Reject payment.
- View transaction history.

## 5. Database and Prisma Analysis

Prisma schema:

- Present.
- Schema file exists at `backend/prisma/schema.prisma`.
- Migrations folder is present.

Important models:

- `User`
- `Team`
- `TeamMember`
- `Role`
- `TeamInvitation`
- `Account`
- `ContributionInvoice`
- `ContributionPayment`
- `Transaction`
- `TransactionAttachment`
- `Donation`
- `Plan`
- `OwnerLicense`
- `LicensePayment`
- `Notification`
- `ActivityLog`
- `AuditLog`
- `EodRun`
- `InvoiceReminder`
- `EmailTemplate`
- `EmailLog`
- `NationalHoliday`
- `TransactionCategory`

Key relationships:

- A `User` can own teams, join teams, create invoices, submit payments, and create transactions.
- A `Team` has many members, roles, accounts, invoices, payments, transactions, invitations, donations, and categories.
- A `TeamMember` links a user to a team and stores system role and member status.
- A `Role` belongs to a team and can drive invoice fee logic.
- A `ContributionInvoice` belongs to a team and user and has many payments and reminders.
- A `ContributionPayment` belongs to an invoice, team, user, and account, and can store approved or rejected by information.
- A `Transaction` belongs to a team, account, optional category, and creator user, and can have attachments.

User/account model:

- `User` is the core identity model.
- `Account` belongs to a team and is used to calculate balances and store cash flow.

Team model:

- Present.
- Contains owner, invite code, and status fields.

Member model:

- Present.
- Implemented through `TeamMember`.

Role/permission model:

- Present.
- `SystemRole` and `Role` both exist.
- Team role and system role are both used in access control.

Invoice model:

- Present as `ContributionInvoice`.
- Includes status, due date, period date, invoice code, team, user, and role data.
- There is a unique invoice code.
- There is also a unique constraint for team, user, and period date.

Payment model:

- Present as `ContributionPayment`.
- Includes invoice, team, user, account, status, proof data, and approval/rejection metadata.

Transaction model:

- Present.
- Tracks income and expense transactions.
- Supports source and attachment data.

Balance-related field or table:

- No dedicated balance table was found.
- Balance appears to be derived from transaction sums.
- Account balance is cached in the backend.

Indexes and unique constraints:

- `User.email` is unique.
- `Team.inviteCode` is unique.
- `TeamMember` has a unique `[teamId, userId]`.
- `TeamInvitation.inviteCode` is unique.
- `ContributionInvoice.invoiceCode` is unique.
- `ContributionInvoice` has a unique `[teamId, userId, periodDate]`.
- `ContributionPayment` has useful indexes on invoice and team status fields.
- `Transaction` has indexes for team, account, category, and created date fields.
- `TransactionAttachment` is indexed by transaction.
- `InvoiceReminder` is unique by invoice, user, and reminder type.

Migration status:

- A migrations folder exists.
- Whether every target environment has already run all migrations is `Unknown / Needs confirmation`.

## 6. Seed Data Analysis

Seed file:

- Present at `backend/prisma/seed.ts`

Demo admin account:

- Present.
- Seed uses a super admin account from env variables.
- Default values are visible in the seed file.

Demo member account:

- Present.
- `budi@demo.com` with password `password123` is seeded as a demo member.

Demo team:

- Present.
- Team name is `Futsal Squad`.
- Invite code is `FUTSAL2026`.

Demo invoice:

- Present.
- Invoice code is `INV-DEMO-001`.
- It is seeded for the demo member.

Demo payment:

- Missing in the seed file.
- The invoice starts as unpaid, so automated approval and rejection testing will create payments during the test run.

Expected starting balance:

- No fixed starting balance record was found.
- Balance depends on seeded accounts and transactions.

Deterministic behavior:

- Partially deterministic.
- Key demo identities, team code, and invoice code are fixed.
- Some timestamps use `new Date()`, so exact date values can vary.

Suitability for TestSprite:

- Good enough for current demo login and invoice/payment workflows.
- Better if a dedicated reset seed or documented canonical test dataset is added later.

## 7. Environment and Docker Analysis

`.env.example` files:

- Root `.env.example` exists.
- `backend/.env.example` exists.
- `web-admin/.env.local` exists as a local file, but it is not a committed example file.

Required backend environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_FRONTEND_URL`
- `APP_WEB_URL` or related web URL setting
- PostgreSQL variables
- Redis variables
- Queue variables
- MinIO variables
- Upload limit variables
- SMTP variables
- Owner license and billing variables

Evidence:

- `backend/.env.example`
- `backend/src/common/utils/env.validation.ts`

Required frontend environment variables:

- `NEXT_PUBLIC_API_URL`

Evidence:

- `web-admin/.env.local`
- `web-admin/package.json`
- `web-admin/lib/api.ts`

Docker compose services:

- `api`
- `web`
- `postgres`
- `minio`
- `minio-init`
- `redis`

Evidence:

- `docker-compose.yml`

PostgreSQL configuration:

- Present.
- PostgreSQL is used by the backend and compose stack.

Redis configuration:

- Present.
- Redis is used for cache, rate limiting, and queue-related work.

MinIO/file storage configuration:

- Present.
- File storage and proof uploads use MinIO-related configuration.

MinIO required or optional:

- In the current compose and env design, MinIO is treated as required for file upload and proof URL flows.

Coolify/VPS readiness:

- Partially ready.
- Docker files are present.
- Backend has a health endpoint.
- Compose includes the required dependencies.
- Missing piece: production env values, secrets, and final host routing need confirmation.

Vercel readiness:

- Partially ready.
- The frontend is a standalone Next.js app.
- It uses `NEXT_PUBLIC_API_URL`, which is good for Vercel.
- Missing piece: production backend URL must be set correctly.

Likely production domains needed:

- Frontend URL
- Backend API URL

Current config notes:

- The current repo uses `web-admin`, not `admin-web`.
- `web-admin/.env.local` still contains a stale `v2` note and `NEXT_PUBLIC_BASE_PATH=/v2`.
- That stale local config should not be treated as the current production setup.

## 8. GitHub Actions and CI Analysis

`.github/workflows` exists:

- Yes

Existing workflows:

- `testsprite.yml`

Evidence:

- `.github/workflows/testsprite.yml`

Backend build checked:

- Missing in GitHub Actions
- There is no visible workflow job that builds the backend and fails on compile errors.

Frontend build checked:

- Missing in GitHub Actions
- There is no visible workflow job that builds the frontend and fails on compile errors.

TestSprite integrated:

- Partially integrated
- The workflow file exists.
- The actual TestSprite run command is still commented out or placeholder-based.

Workflow triggers:

- `push` to `main` - present
- `pull_request` to `main` - present
- `feature/kolekto-core` - missing
- `workflow_dispatch` - missing

Missing CI/CD pieces:

- Build jobs for backend and frontend.
- A real TestSprite run command with real project ID and deployed URL.
- Manual trigger for running TestSprite after production deploy.
- Optional branch coverage for `feature/kolekto-core`.

Recommended safe CI flow:

- Build check on `feature/kolekto-core`.
- Build check on `main`.
- Optional TestSprite run only after the live URL is available.
- Add a manual `workflow_dispatch` option for production verification.

## 9. Business Flow Coverage

| Flow Step | Status | Evidence/File Reference | Notes |
|---|---|---|---|
| Team | Implemented | `backend/src/teams/teams.controller.ts`, `backend/src/teams/teams.service.ts`, `web-admin/components/layout/Sidebar.tsx` | Team create, join, update, and switch are present. |
| Member | Implemented | `backend/src/members/members.controller.ts`, `backend/src/members/members.service.ts`, `web-admin/app/(dashboard)/members/page.tsx` | Team member list and invite flow exist. |
| Invoice | Implemented | `backend/src/invoices/invoices.controller.ts`, `backend/src/invoices/invoices.service.ts`, `web-admin/app/(dashboard)/invoices/page.tsx` | Invoice list, create, and update exist. |
| Payment Submission | Implemented | `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts`, `web-admin/app/(dashboard)/invoices/page.tsx` | Member payment proof submission exists. |
| Admin Approval | Implemented | `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts`, `web-admin/app/(dashboard)/approvals/page.tsx` | Approve and reject actions exist. |
| Balance Update | Partially implemented | `backend/src/payments/payments.service.ts`, `backend/src/accounts/accounts.service.ts` | Balance is derived from transactions, not stored in a dedicated balance table. |
| Transaction History | Implemented | `backend/src/transactions/transactions.controller.ts`, `backend/src/transactions/transactions.service.ts`, `web-admin/app/(dashboard)/transactions/page.tsx` | Transaction history and manual expense creation are present. |

## 10. Role and Permission Coverage

| Permission | Status | Evidence/File Reference | Notes |
|---|---|---|---|
| Owner/Admin can manage team | Implemented | `backend/src/common/guards/roles.guard.ts`, `backend/src/teams/teams.controller.ts`, `backend/src/teams/teams.service.ts` | Team update and membership logic are protected. |
| Owner/Admin can manage members | Implemented | `backend/src/common/guards/roles.guard.ts`, `backend/src/members/members.service.ts` | Service checks owner/admin before member management. |
| Owner/Admin can create invoices | Implemented | `backend/src/invoices/invoices.controller.ts`, `backend/src/invoices/invoices.service.ts` | Invoice generation is team-scoped and protected. |
| Member can submit payment | Implemented | `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts` | Payment submission is tied to invoice ownership and membership. |
| Owner/Admin can approve payment | Implemented | `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts` | Payment approval allows OWNER, ADMIN, and TREASURER. |
| Owner/Admin can reject payment | Implemented | `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts` | Rejection uses the same role gate as approval. |
| Member cannot approve/reject payment | Implemented | `backend/src/payments/payments.service.ts`, `web-admin/app/(dashboard)/approvals/page.tsx` | UI hides actions and backend blocks unauthorized roles. |
| UI-level role guard exists | Implemented | `web-admin/app/(dashboard)/layout.tsx`, `web-admin/components/layout/Sidebar.tsx` | The frontend redirects and hides menus based on role. |
| API-level role guard exists | Implemented | `backend/src/common/guards/roles.guard.ts`, `backend/src/common/guards/team-membership.guard.ts`, `backend/src/common/guards/team-access.guard.ts` | Backend enforcement is present. |

## 11. TestSprite Readiness

| Requirement | Status | Notes |
|---|---|---|
| Live URL config or placeholder exists | Partially ready | Placeholders exist in README and workflow; production URL still needs to be finalized. |
| Demo login exists | Ready | Admin and member demo buttons are present on the login page. |
| Demo credentials exist | Ready | Demo credentials are seeded in `backend/prisma/seed.ts`. |
| Deterministic seed data exists | Partially ready | Fixed team and invoice codes exist, but some timestamps are dynamic. |
| Stable `data-testid` selectors exist | Ready | Key flows already expose test IDs for login, team, member, invoice, and approval actions. |
| Clear validation errors exist | Partially ready | Core validations exist, but not every form was verified end-to-end. |
| Critical business flows are accessible from UI | Ready | Login, team, member, invoice, approval, and transaction pages exist. |
| README explains how to run the app | Ready | The README now covers the current repo structure, local run commands, and deployment notes. |
| README explains how to test the app | Ready | The README now points to the live URL requirement, demo data, and TestSprite workflow. |
| LOOP.md exists or needs to be created | Ready | `LOOP.md` already exists. |
| docs folder exists or needs to be created | Ready | `docs/` already exists. |
| Test plan exists or needs to be created | Missing | No dedicated `TEST_PLAN.md` was created yet. |
| GitHub Actions exists or needs to be created | Ready | A workflow file exists, but it still needs real build and TestSprite steps. |

## 12. Current Testable Scenarios

TC001: Admin demo login

- Status: Ready
- Evidence: `web-admin/app/(auth)/login/page.tsx`, `backend/prisma/seed.ts`
- Notes: Demo admin button and seeded admin account exist.

TC002: Member demo login

- Status: Ready
- Evidence: `web-admin/app/(auth)/login/page.tsx`, `backend/prisma/seed.ts`
- Notes: Demo member button and seeded member account exist.

TC003: Create team

- Status: Ready
- Evidence: `web-admin/components/layout/Sidebar.tsx`, `backend/src/teams/teams.controller.ts`, `backend/src/teams/teams.service.ts`
- Notes: Create team form and API exist.

TC004: Empty team name validation

- Status: Ready
- Evidence: `web-admin/components/layout/Sidebar.tsx`
- Notes: The create-team form shows a required-field message for empty team name.

TC005: Join team by invite code

- Status: Ready
- Evidence: `web-admin/components/layout/Sidebar.tsx`, `backend/src/teams/teams.controller.ts`, `backend/src/teams/teams.service.ts`
- Notes: Join team flow exists through invite code handling.

TC006: Add member

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/members/page.tsx`, `backend/src/members/members.controller.ts`, `backend/src/members/members.service.ts`
- Notes: Member invite/create flow exists for owner/admin.

TC007: Create invoice

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/invoices/page.tsx`, `backend/src/invoices/invoices.controller.ts`, `backend/src/invoices/invoices.service.ts`
- Notes: Create invoice flow is present.

TC008: Reject invoice amount 0

- Status: Unknown / Needs confirmation
- Evidence: `backend/src/invoices/dto/`, `web-admin/app/(dashboard)/invoices/page.tsx`
- Notes: Validation likely exists, but this exact case was not fully confirmed from the inspected code.

TC009: Submit payment

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/invoices/page.tsx`, `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts`
- Notes: Payment proof submission is implemented.

TC010: Approve payment

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/approvals/page.tsx`, `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts`
- Notes: Approve action exists in UI and backend.

TC011: Reject payment

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/approvals/page.tsx`, `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.ts`
- Notes: Reject action exists in UI and backend.

TC012: Prevent duplicate payment approval

- Status: Ready
- Evidence: `backend/src/payments/payments.service.ts`
- Notes: Active duplicate payment creation is blocked and approval requires pending status.

TC013: Member cannot approve payment

- Status: Ready
- Evidence: `backend/src/payments/payments.service.ts`, `web-admin/app/(dashboard)/approvals/page.tsx`
- Notes: Backend role checks and frontend button gating both exist.

TC014: Verify invoice status after approval

- Status: Ready
- Evidence: `backend/src/payments/payments.service.ts`
- Notes: Approval updates invoice status to `PAID` or `PARTIAL`.

TC015: Verify balance update after approval

- Status: Partially ready
- Evidence: `backend/src/payments/payments.service.ts`, `backend/src/accounts/accounts.service.ts`
- Notes: Balance is derived from transactions and cache, not a dedicated balance table.

TC016: Verify transaction history after approval

- Status: Ready
- Evidence: `backend/src/payments/payments.service.ts`, `backend/src/transactions/transactions.controller.ts`, `backend/src/transactions/transactions.service.ts`
- Notes: Approved payments create transaction records.

TC017: View transaction list

- Status: Ready
- Evidence: `web-admin/app/(dashboard)/transactions/page.tsx`
- Notes: Transaction history is visible in the UI.

## 13. Recommended Missing Test Cases

- Login with wrong password.
- Logout and verify session is cleared.
- Password reset request and reset flow.
- Unauthorized access to admin pages.
- Member access to approval buttons should stay hidden.
- Submit payment with missing proof file.
- Submit payment with oversized proof file.
- Submit duplicate payment for the same invoice.
- Approve already approved payment.
- Reject already rejected payment.
- Create expense transaction with attachment upload.
- Verify balance cache refresh after payment approval.
- Verify invoice generation for multiple active members.
- Verify join team with invalid invite code.
- Verify team list visibility by role.

## 14. Gap Analysis

| Area | Current Status | Risk | Recommended Action | Priority |
|---|---|---|---|---|
| Auth/demo login | Partially ready | Placeholders and env mismatch can break first-run testing | Finalize production env values and document the live login path | High |
| Team management | Implemented | Low, but needs regression coverage | Add create/join/update tests | High |
| Member management | Implemented | Permission regressions could block admin work | Add positive and negative permission tests | High |
| Invoice management | Implemented | Billing rules can regress silently | Add tests for status, due date, and monthly generation | High |
| Payment submission | Implemented | File upload errors can break the main flow | Add upload validation and duplicate submission tests | High |
| Payment approval | Implemented | Approval/reject flow is business-critical | Add full E2E coverage for approve/reject | High |
| Duplicate approval prevention | Implemented | Duplicate payout bugs are high impact | Keep a dedicated regression test | High |
| Role guard | Implemented | Access leaks are high impact | Add API and UI guard tests | High |
| Dashboard summary | Partially implemented | Derived values can drift if transaction math changes | Add deterministic seed-based assertions | Medium |
| Transaction history | Implemented | History can become inconsistent with approval flow | Add approval-to-transaction assertions | Medium |
| Seed data | Partially ready | Dynamic dates can cause flaky tests | Freeze canonical test data and document reset rules | High |
| data-testid selectors | Partially ready | Missing selectors reduce automation stability | Add more stable selectors for critical forms | Medium |
| README | Ready | Clear onboarding docs exist; keep them synced with deployment changes | Keep the README aligned with future deployment updates | Low |
| PRD documentation | Ready | Split source-of-truth files exist | Keep the index and language files synchronized | Low |
| Test plan documentation | Ready | Execution-focused test plan exists | Update it when flows or selectors change | Low |
| Test data documentation | Ready | Canonical seeded dataset file exists | Re-run seed if demo data changes | Low |
| LOOP.md | Ready | Current loop notes are updated | Keep it aligned with future documentation changes | Low |
| GitHub Actions | Partially ready | CI does not yet validate builds or live tests | Add backend/frontend build jobs and optional TestSprite run | High |
| Coolify deployment readiness | Partially ready | Secrets, volumes, and service wiring need validation | Validate Docker env, health, MinIO, Redis, and DB settings | High |
| Vercel deployment readiness | Partially ready | Frontend deploy can fail if API URL is wrong | Set production API URL and test build output | High |
| TestSprite readiness | Partially ready | Live URL and workflow are still placeholders | Finalize seed data, selectors, workflow, and deployed URL | High |

## 15. Documentation Inputs

Use the following facts later when creating each document or workflow.

`README.md`

- Project purpose and roles.
- Local setup for backend and frontend.
- Docker compose commands.
- Required environment variables.
- Demo credentials.
- Build and run commands.
- TestSprite notes and live URL instructions.

`docs/PRD.md` index file, `docs/PRD.id.md`, and `docs/PRD.en.md`

- Actual implemented scope only.
- Roles and permissions.
- Team, member, invoice, payment, and transaction flows.
- Out-of-scope items.
- Acceptance criteria for each business flow.

`docs/TEST_PLAN.md`

- Test scenarios from this analysis.
- Preconditions and postconditions.
- Expected UI selectors and API outcomes.
- Positive and negative coverage.
- Browser/environment requirements.

`docs/TEST_DATA.md`

- Demo admin account.
- Demo member account.
- Demo team and invite code.
- Demo invoice data.
- Known account records.
- Reset or reseed instructions.

`LOOP.md`

- Iteration log for implementation and test cycles.
- Problems found.
- Fixes applied.
- TestSprite failures and reruns.
- Remaining gaps after each loop.

`.github/workflows/testsprite.yml`

- Trigger rules for `main`, `feature/kolekto-core`, and `workflow_dispatch`.
- Build steps before TestSprite.
- Real TestSprite project ID and deployed URL.
- Secret wiring for API key.
- Optional manual run after production deploy.

## 16. Recommended Next Steps

1. Clean stale local config and placeholder values.
2. Rewrite `README.md` so it matches the current `web-admin` layout, current env names, and real run commands.
3. Create `docs/TEST_PLAN.md` and `docs/TEST_DATA.md` from the verified flows and seed records in this report.
4. Replace the placeholder GitHub Actions workflow with real backend and frontend build checks, then add optional TestSprite execution on live deploy.
5. Freeze a deterministic test dataset for TestSprite and document the exact demo credentials, team, invoice, and expected transaction states.





