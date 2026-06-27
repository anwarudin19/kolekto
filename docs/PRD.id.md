# PRD - Kolekto

Version: 2.2
Date: 2026-06-28
Status: Active draft

This document is the Indonesian source of truth for the current product scope. It is based on the verified codebase and project analysis. Any item that is not clearly implemented in code is not presented as a confirmed feature.

## 1. Ringkasan Produk

Kolekto adalah aplikasi manajemen iuran tim dan invoice yang membantu owner, admin, treasurer, dan member mengelola kontribusi kas secara terpusat, terstruktur, dan dapat diaudit.

Alur inti produk saat ini:

Team -> Member -> Invoice -> Payment Submission -> Admin Approval -> Balance Update -> Transaction History

## 2. Masalah yang Diselesaikan

- Pencatatan iuran tim sering dilakukan manual di chat atau spreadsheet.
- Status invoice dan pembayaran sulit dipantau secara konsisten.
- Approval pembayaran sering tidak memiliki jejak audit yang jelas.
- Riwayat transaksi dan saldo kas sulit dipahami oleh anggota tim.

## 3. Tujuan Produk

- Menyediakan alur kerja iuran tim yang jelas dan terpusat.
- Mengurangi kesalahan pencatatan pembayaran.
- Menerapkan kontrol akses berbasis peran.
- Menyediakan riwayat transaksi yang dapat diaudit.
- Menyediakan data demo yang siap dipakai untuk testing dan hackathon.

## 4. Target Pengguna

- Owner/Admin
- Member
- Super Admin

## 5. Ruang Lingkup Rilis Saat Ini

| Area | Status | Catatan |
|---|---|---|
| Auth dan demo login | Implemented | Login, register, refresh, logout, forgot password, dan reset password tersedia. |
| Team management | Implemented | Buat tim, join tim, update tim, dan list tim tersedia. |
| Member management | Implemented | List member, invite member, dan update member tersedia. |
| Invoice management | Implemented | List invoice, generate invoice, dan update invoice tersedia. |
| Payment submission | Implemented | Member dapat submit bukti pembayaran. |
| Payment approval/rejection | Implemented | Owner/Admin/Treasurer dapat approve atau reject pembayaran. |
| Duplicate payment prevention | Implemented | Payment aktif ganda untuk invoice yang sama diblokir. |
| Balance update | Partially implemented | Balance dihitung dari transaksi, bukan dari tabel balance khusus. |
| Transaction history | Implemented | Riwayat transaksi dan expense manual tersedia. |
| Admin console | Implemented | Dashboard dan endpoint admin untuk management tersedia. |
| TestSprite readiness | Partially implemented | Demo login dan selector stabil tersedia, tetapi workflow CI masih placeholder. |

## 6. Role dan Permission

### 6.1 Owner/Admin

- Membuat dan mengelola tim.
- Mengelola member tim.
- Membuat invoice.
- Approve atau reject payment.
- Melihat dashboard dan transaksi.

### 6.2 Member

- Login ke sistem.
- Melihat invoice miliknya.
- Submit payment proof.
- Melihat riwayat pembayaran dan transaksi yang relevan.

### 6.3 Super Admin

- Mengelola area admin platform.
- Melihat data lintas tim sesuai izin sistem.

## 7. Functional Requirements

### AUTH

| ID | Requirement | Priority | Current Status |
|---|---|---|---|
| AUTH-01 | Register with email and password | Must Have | Implemented |
| AUTH-02 | Login with JWT and logout | Must Have | Implemented |
| AUTH-03 | Refresh session token | Must Have | Implemented |
| AUTH-04 | Forgot password and reset password via email token | Should Have | Implemented |
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
| INV-01 | Generate invoice for active members | Must Have | Implemented |
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
| ACC-04 | Upload proof files for expense | Should Have | Implemented |
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
2. Member joins the team or is invited by Owner/Admin.
3. Invoice is generated for members.
4. Member submits payment proof.
5. Owner/Admin approves or rejects the payment.
6. Approved payment creates a transaction record.
7. Balance and transaction history are updated or recalculated.

## 9. Business Rules

- Only active team members can access team-scoped data.
- Only the owner/admin/treasurer roles can approve or reject payments.
- A payment with active pending or approved status must not be duplicated for the same invoice.
- Invoice ownership and team membership must be validated before payment submission.
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
