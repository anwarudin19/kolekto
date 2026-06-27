# Database Schema

Database menggunakan PostgreSQL dengan Prisma ORM. Semua ID utama menggunakan UUID.

## Prinsip Desain

| Prinsip | Penjelasan |
| --- | --- |
| Invoice | Tagihan, bukan mutasi saldo |
| Transaction | Sumber kebenaran saldo kas |
| ContributionPayment | Menyimpan pengajuan pembayaran dan approval state |
| File storage | File disimpan di MinIO, database hanya menyimpan metadata dan `storageKey` |
| ActivityLog | Hanya untuk business audit |

## Ringkasan Model

| Model | Fungsi |
| --- | --- |
| `User` | Akun login aplikasi |
| `Team` | Entitas organisasi utama |
| `TeamMember` | Membership user di dalam team |
| `TeamInvitation` | Undangan calon anggota yang belum menjadi user team |
| `Role` | Jabatan dan nominal iuran per periode |
| `Account` | Akun kas milik team |
| `ContributionInvoice` | Tagihan iuran per user per periode |
| `ContributionPayment` | Pengajuan pembayaran untuk invoice |
| `Transaction` | Mutasi kas team |
| `TransactionAttachment` | File bukti yang dilampirkan ke transaksi pengeluaran (one-to-many) |
| `Donation` | Donasi tambahan ke kas team |
| `Notification` | Notifikasi user |
| `ActivityLog` | Audit log bisnis |
| `InvoiceReminder` | Reminder invoice agar tidak terkirim ganda |

## Detail Model

### User

| Field / Relasi | Keterangan |
| --- | --- |
| `email` | Unique |
| `passwordHash` | Hasil bcrypt |
| `isSuperAdmin` | Boolean untuk akses admin global seperti trigger scheduler manual |
| `passwordResetToken` | Opsional. SHA-256 hash dari raw reset token untuk reset password flow; dihapus setelah digunakan |
| `passwordResetExpires` | Opsional. Waktu expired reset token (TTL 1 jam dari email dikirim); null jika tidak ada reset pending |
| Relasi | Owner team, membership, invitation creator/acceptor, invoice, payment, donation, notification, activity log, reminder |

### Team

| Field / Relasi | Keterangan |
| --- | --- |
| `ownerId` | Mengarah ke `User` |
| `inviteCode` | Unique untuk join team |
| `defaultInvoiceDueDay` | Opsional. Tanggal jatuh tempo default bulanan untuk seluruh tim |
| Relasi | Member, invitation, role, account, invoice, payment, transaction, donation, notification, activity log |

### TeamMember

| Field / Relasi | Keterangan |
| --- | --- |
| Unique | Kombinasi `teamId + userId` |
| `systemRole` | `OWNER`, `ADMIN`, `MEMBER` |
| `status` | `ACTIVE`, `INVITED`, `INACTIVE`, `LEFT`, `BANNED` |
| `roleId` | Opsional ke role jabatan |

### TeamInvitation

| Field / Relasi | Keterangan |
| --- | --- |
| `inviteCode` | Unique, uppercase alphanumeric, untuk menerima undangan |
| `status` | `PENDING`, `ACCEPTED`, `EXPIRED`, `CANCELLED` |
| `invitedName` | Nama calon anggota |
| `invitedEmail` | Opsional |
| `invitedPhone` | Opsional |
| `roleId` | Opsional ke role jabatan yang akan dipasang saat accept |
| `invitedBy` | User OWNER atau ADMIN yang membuat undangan |
| `acceptedBy` | User yang menerima undangan |
| `expiresAt` | Opsional untuk membatasi masa berlaku |

### Role

| Field / Relasi | Keterangan |
| --- | --- |
| `feeAmount` | Decimal |
| `periodType` | `WEEKLY`, `MONTHLY`, `CUSTOM` |
| `invoiceDueDay` | Opsional. Override tanggal jatuh tempo bulanan untuk role |

### Account

| Field / Relasi | Keterangan |
| --- | --- |
| `type` | `CASH`, `BANK`, `EWALLET` |
| `isActive` | Menentukan akun masih digunakan atau tidak |

### ContributionInvoice

| Field / Relasi | Keterangan |
| --- | --- |
| `invoiceCode` | Unique dengan format `INV-{TEAMCODE}-YYYYMM-XXXX` (`TEAMCODE` = singkatan nama tim 3–4 huruf) |
| Unique | `teamId + userId + periodDate` |
| `status` | `UNPAID`, `PARTIAL`, `PAID`, `EXPIRED` |
| `dueDate` | Tanggal jatuh tempo efektif setelah penyesuaian hari libur nasional |

Catatan:

| Catatan | Penjelasan |
| --- | --- |
| Sumber | Invoice dibuat dari scheduler atau generate manual |
| Prioritas due day | `Team.defaultInvoiceDueDay -> Role.invoiceDueDay -> default sistem 1` |
| Billing otomatis | Scheduler membuat invoice di `H-5` sebelum due date efektif |
| Saldo | Invoice tidak mengubah saldo kas |

### NationalHoliday

| Field / Relasi | Keterangan |
| --- | --- |
| `holidayDate` | Tanggal hari libur nasional yang dipakai untuk menggeser `dueDate` |
| `name` | Nama hari libur |

Catatan:

| Catatan | Penjelasan |
| --- | --- |
| Sumber awal | Backend sinkron awal dari Nager.Date API |
| Sumber final | Database internal dipakai sebagai sumber final agar bisa dikoreksi manual/admin |

### ContributionPayment

| Field / Relasi | Keterangan |
| --- | --- |
| `status` | `PENDING`, `APPROVED`, `REJECTED` |
| Metadata file | Proof tersimpan di record ini |
| Approval | `approvedBy`, `approvedAt`, `rejectedReason` menyimpan keputusan admin |

Catatan:

| Catatan | Penjelasan |
| --- | --- |
| `PENDING` | Tidak mengubah saldo |
| `APPROVED` | Sistem membuat `Transaction` income |

### Transaction

| Field / Relasi | Keterangan |
| --- | --- |
| `type` | `INCOME`, `EXPENSE` |
| `source` | `CONTRIBUTION`, `DONATION`, `MANUAL_EXPENSE`, `MANUAL_INCOME` |
| File proof | Field lama (`storageKey`, `proofUrl`, dll.) dipertahankan untuk backward compatibility |
| `attachments` | Relasi ke `TransactionAttachment[]`; gunakan tabel ini untuk file bukti baru |

### TransactionAttachment

Model baru (migration `20260521210643_add_transaction_attachments`) untuk mendukung banyak file bukti per transaksi.

| Field / Relasi | Keterangan |
| --- | --- |
| `transactionId` | FK ke `Transaction` dengan cascade delete |
| `storageKey` | Path file di MinIO |
| `originalFileName` | Nama file asli saat diupload |
| `mimeType` | MIME type file (`image/jpeg`, `image/png`, `application/pdf`) |
| `fileSize` | Ukuran file dalam bytes |

Catatan:

| Catatan | Penjelasan |
| --- | --- |
| Batas file | Dikontrol via env `UPLOAD_MAX_PROOF_FILES` (default 5) |
| Ukuran file | Maks. 5 MB per file (dikontrol `UPLOAD_MAX_SIZE_MB`) |
| Tipe yang didukung | JPEG, PNG, PDF |
| Kompresi | Gambar dikompres browser-side (maks. 1 MB / 1920 px) sebelum dikirim |

Perhitungan saldo:

| Tipe | Dampak |
| --- | --- |
| `INCOME` | Menambah saldo |
| `EXPENSE` | Mengurangi saldo |

### Donation

| Field / Relasi | Keterangan |
| --- | --- |
| Fungsi | Catatan donasi tambahan ke kas team |
| Dampak | Diikuti pembuatan `Transaction` income |
| `isAnonymous` | Didukung |

### Notification

| Field / Relasi | Keterangan |
| --- | --- |
| Scope | Bisa terkait team atau global user |
| `data` | JSON untuk payload tambahan |

### ActivityLog

| Field / Relasi | Keterangan |
| --- | --- |
| `action` | Action bisnis |
| `entityType` | Jenis entitas |
| `entityId` | ID entitas terkait |
| `description` | Deskripsi event |
| `metadata` | JSON untuk konteks tambahan |

### InvoiceReminder

| Field / Relasi | Keterangan |
| --- | --- |
| Fungsi | Catatan reminder invoice agar tidak terkirim ganda |
| Unique | `invoiceId + userId + reminderType` |

## Relasi Utama

| Relasi | Keterangan |
| --- | --- |
| `User 1..n Team` | Sebagai owner |
| `User n..n Team` | Melalui `TeamMember` |
| `Team 1..n Role` | Role milik team |
| `Team 1..n TeamInvitation` | Undangan team |
| `Team 1..n Account` | Account kas milik team |
| `Team 1..n ContributionInvoice` | Invoice team |
| `ContributionInvoice 1..n ContributionPayment` | Payment per invoice |
| `Account 1..n Transaction` | Mutasi kas per account |
| `Transaction 1..n TransactionAttachment` | Bukti file per transaksi (cascade delete) |
| `Team 1..n Donation` | Donasi team |
| `User 1..n Notification` | Notifikasi user |

## Aturan Bisnis Utama

### Invoice

| Aturan | Penjelasan |
| --- | --- |
| Sumber nominal | Berasal dari `Role.feeAmount` |
| Pembuatan | Dibuat berdasarkan role anggota aktif |
| Due date | Default `periodDate + 7 hari` |

### Payment

| Aturan | Penjelasan |
| --- | --- |
| Banyak payment | 1 invoice bisa memiliki banyak payment |
| Approval | Menghitung total payment `APPROVED` |
| Status `PARTIAL` | Jika total approved masih kurang |
| Status `PAID` | Jika total approved sudah cukup atau lebih |

### Transaction

| Aturan | Penjelasan |
| --- | --- |
| Validasi | Hanya dibuat dari event finansial yang sah |
| `INCOME` | Dibuat saat payment approved atau donation |
| `EXPENSE` | Dibuat saat expense manual |

Dengan pola ini, saldo kas tetap akurat walau invoice dan payment memiliki lifecycle terpisah.

### Invitation

| Aturan | Penjelasan |
| --- | --- |
| User belum terdaftar | Tetap bisa diundang melalui `TeamInvitation` |
| TeamMember | Baru dibuat saat undangan diterima oleh user yang login |
| Status awal | `PENDING` |
| Accept | Mengubah undangan ke `ACCEPTED` dan membuat `TeamMember` baru |
| Cancel | Mengubah status menjadi `CANCELLED` tanpa membuat `TeamMember` |
