# Test Plan - Kolekto

Version: 2.0
Date: 2026-06-28
Status: Draft

## 1. Purpose

This test plan defines the current verification scope for Kolekto based on the implemented codebase. It is intended for QA, TestSprite, and release validation on the live deployment.

## 2. Test Objectives

- Verify the core business flow from team creation to transaction history.
- Verify role-based access for Owner/Admin and Member.
- Verify seeded demo login and deterministic demo data.
- Verify payment approval, rejection, and duplicate prevention behavior.
- Verify stable selectors for automation.
- Verify the app can be tested against the live frontend URL, not localhost.

## 3. Test Strategy

### 3.1 Smoke Tests

Used to confirm that the most important user journeys still work after deploy.

- Demo admin login
- Demo member login
- Dashboard load
- Team creation
- Invoice creation
- Payment submission
- Payment approval
- Transaction history

### 3.2 Functional Tests

Used to validate the main feature flows in more detail.

- Team management
- Member management
- Invoice management
- Payment workflow
- Transaction workflow
- Role-based UI restrictions

### 3.3 Negative Tests

Used to confirm that invalid actions are rejected.

- Empty team name validation
- Missing payment proof validation
- Duplicate payment prevention
- Member approval restriction
- Invalid invoice amount validation if present in runtime

### 3.4 Regression Tests

Used to confirm that a fix did not break core flows.

- Approval updates invoice status
- Approval creates transaction history
- Balance summary changes after approved payment
- Logout clears session

### 3.5 Automation Tests

Used for TestSprite and GitHub Actions.

- Stable `data-testid` selectors
- Demo account login buttons
- Live URL reachability check
- Role-gated approval actions

## 4. Test Environment Assumptions

- Frontend is deployed on the live URL configured in `TESTSPRITE_TARGET_URL`.
- Backend API is reachable from the frontend through `NEXT_PUBLIC_API_URL`.
- Seed data has already been loaded into the database.
- Test execution uses a Chromium-like desktop browser.
- Live deployments may take several minutes to become reachable after merge to `main`.

## 5. Canonical Test Data

Use the seeded demo dataset documented in `docs/TEST_DATA.md`.

Minimum required records:

- Admin demo account: `admin@demo.com` / `password123`
- Member demo account: `budi@demo.com` / `password123`
- Team: `Futsal Squad`
- Invite code: `FUTSAL2026`
- Account: `Kas Utama`
- Invoice: `INV-DEMO-001`

## 6. Stable UI Selectors

Preferred selectors for automation:

- `login-button`
- `create-team-form`
- `add-member-form`
- `create-invoice-form`
- `invoice-status`
- `submit-payment-button`
- `payment-status`
- `approve-payment-button`
- `reject-payment-button`

## 7. Recommended Execution Order

1. Verify the live app is reachable.
2. Log in as demo admin.
3. Log in as demo member.
4. Create a team and verify required-field validation.
5. Add a member and verify the list refreshes.
6. Create an invoice and verify the list reflects it.
7. Submit payment proof as member.
8. Approve payment as admin.
9. Verify invoice status and transaction history after approval.
10. Verify duplicate payment prevention.
11. Verify member approval restriction.
12. Run the rejection path for a pending payment if data is available.

## 8. Execution Checklist

Before running the suite:

- Confirm the live frontend URL is reachable.
- Confirm `NEXT_PUBLIC_API_URL` points to the production API.
- Confirm seed data is loaded.
- Confirm the browser session starts from a clean state.
- Confirm TestSprite secrets are available in GitHub Actions.

During the run:

- Prefer stable `data-testid` selectors.
- Avoid localhost URLs.
- Do not expose secrets in logs.
- Keep the run focused on the verified core flow.

After the run:

- Record the first failing step.
- Note whether the issue is UI, API, seed data, or deployment related.
- Log the invoice/payment state that was expected and the state that was observed.

## 9. Detailed Test Scenarios


### AUTH-001 - Demo Admin Login

- Priority: High
- Type: Smoke
- Preconditions: Seed data exists and login page is reachable.
- Steps:
  1. Open the login page.
  2. Click the demo admin button.
  3. Click the login button.
- Expected result:
  - User logs in successfully.
  - Dashboard is visible.
  - Admin-scoped navigation is available.

### AUTH-002 - Demo Member Login

- Priority: High
- Type: Smoke
- Preconditions: Seed data exists and login page is reachable.
- Steps:
  1. Open the login page.
  2. Click the demo member button.
  3. Click the login button.
- Expected result:
  - User logs in successfully.
  - Member-scoped pages are accessible.
  - Approval actions are hidden or blocked.

### AUTH-003 - Logout Clears Session

- Priority: Medium
- Type: Regression
- Preconditions: User is logged in.
- Steps:
  1. Open the user menu or logout action.
  2. Trigger logout.
  3. Refresh the page.
- Expected result:
  - Session is cleared.
  - User is redirected back to login.

### TEAM-001 - Create Team

- Priority: High
- Type: Functional
- Preconditions: User is logged in as Owner/Admin.
- Steps:
  1. Open the create team form from the sidebar.
  2. Enter a valid team name.
  3. Submit the form.
- Expected result:
  - Team is created successfully.
  - Team appears in the team list or selector.

### TEAM-002 - Empty Team Name Validation

- Priority: High
- Type: Negative
- Preconditions: Create team form is open.
- Steps:
  1. Leave the team name empty.
  2. Submit the form.
- Expected result:
  - Validation message appears.
  - Team is not created.

### TEAM-003 - Join Team by Invite Code

- Priority: Medium
- Type: Functional
- Preconditions: A valid invite code exists.
- Steps:
  1. Open the join team flow.
  2. Enter the invite code `FUTSAL2026`.
  3. Submit the form.
- Expected result:
  - User joins the team successfully.
  - Team membership is reflected in the UI.

### MEMBER-001 - Add Member

- Priority: High
- Type: Functional
- Preconditions: User is logged in as Owner/Admin and a team is active.
- Steps:
  1. Open the add member form.
  2. Enter member details.
  3. Submit the form.
- Expected result:
  - Member is added to the team.
  - Member list updates.

### MEMBER-002 - Member List Visibility

- Priority: Medium
- Type: Functional
- Preconditions: Team has at least one member.
- Steps:
  1. Open the members page.
  2. Inspect the list and filters.
- Expected result:
  - Member records are visible.
  - Search and status filters behave normally.

### MEMBER-003 - Non-Admin Cannot Manage Members

- Priority: High
- Type: Security
- Preconditions: User is logged in as Member.
- Steps:
  1. Open the members page.
  2. Try to access add or edit actions.
- Expected result:
  - Management controls are hidden or blocked.
  - Backend rejects unauthorized attempts if any are triggered.

### INV-001 - Create Invoice

- Priority: High
- Type: Functional
- Preconditions: User is logged in as Owner/Admin and a team is active.
- Steps:
  1. Open the create invoice form.
  2. Fill in the invoice data.
  3. Submit the form.
- Expected result:
  - Invoice is created successfully.
  - Invoice appears in the invoice list.

### INV-002 - Invoice List Loads

- Priority: High
- Type: Smoke
- Preconditions: Team has invoices.
- Steps:
  1. Open the invoices page.
  2. Check the invoice list and status badges.
- Expected result:
  - Invoices load without error.
  - Status badges render correctly.

### INV-003 - Invoice Status Updates After Approval

- Priority: High
- Type: Regression
- Preconditions: A payment has been approved.
- Steps:
  1. Approve a pending payment.
  2. Open the invoice list or invoice detail.
- Expected result:
  - Invoice status updates to `PAID` or `PARTIAL`.

### INV-004 - Invalid Invoice Amount Handling

- Priority: Medium
- Type: Negative
- Preconditions: Create invoice form is open.
- Steps:
  1. Enter an invalid amount such as `0` or another non-allowed value.
  2. Submit the form.
- Expected result:
  - Form or API rejects the invalid amount.
  - If runtime validation is not present, this case should be marked `Needs confirmation`.

### PAY-001 - Submit Payment Proof

- Priority: High
- Type: Functional
- Preconditions: User is logged in as Member and an unpaid invoice exists.
- Steps:
  1. Open the invoice payment flow.
  2. Attach or provide the proof field value required by the UI.
  3. Submit the payment.
- Expected result:
  - Payment submission succeeds.
  - Payment appears in the admin approvals list.

### PAY-002 - Submit Payment Without Proof

- Priority: High
- Type: Negative
- Preconditions: Payment form is open.
- Steps:
  1. Leave the proof input empty.
  2. Submit the payment.
- Expected result:
  - Validation blocks submission.
  - No payment is created.

### PAY-003 - Approve Payment

- Priority: High
- Type: Functional
- Preconditions: A pending payment exists and user has Owner/Admin/Treasurer access.
- Steps:
  1. Open the approvals page.
  2. Select the pending payment.
  3. Click approve.
- Expected result:
  - Payment status changes to approved.
  - Related invoice status updates.
  - Transaction history receives a new income entry.

### PAY-004 - Reject Payment

- Priority: High
- Type: Functional
- Preconditions: A pending payment exists and user has Owner/Admin/Treasurer access.
- Steps:
  1. Open the approvals page.
  2. Select the pending payment.
  3. Click reject.
  4. Enter a rejection reason if requested.
- Expected result:
  - Payment status changes to rejected.
  - No transaction is created for rejected payment.

### PAY-005 - Prevent Duplicate Payment Submission

- Priority: High
- Type: Regression
- Preconditions: An active payment already exists for the same invoice.
- Steps:
  1. Submit a first payment.
  2. Try to submit another payment for the same invoice.
- Expected result:
  - The second payment is blocked.
  - Duplicate active payment does not get created.

### PAY-006 - Member Cannot Approve Payment

- Priority: High
- Type: Security
- Preconditions: User is logged in as Member.
- Steps:
  1. Open the approvals page.
  2. Try to trigger approve or reject controls.
- Expected result:
  - Buttons are hidden or disabled.
  - Backend denies unauthorized approval attempts.

### TRX-001 - Transaction History After Approval

- Priority: High
- Type: Functional
- Preconditions: At least one payment has been approved.
- Steps:
  1. Open the transactions page.
  2. Inspect the latest records.
- Expected result:
  - A new income transaction is visible.
  - The transaction references the approved payment.

### TRX-002 - Balance Update After Approval

- Priority: Medium
- Type: Regression
- Preconditions: An approved payment exists.
- Steps:
  1. Record the balance before approval.
  2. Approve a payment.
  3. Refresh the dashboard or account summary.
- Expected result:
  - Balance or account summary reflects the new transaction.
  - Because balance is derived from transactions, the check should focus on recalculated totals.

### TRX-003 - Manual Expense Creation

- Priority: Medium
- Type: Functional
- Preconditions: User is logged in as Owner/Admin/Treasurer.
- Steps:
  1. Open the expense creation flow.
  2. Fill in expense details.
  3. Upload proof if required.
  4. Submit the expense.
- Expected result:
  - Expense transaction is created.
  - Proof attachment is stored.

### UI-001 - Role-Based Navigation

- Priority: Medium
- Type: Functional
- Preconditions: User is logged in as Member or Admin.
- Steps:
  1. Compare the sidebar menu between roles.
  2. Inspect available pages and actions.
- Expected result:
  - Menu items change based on role.
  - Member does not see admin-only approval controls.

### UI-002 - Dashboard Summary Loads

- Priority: High
- Type: Smoke
- Preconditions: User is logged in and has an active team.
- Steps:
  1. Open the dashboard.
  2. Wait for summary cards and charts to load.
- Expected result:
  - Dashboard renders without error.
  - Summary cards show team metrics.

### UI-003 - Stable Selectors Are Present

- Priority: High
- Type: Automation
- Preconditions: App is loaded.
- Steps:
  1. Inspect the login page.
  2. Inspect team, member, invoice, and approvals pages.
- Expected result:
  - Key forms and action buttons expose the expected `data-testid` values.

## 10. Pass Criteria

A test run is considered successful when:

- Demo admin and member can log in.
- Team, member, invoice, payment, and transaction flows are accessible.
- Approval updates invoice and transaction state.
- Duplicate payment prevention works.
- Member cannot approve or reject payments.
- Critical selectors remain stable.
- The live deployment is reachable before TestSprite starts.

## 11. Known Gaps

- Live URL must be configured correctly in GitHub Secrets.
- GitHub Actions still needs to be monitored after the first live run.
- Balance is derived rather than stored in a dedicated balance table.
- Some validation edge cases still need runtime confirmation.




## 12. TestSprite Execution Summary

| Item | Value | Notes |
|---|---|---|
| Primary trigger | `main` push or manual `workflow_dispatch` | Do not run TestSprite automatically on `feature/kolekto-core`. |
| Build scope | Backend + frontend | Build must pass before TestSprite starts. |
| Live target | `TESTSPRITE_TARGET_URL` | Must be the deployed frontend URL, not localhost. |
| Required secrets | `TESTSPRITE_API_KEY`, `TESTSPRITE_TARGET_URL`, `TESTSPRITE_PROJECT_ID` | Validate secret presence before running the CLI. |
| Reachability check | HTTP `200` or `302` | Wait up to about 10 minutes for Vercel/Coolify deployment. |
| Automation selector set | Stable `data-testid` values | Use the selectors listed above as the primary automation target. |
| Abort condition | Live app unreachable | Stop the run and log a deployment issue. |
| Main success signal | Demo login and core payment flow pass | If these fail, log the first failing step and observed state. |
