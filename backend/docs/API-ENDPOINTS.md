# API Endpoints

## Informasi Dasar

| Item | Nilai |
| --- | --- |
| Base URL | `http://localhost:3000` |
| Header auth | `Authorization: Bearer <jwt_token>` |
| Format body | JSON atau `multipart/form-data` sesuai endpoint |

## Format Error Response

Jika request gagal, backend mengembalikan format standar berikut:

| Field | Keterangan |
| --- | --- |
| `statusCode` | HTTP status code |
| `timestamp` | Waktu error dibuat |
| `path` | Path request yang gagal |
| `message` | Pesan error utama dalam format string |
| `error` | Nama error / ringkasan error |
| `details` | Field tambahan jika ada, misalnya data konteks error |

Contoh:

```json
{
	"statusCode": 400,
	"timestamp": "2026-04-26 19:00:00.000 WIB",
	"path": "/auth/register",
	"message": "full_name should not exist",
	"error": "Bad Request",
	"details": {
		"field": "full_name"
	}
}
```

## Auth

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /auth/register` | Public | `email`, `password`, `fullName` atau `full_name`, `phoneNumber` atau `phone_number`, `passwordConfirmation` atau `password_confirmation`, `inviteCode` opsional | Mengembalikan `accessToken` dan data user, serta info team jika register dari undangan |
| `POST /auth/login` | Public | `email`, `password` | Mengembalikan JWT access token |
| `GET /auth/me` | Authenticated user | Header auth | Mengembalikan profil user aktif |
| `POST /auth/logout` | Authenticated user | Header auth | Mengembalikan pesan logout berhasil |
| `POST /auth/forgot-password` | Public | `email` | Jika email terdaftar, sistem mengirim email reset password; jika tidak terdaftar, backend mengembalikan pesan `Email tidak terdaftar di aplikasi.`; rate limited 3 req/min |
| `POST /auth/reset-password` | Public | `token`, `newPassword`, `passwordConfirmation` | Reset password user dengan token valid dari email; token berlaku 1 jam, single-use, rate limited 5 req/min |

## Users

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /users/me` | Authenticated user | Header auth | Mengembalikan profil user aktif, fungsinya sama seperti `GET /auth/me` |

## Teams

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /teams` | Authenticated user | `name`, `description` opsional, `defaultInvoiceDueDay` opsional | Membuat team baru |
| `GET /teams` | Authenticated user | Header auth | Daftar membership aktif user beserta team dan `team.totalMembers` |
| `GET /teams/:id` | Team member aktif | Header auth | Detail team beserta `totalMembers` |
| `POST /teams/join` | Authenticated user | `inviteCode` | Join team via kode undangan |
| `PATCH /teams/:id` | OWNER, ADMIN | `name`, `description` opsional, `defaultInvoiceDueDay` opsional | Update data tim |

## Members

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/members` | Team member aktif | Header auth | Daftar member team |
| `POST /teams/:teamId/members` | OWNER, ADMIN | `userId`, `roleId`, `memberName`, `phoneNumber`, `systemRole`, `status` | Tambah member baru |
| `PATCH /teams/:teamId/members/:memberId` | OWNER, ADMIN | Field update member | Update data member |

## Invitations

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /teams/:teamId/invitations` | OWNER, ADMIN | `invitedName`, `invitedEmail` opsional, `invitedPhone` opsional, `roleId` opsional, `expiresAt` opsional | Membuat undangan anggota dan mengembalikan `inviteCode`, `inviteLink`, `status` |
| `GET /teams/:teamId/invitations` | OWNER, ADMIN | Query `status` opsional | Daftar undangan anggota dalam tim |
| `GET /teams/invitations/preview/:inviteCode` | Public | Path `inviteCode` | Preview undangan tanpa menampilkan kontak lengkap |
| `POST /teams/invitations/accept` | Authenticated user | `inviteCode` | Menerima undangan lalu membuat `TeamMember` aktif |
| `PATCH /teams/:teamId/invitations/:invitationId/cancel` | OWNER, ADMIN | `reason` opsional | Membatalkan undangan yang masih `PENDING` |

## Roles

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/roles` | Team member aktif | Header auth | Daftar role dalam team |
| `POST /teams/:teamId/roles` | OWNER, ADMIN | `name`, `feeAmount`, `periodType`, `invoiceDueDay` opsional | Buat role baru |
| `PATCH /teams/:teamId/roles/:roleId` | OWNER, ADMIN | Field update role, termasuk `invoiceDueDay` opsional | Update role |

## National Holidays

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /national-holidays` | Authenticated user | Query `year` opsional | Daftar hari libur nasional, default urut tanggal naik |
| `GET /national-holidays/:id` | Authenticated user | Header auth | Detail satu hari libur nasional |
| `POST /national-holidays` | Authenticated user | `holidayDate`, `name` | Tambah hari libur nasional baru |
| `PATCH /national-holidays/:id` | Authenticated user | `holidayDate` opsional, `name` opsional | Update hari libur nasional |
| `DELETE /national-holidays/:id` | Authenticated user | Header auth | Hapus hari libur nasional |

## Accounts

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/accounts` | Team member aktif | Header auth | Daftar account kas |
| `POST /teams/:teamId/accounts` | OWNER, ADMIN | `name`, `type`, `bankName` opsional, `accountNumber` opsional, `isActive` | Buat account kas/bank/e-wallet |
| `PATCH /teams/:teamId/accounts/:accountId` | OWNER, ADMIN | Field update account | Update account |
| `GET /teams/:teamId/accounts/:accountId/balance` | Team member aktif | Header auth | Mengembalikan `accountId`, `balance`, `currency` |

## Tagihan

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/invoices` | Team member aktif | Header auth | Daftar tagihan tim |
| `GET /invoices/:id` | Team member aktif dari tim tagihan | Header auth | Detail tagihan |
| `POST /teams/:teamId/invoices/generate` | OWNER, ADMIN | `periodDate` | Generate tagihan manual dengan due date dari prioritas `team.defaultInvoiceDueDay -> role.invoiceDueDay -> default sistem 1` |
| `PATCH /invoices/:id` | OWNER, ADMIN | `dueDate`, `status` | Update tagihan |

## Payments

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /invoices/:invoiceId/payments` | MEMBER pemilik tagihan | `multipart/form-data`: `accountId`, `amount`, `note`, `proof` opsional | Submit pembayaran dengan bukti file opsional |
| `GET /teams/:teamId/payments` | Team member aktif | Header auth | Daftar pembayaran dalam tim |
| `POST /payments/:paymentId/approve` | OWNER, ADMIN | Header auth | Setujui pembayaran, update tagihan, insert transaksi, audit log, notifikasi |
| `POST /payments/:paymentId/reject` | OWNER, ADMIN | `rejectedReason` | Tolak pembayaran |

Allowed proof MIME untuk upload pembayaran:

| MIME | Keterangan |
| --- | --- |
| `image/jpeg` | Gambar JPEG |
| `image/png` | Gambar PNG |
| `application/pdf` | Dokumen PDF |

## Transactions

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/transactions` | Team member aktif | Header auth | Daftar transaksi team |
| `POST /teams/:teamId/transactions/expense` | OWNER, ADMIN | `multipart/form-data`: `accountId`, `amount`, `description`, `proof` opsional | Create expense transaction |
| `GET /transactions/:id` | Team member aktif dari team transaksi | Header auth | Detail transaksi |
| `GET /transactions/:id/proof-url` | Team member aktif dari team transaksi | Header auth | Mengembalikan `transactionId`, `url`, dan `expiresInSeconds` |

## Donations

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /teams/:teamId/donations` | Team member aktif | `accountId`, `amount`, `isAnonymous`, `note` | Create donation |
| `GET /teams/:teamId/donations` | Team member aktif | Header auth | Daftar donation team |

## Notifications

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /notifications` | Authenticated user | Header auth | Daftar notifikasi milik user |
| `GET /notifications/unread-count` | Authenticated user | Header auth | Mengembalikan total notifikasi belum dibaca |
| `PATCH /notifications/:id/read` | Authenticated user pemilik notifikasi | `isRead: true` | Tandai notifikasi sebagai read |

## Audit Logs

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `GET /teams/:teamId/audit-logs` | Team member aktif | Header auth | Daftar business audit log, bukan raw technical API log |

## Scheduler

| Endpoint | Access | Request | Response / Catatan |
| --- | --- | --- | --- |
| `POST /scheduler/billing/run` | Super Admin | `triggerDate` opsional | Menjalankan enqueue billing EOD manual untuk seluruh tim. User harus memiliki `isSuperAdmin = true` di database |

## Health

| Endpoint | Access | Response / Catatan |
| --- | --- | --- |
| `GET /health` | Public | Mengembalikan `status`, `service`, dan `timestamp` |

## Internal Modules Tanpa Route Publik

| Module | Catatan |
| --- | --- |
| `uploads` | Controller ada, tetapi belum expose endpoint HTTP publik |

## Contoh Request

### Register

```json
{
	"fullName": "Nama Pengguna",
	"email": "user@example.com",
	"password": "Password123!",
	"phoneNumber": "+628123456789",
	"passwordConfirmation": "Password123!",
	"inviteCode": "CBP-2026-AB3D"
}
```

### Login

```json
{
	"email": "user@example.com",
	"password": "Password123!"
}
```

### Create Team

```json
{
	"name": "Tim Operasional",
	"description": "Tim untuk mengelola operasional harian",
	"defaultInvoiceDueDay": 25
}
```

### Join Team

```json
{
	"inviteCode": "INVITE-20260426"
}
```

### Create Member

```json
{
	"userId": "550e8400-e29b-41d4-a716-446655440000",
	"roleId": "550e8400-e29b-41d4-a716-446655440001",
	"memberName": "Nama Anggota",
	"phoneNumber": "+628123456789",
	"systemRole": "MEMBER",
	"status": "ACTIVE"
}
```

### Create Invitation

```json
{
	"invitedName": "Budi Santoso",
	"invitedEmail": "budi@email.com",
	"invitedPhone": "08123456789",
	"roleId": "550e8400-e29b-41d4-a716-446655440001",
	"expiresAt": "2026-05-04T17:00:00.000Z"
}
```

### Accept Invitation

```json
{
	"inviteCode": "CBP-2026-AB3D"
}
```

### Create Invitation Response

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440010",
	"inviteCode": "CBP-2026-AB3D",
	"inviteLink": "https://kolekto.anwarudin.web.id/invite/CBP-2026-AB3D",
	"status": "PENDING"
}
```

### Create Account

```json
{
	"name": "BCA Utama",
	"type": "BANK",
	"bankName": "Bank Central Asia",
	"accountNumber": "1234567890",
	"isActive": true
}
```

### Create National Holiday

```json
{
	"holidayDate": "2026-08-17",
	"name": "Hari Kemerdekaan Republik Indonesia"
}
```

### Update National Holiday

```json
{
	"name": "Hari Kemerdekaan RI"
}
```

### Run Billing EOD Manual

```json
{
	"triggerDate": "2026-04-27T23:55:00.000Z"
}
```

### Create Role

```json
{
	"name": "Koordinator Operasional",
	"feeAmount": 75000,
	"periodType": "MONTHLY",
	"invoiceDueDay": 20
}
```

### Submit Payment

```text
accountId=550e8400-e29b-41d4-a716-446655440002
amount=25000
note=Pembayaran iuran periode berjalan
proof=<file optional>
```

### Submit Expense

```text
accountId=550e8400-e29b-41d4-a716-446655440003
amount=120000
description=Pembelian kebutuhan operasional
proof=<file optional>
```

### Submit Donation

```json
{
	"accountId": "550e8400-e29b-41d4-a716-446655440003",
	"amount": 100000,
	"isAnonymous": false,
	"note": "Donasi kegiatan tim"
}
```

### Forgot Password

```json
{
	"email": "user@example.com"
}
```

### Reset Password

```json
{
	"token": "abc123def456...",
	"newPassword": "NewPassword123!",
	"passwordConfirmation": "NewPassword123!"
}
```

## Contoh Respons Penting

### Login / Register

| Field | Keterangan |
| --- | --- |
| `accessToken` | JWT token untuk akses endpoint terlindungi |
| `user` | Profil user hasil register |
| `invitationAccepted` | Opsional. Ada jika register dilakukan dengan `inviteCode` yang valid |

### Balance Account

| Field | Keterangan |
| --- | --- |
| `accountId` | ID account kas |
| `balance` | Saldo terkini |
| `currency` | Mata uang, misalnya `IDR` |

### Unread Notifications

| Field | Keterangan |
| --- | --- |
| `total` | Jumlah notifikasi yang belum dibaca |

### Health Check

| Field | Keterangan |
| --- | --- |
| `status` | Status service, biasanya `ok` |
| `service` | Nama service backend |
| `timestamp` | Waktu response dibuat |
