# PRD - Kolekto

Version: 2.2
Date: 2026-06-28
Status: Active draft

This document is the English source of truth for the current product scope. It is based on the verified codebase and project analysis. Any item that is not clearly implemented in code is not presented as a confirmed feature.

## 1. Product Summary

Kolekto is a team contribution and invoice management application that helps owners, admins, treasurers, and members manage cash contributions in a centralized, structured, and auditable way.

Current core flow:

Team -> Member -> Invoice -> Payment Submission -> Admin Approval -> Balance Update -> Transaction History

## 2. Problem Statement

- Team dues are often tracked manually in chat or spreadsheets.
- Invoice and payment status are difficult to monitor consistently.
- Payment approval often lacks a clear audit trail.
- Team members cannot easily understand balances and transaction history.

## 3. Product Goals

- Provide a clear and centralized contribution workflow.
- Reduce payment tracking mistakes.
- Enforce role-based access control.
- Keep auditable transaction history.
- Provide demo data that is ready for testing and hackathon use.

## 4. Target Users

- Owner/Admin
- Member
- Super Admin

## 5. Current Release Scope

| Area | Status | Notes |
|---|---|---|
| Auth and demo login | Implemented | Login, register, refresh, logout, forgot password, and reset password are available. |
| Team management | Implemented | Create team, join team, update team, and list teams are available. |
| Member management | Implemented | List members, invite members, and update members are available. |
| Invoice management | Implemented | Invoice listing, invoice generation, and invoice update are available. |
| Payment submission | Implemented | Members can submit payment proofs. |
| Payment approval/rejection | Implemented | Owner/Admin/Treasurer can approve or reject payments. |
| Duplicate payment prevention | Implemented | Duplicate active payment creation for the same invoice is blocked. |
| Balance update | Partially implemented | Balance is derived from transactions, not from a dedicated balance table. |
| Transaction history | Implemented | Transaction history and manual expense flow are available. |
| Admin console | Implemented | Dashboard and admin management endpoints exist. |
| TestSprite readiness | Partially implemented | Demo login and stable selectors exist, but the CI workflow is still placeholder-based. |

## 6. Roles and Permissions

### 6.1 Owner/Admin

- Create and manage teams.
- Manage team members.
- Create invoices.
- Approve or reject payments.
- View dashboard and transactions.

### 6.2 Member

- Log in to the system.
- View own invoices.
- Submit payment proof.
- View relevant payment and transaction history.

### 6.3 Super Admin

- Manage platform admin areas.
- View cross-team data where system permissions allow it.

## 7. Functional Requirements

### AUTH

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| AUTH-01 | Register with email and password | Must Have | Implemented |
| AUTH-02 | Login with JWT and logout | Must Have | Implemented |
| AUTH-03 | Refresh session token | Must Have | Implemented |
| AUTH-04 | Forgot password and reset password by email token | Should Have | Implemented |
| AUTH-05 | Rate limit login and reset endpoints | Must Have | Implemented |

### TEAM

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| TEAM-01 | Create team | Must Have | Implemented |
| TEAM-02 | Join team by invite code | Must Have | Implemented |
| TEAM-03 | Update team | Must Have | Implemented |
| TEAM-04 | List teams per user | Must Have | Implemented |

### MEMBER

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| MEMBER-01 | Invite/add member | Must Have | Implemented |
| MEMBER-02 | Update member role/status | Must Have | Implemented |
| MEMBER-03 | List team members | Must Have | Implemented |

### INVOICE

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| INV-01 | Generate invoices for active members | Must Have | Implemented |
| INV-02 | List invoices | Must Have | Implemented |
| INV-03 | View own invoice list for members | Must Have | Implemented |
| INV-04 | Update invoice status | Must Have | Implemented |
| INV-05 | Support monthly billing automation | Should Have | Implemented |

### PAYMENT

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| PAY-01 | Submit payment proof | Must Have | Implemented |
| PAY-02 | Approve payment | Must Have | Implemented |
| PAY-03 | Reject payment | Must Have | Implemented |
| PAY-04 | Prevent duplicate active payment submission | Must Have | Implemented |
| PAY-05 | Create transaction after approval | Must Have | Implemented |

### ACCOUNT AND TRANSACTION

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| ACC-01 | Maintain team accounts | Must Have | Implemented |
| ACC-02 | Compute account balance from transactions | Must Have | Partially implemented |
| ACC-03 | Create manual expense transaction | Must Have | Implemented |
| ACC-04 | Upload proof files for expenses | Should Have | Implemented |
| ACC-05 | List transaction history | Must Have | Implemented |

### ADMIN AND SUPPORT

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| ADM-01 | Admin dashboard | Should Have | Implemented |
| ADM-02 | Admin management of users, teams, invoices, and approvals | Should Have | Implemented |
| ADM-03 | Audit logs and notification support | Should Have | Implemented |
| SUP-01 | Plans, licenses, email templates, and scheduler support | Should Have | Implemented |

## 8. Product Flow

1. Owner/Admin creates a team.
2. A member joins the team or is invited by Owner/Admin.
3. An invoice is generated for members.
4. The member submits payment proof.
5. Owner/Admin approves or rejects the payment.
6. An approved payment creates a transaction record.
7. Balance and transaction history are updated or recalculated.

## 9. Business Rules

- Only active team members can access team-scoped data.
- Only owner/admin/treasurer roles can approve or reject payments.
- A payment with active pending or approved status must not be duplicated for the same invoice.
- Invoice ownership and team membership must be verified before payment submission.
- Account balance is derived from transaction records.

## 10. Non-Functional Requirements

- JWT-based authentication.
- Validation on API input.
- Role-based access control on API and UI.
- File upload support for payment proof and expense proof.
- Docker-based deployment support.
- Health check endpoint for production monitoring.
- Stable `data-testid` attributes for automated testing.

## 11. Deployment Assumptions

- Backend target: Coolify or VPS using Docker.
- Frontend target: Vercel or Coolify.
- Main branch: `main`.
- Development branch: `feature/kolekto-core`.
- TestSprite should run from GitHub Actions after the live URL is available.

## 12. Open Questions / Needs Confirmation

- Dedicated balance table or final balance strategy: Unknown / Needs confirmation.
- Final production backend URL: Unknown / Needs confirmation.
- Final production frontend URL: Unknown / Needs confirmation.
- Final TestSprite command and project ID: Unknown / Needs confirmation.
- Whether the current local `v2` config is still required: Missing in current production setup.

## 13. Hackathon Release Note

Kolekto is already suitable for a hackathon demo because the core business flow is implemented and demo users exist. The remaining work is mainly documentation cleanup, deployment readiness, CI hardening, and test automation.
