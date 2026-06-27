# Business Flow

Dokumen ini menjelaskan alur bisnis utama pada Kolekto Backend.

## Ringkasan Alur

| Area | Ringkasan |
| --- | --- |
| Auth | Register, login, logout, dan ambil profil aktif |
| Team | Buat team, join via invite code, dan kelola membership |
| Invitations | Owner/admin membuat undangan anggota yang belum punya akun |
| Master data | Kelola role jabatan dan account kas |
| Tagihan | Generate tagihan manual atau via scheduler bulanan |
| Pembayaran | Submit, approve, dan reject pembayaran |
| Finance | Donation, expense, dan transaksi kas |
| Operasional | Notification, audit log, dan sinkronisasi file bukti |

## Register dan Login

| Langkah | Detail |
| --- | --- |
| Register | User mengisi email, password, nama, dan nomor telepon opsional |
| Hash password | Password di-hash menggunakan bcrypt |
| Issue token | Backend mengembalikan JWT access token |
| Login | Backend memvalidasi email dan password lalu mengembalikan JWT |

## Create Team

| Langkah | Detail |
| --- | --- |
| 1 | User login terlebih dulu |
| 2 | User membuat team baru |
| 3 | Backend membuat `Team` dan `TeamMember` dengan `systemRole=OWNER` |
| 4 | Backend generate `inviteCode` unik |
| 5 | Activity log `TEAM_CREATED` disimpan |

## Invite Calon Anggota

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN membuka team yang dikelola |
| 2 | Backend validasi membership aktif dan `systemRole` |
| 3 | OWNER atau ADMIN mengisi `invitedName` dan minimal salah satu dari email atau nomor HP |
| 4 | OWNER atau ADMIN dapat memilih `roleId` iuran dan `expiresAt` opsional |
| 5 | Backend membuat `TeamInvitation` status `PENDING` dengan `inviteCode` unik |
| 6 | Activity log `CREATE_INVITATION` disimpan |

## Register atau Login dari Undangan

| Langkah | Detail |
| --- | --- |
| 1 | Calon anggota membuka link undangan |
| 2 | Frontend memanggil preview undangan untuk menampilkan nama team dan role |
| 3 | Jika user belum punya akun, user register atau login terlebih dulu |
| 4 | Setelah login, frontend memanggil endpoint accept invitation |
| 5 | Jika register memakai `inviteCode`, backend bisa langsung menerima undangan setelah akun dibuat |

## Accept Invitation

| Langkah | Detail |
| --- | --- |
| 1 | Backend memvalidasi `inviteCode` |
| 2 | Backend memastikan status undangan masih `PENDING` dan belum kedaluwarsa |
| 3 | Backend memastikan user belum menjadi anggota team |
| 4 | Backend membuat `TeamMember` dengan `systemRole=MEMBER`, `status=ACTIVE`, dan `roleId` dari undangan |
| 5 | Backend update `TeamInvitation` menjadi `ACCEPTED` dan mengisi `acceptedBy`, `acceptedAt` |
| 6 | Activity log `ACCEPT_INVITATION` disimpan |
| 7 | Backend dapat mengirim notifikasi ke OWNER atau ADMIN bahwa anggota baru telah bergabung |

## Cancel Invitation

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN memilih undangan `PENDING` |
| 2 | Backend update status undangan menjadi `CANCELLED` |
| 3 | Activity log `CANCEL_INVITATION` disimpan |

## Create Account Kas

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN memilih team |
| 2 | Backend validasi membership aktif |
| 3 | Backend membuat `Account` |
| 4 | Activity log `ACCOUNT_CREATED` disimpan |

## Role Jabatan dan Nominal Iuran

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN membuat role |
| 2 | Role menyimpan `name`, `feeAmount`, dan `periodType` |
| 3 | Member dapat dihubungkan ke role tertentu |
| 4 | `feeAmount` dipakai saat generate tagihan |

## Generate Tagihan

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN memanggil endpoint generate atau scheduler billing harian EOD berjalan sesuai cron `BILLING_EOD_CRON` (default `23:55`) |
| 2 | Backend mencari `TeamMember` aktif yang memiliki `roleId` |
| 3 | Backend menentukan `periodDate` target lalu menghitung tanggal jatuh tempo dari prioritas `team.defaultInvoiceDueDay -> role.invoiceDueDay -> default sistem 1` |
| 4 | Backend memuat hari libur nasional dari tabel `NationalHoliday`; jika data tahun terkait belum ada, backend akan sync awal dari Nager.Date API |
| 5 | Jika tanggal jatuh tempo adalah hari libur nasional, backend mundur 1 hari per langkah sampai maksimal 7 hari ke belakang |
| 6 | Jika 7 hari ke belakang tetap libur semua, backend memakai tanggal jatuh tempo asli |
| 7 | Scheduler hanya membuat tagihan saat tanggal hari ini adalah `H-5` dari due date efektif |
| 8 | Backend skip jika tagihan `teamId + userId + periodDate` sudah ada |
| 9 | Backend generate `invoiceCode` format `INV-YYYY-MM-XXXX` |
| 10 | Backend membuat `ContributionInvoice` |
| 11 | Activity log `INVOICE_GENERATED` atau `SCHEDULER_INVOICE_GENERATED` disimpan |

## Submit Pembayaran

| Langkah | Detail |
| --- | --- |
| 1 | Member membuka tagihan miliknya |
| 2 | Member submit pembayaran dengan nominal partial atau penuh |
| 3 | Optional file proof dikirim via multipart/form-data |
| 4 | Jika ada file, backend validasi MIME dan ukuran |
| 5 | File proof di-upload ke MinIO |
| 6 | Backend membuat `ContributionPayment` status `PENDING` |
| 7 | Pembayaran belum mengubah saldo |
| 8 | Activity log `PAYMENT_SUBMITTED` disimpan |
| 9 | Jika upload berhasil tetapi insert DB gagal, backend menghapus file dari MinIO untuk mencegah orphan file |

## Approve Pembayaran

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN membuka daftar pembayaran |
| 2 | Admin approve pembayaran tertentu |
| 3 | Backend menjalankan database transaction untuk update pembayaran menjadi `APPROVED` |
| 4 | Isi `approvedBy` dan `approvedAt` |
| 5 | Hitung total semua pembayaran `APPROVED` pada tagihan |
| 6 | Update tagihan menjadi `PARTIAL` jika total approved masih kurang |
| 7 | Update tagihan menjadi `PAID` jika total approved sudah cukup atau lebih |
| 8 | Buat `Transaction` `INCOME` source `CONTRIBUTION` |
| 9 | Buat `ActivityLog` |
| 10 | Buat `Notification` ke user pembayar |

## Reject Pembayaran

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN memilih pembayaran `PENDING` |
| 2 | Admin mengisi `rejectedReason` |
| 3 | Backend update pembayaran menjadi `REJECTED` |
| 4 | Backend membuat `ActivityLog` |
| 5 | Backend membuat `Notification` ke user |
| 6 | Saldo tidak berubah |

## Donation

| Langkah | Detail |
| --- | --- |
| 1 | Member submit donation ke account kas tertentu |
| 2 | Backend validasi membership dan account |
| 3 | Backend membuat `Donation` |
| 4 | Backend membuat `Transaction` `INCOME` source `DONATION` |
| 5 | Backend membuat `ActivityLog` |

## Expense Dengan Proof Upload

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN submit expense |
| 2 | Backend validasi role dan membership |
| 3 | Nominal harus lebih dari 0 |
| 4 | Optional proof file diterima via multipart/form-data |
| 5 | Jika file ada, backend upload ke MinIO |
| 6 | Backend membuat `Transaction` `EXPENSE` source `MANUAL_EXPENSE` |
| 7 | Backend membuat `ActivityLog` |
| 8 | Jika DB gagal setelah upload berhasil, file MinIO dihapus kembali |

## Notification

| Event | Dampak |
| --- | --- |
| Payment approved | Notification dikirim ke user pembayar |
| Payment rejected | Notification dikirim ke user pembayar |
| Scheduler reminder tagihan | Pengingat tagihan dibuat otomatis |
| Cron reminder | Jadwal pengingat mengikuti env `INVOICE_REMINDER_CRON` (default `08:00` setiap hari) |

User dapat membaca daftar notifikasi dan menandai notifikasi sebagai read.

## Audit Log

| Event penting | Disimpan sebagai audit log |
| --- | --- |
| Team created | Ya |
| Team joined | Ya |
| Member created atau updated | Ya |
| Role created atau updated | Ya |
| Account created atau updated | Ya |
| Tagihan generated atau updated | Ya |
| Pembayaran submitted, approved, rejected | Ya |
| Donation created | Ya |
| Expense created | Ya |

Technical request logging tidak masuk database, melainkan ke application log NestJS.
