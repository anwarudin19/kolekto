# Changelog

Semua perubahan penting pada Kolekto Backend dicatat di file ini.

Format mengikuti prinsip [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## Ringkasan Rilis

| Versi | Tanggal | Fokus |
| --- | --- | --- |
| `1.2.0` | 2026-05-23 | Reset password: email service, forgot-password endpoint, reset-password endpoint dengan token flow, rate limiting, dan HTML email template |
| `1.1.0` | 2026-05-22 | Multi-file bukti pengeluaran, kode tagihan dengan kode tim, paginasi transaksi & notifikasi, dan perbaikan akses peran |
| `1.0.0` | 2026-05-17 | Rilis production-ready: dokumentasi lengkap, PRD, dan stabilisasi seluruh modul |
| `0.1.4` | 2026-05-16 | Kola Assist (AI assistant), invitations diperkaya notifikasi + license guard, dan unit test |
| `0.1.3` | 2026-04-28 | License/subscription SaaS: plan, owner license, payment license, guard akses, dan seed plan |
| `0.1.2` | 2026-04-28 | Admin panel API: dashboard, users, teams, invoices, payments, audit logs, EOD, dan super admin seed |
| `0.1.1` | 2026-04-27 | Due date config, sinkronisasi hari libur nasional, CRUD National Holiday, scheduler billing harian |
| `0.1.0` | 2026-04-26 | Scaffold awal: auth, modul bisnis, Redis/BullMQ, MinIO, Docker, undangan, dan dokumentasi utama |

---

## [1.2.0] - 2026-05-23

### Added

| Area | Perubahan |
| --- | --- |
| Mail service | Service email baru dengan nodemailer, SMTP configuration, dan HTML template untuk notifikasi reset password |
| Mail module | Module mail untuk dependency injection `MailService` ke auth module |
| Forgot password endpoint | `POST /auth/forgot-password` untuk request reset password via email; rate limited 3 req/min |
| Forgot password user feedback | Email yang tidak terdaftar kini mengembalikan error eksplisit `Email tidak terdaftar di aplikasi.` |
| Reset password endpoint | `POST /auth/reset-password` untuk reset password dengan token dari email; rate limited 5 req/min |
| Password reset token flow | Token lifecycle: raw 32-byte hex → SHA-256 hash → stored di DB → sent via email → validated dengan TTL 1 jam, single-use enforcement |
| Forgot-password DTO | Validation DTO untuk email dengan regex check valid email |
| Reset-password DTO | Validation DTO untuk token, newPassword, dan passwordConfirmation dengan minimum 8 karakter dan password confirmation match |
| Email HTML template | Template email reset password yang responsif dengan branding Kolekto, security warnings, dan link 1 jam valid |
| SMTP config validation | Validasi env variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` di `env.validation.ts` |
| User model fields | Field baru `passwordResetToken` (string opsional, SHA-256 hash) dan `passwordResetExpires` (datetime opsional) di Prisma schema |
| Database migration | Migration `20260523000000_add_password_reset_token` menambah dua kolom ke tabel User |

### Changed

| Area | Perubahan |
| --- | --- |
| Auth service | `AuthService` diperkaya method `forgotPassword(email)` dan `resetPassword(token, newPassword)` dengan complete token lifecycle |
| Auth controller | `AuthController` ditambah endpoint untuk forgot-password dan reset-password |
| Auth module | Import `MailModule` sebagai dependency agar auth dapat mengirim email |
| Env validation schema | Ditambahkan optional SMTP env vars yang tidak required, memungkinkan fitur reset password disabled jika SMTP tidak dikonfigurasi |

### Notes

- Migration `20260523000000_add_password_reset_token` harus dijalankan dengan `prisma migrate deploy` di production sebelum deploy code.
- Fitur reset password dapat didisable dengan tidak mengatur `SMTP_HOST`; endpoint akan tetap berjalan tapi throw error jika SMTP belum configured.
- Rate limiting menggunakan `@nestjs/throttler` yang sudah terintegrasi di module auth.
- Token tidak pernah terekspos di response API, hanya terkirim via email.

---

## [1.1.0] - 2026-05-22

### Added

| Area | Perubahan |
| --- | --- |
| TransactionAttachment | Model baru `TransactionAttachment` dengan relasi one-to-many ke `Transaction` dan cascade delete; setiap pengeluaran kini dapat menyimpan banyak file bukti |
| Multi-file expense upload | Endpoint `POST /teams/:teamId/transactions/expense` berubah dari `FileInterceptor('proof')` ke `FilesInterceptor('proofs', MAX_PROOF_FILES)` untuk mendukung upload banyak file sekaligus |
| Endpoint proof-urls | `GET /transactions/:id/proof-urls` — mengembalikan signed URL seluruh attachment dalam satu transaksi; endpoint lama `proof-url` tetap berfungsi sebagai fallback ke attachment pertama |
| Config maxProofFiles | Env var `UPLOAD_MAX_PROOF_FILES` (default 5) untuk mengontrol batas maksimal file per pengeluaran tanpa mengubah kode |
| Kode tagihan dengan kode tim | Format invoice code diperbarui menjadi `INV-{TEAMCODE}-YYYYMM-XXXX`; `TEAMCODE` diturunkan dari nama tim via `buildTeamNameAbbreviation` |
| Paginasi transaksi admin | `GET /admin/transactions` mendukung query `page` dan mengembalikan `{ data, meta }` dengan `PaginatedResponse<T>` |
| Paginasi notifikasi | `GET /notifications` mendukung query `page`, `limit`, dan `isRead` untuk filter dan paginasi notifikasi |
| TREASURER createExpense | Role `TREASURER` kini diizinkan membuat pengeluaran manual selain `OWNER` dan `ADMIN` |

### Changed

| Area | Perubahan |
| --- | --- |
| TransactionsService.createExpense | Menerima `files?: Express.Multer.File[]` (plural), loop upload setiap file ke MinIO, simpan ke tabel `TransactionAttachment`; rollback cleanup semua file yang sudah terupload jika terjadi error |
| TransactionsService.findOne | Include relasi `attachments` pada query `findOne` dan `list` |
| InvoicesService.generateInvoiceCode | Menerima parameter `teamName` tambahan; prefix berubah dari `INV-YYYYMM-` menjadi `INV-{TEAMCODE}-YYYYMM-` |
| Multer upload limit | `PROOF_UPLOAD_LIMIT_BYTES` dikoreksi dari 10 MB menjadi 5 MB agar konsisten dengan validasi di `UploadsService` |
| NotificationsService.listForUser | Mendukung opsi `{ page?, limit?, isRead? }` untuk paginasi dan filter status baca |

### Notes

- Migration `20260521210643_add_transaction_attachments` ditambahkan; jalankan `prisma migrate deploy` di production sebelum deploy.
- Field lama (`storageKey`, `proofUrl`, dll.) di tabel `Transaction` dipertahankan untuk backward compatibility data lama.
- `UPLOAD_MAX_PROOF_FILES` dapat ditambahkan ke `.env` tanpa rebuild; default 5 jika tidak diset.

---

## [1.0.0] - 2026-05-17

### Added

| Area | Perubahan |
| --- | --- |
| PRD | Dokumen Product Requirements Document lengkap dengan persona, feature list, non-functional requirements, alur bisnis, dan roadmap |
| Dokumentasi BE | `README-BACKEND.md` diperbarui: semua modul terdaftar, tabel versi tech stack, tabel Roles, status lisensi, daftar BullMQ jobs, dan jadwal scheduler |
| Dokumentasi FE | `README-FRONTEND.md` diperbarui: seluruh routes, 21 query hooks, tabel komponen UI, dan panduan menambah fitur baru |

### Changed

| Area | Perubahan |
| --- | --- |
| Dokumentasi | Seluruh dokumen backend diselaraskan dengan kondisi codebase aktual termasuk modul yang sebelumnya tidak tercatat (`invitations`, `licenses`, `plans`, `national-holidays`, `admin`, `queue`, `cache`, `assist`, `config`, `common`, `prisma`) |

### Notes

- Tidak ada perubahan kode pada rilis ini, fokus pada stabilisasi dokumentasi dan PRD sebelum distribusi ke tim.

---

## [0.1.4] - 2026-05-16

### Added

| Area | Perubahan |
| --- | --- |
| Assist module (Kola) | Modul `assist` baru dengan AI assistant bernama Kola — menjawab pertanyaan seputar tim, invoice, pembayaran, saldo kas, dan pengeluaran berdasarkan data aktual dari database |
| Assist guest mode | Endpoint `POST /assist/guest` (tanpa auth) untuk menjawab pertanyaan umum tentang Kolekto, cara daftar, fitur, dan alur kerja |
| Assist team mode | Endpoint `POST /assist/ask` (auth + team context) untuk menjawab pertanyaan anggota atau admin tentang data tim yang sedang aktif |
| Assist services | Service terpisah: `AssistContextService` (ambil data konteks tim), `AssistPolicyService` (validasi akses per role), `AssistTeamService` (logika jawaban berbasis intent), `AssistGuestService` (jawaban mode guest) |
| Invitations unit test | `invitations.service.spec.ts` ditambahkan sebagai unit test awal untuk service undangan |

### Changed

| Area | Perubahan |
| --- | --- |
| Invitations service | `InvitationsService` diperbarui: integrasi notifikasi async via `NotificationsService`, validasi license owner via `LicenseAccessService`, dan refaktor alur accept/cancel agar audit log lebih konsisten |

---

## [0.1.3] - 2026-04-28

### Added

| Area | Perubahan |
| --- | --- |
| Plan module | Modul plan terpisah untuk mengelola paket Basic/Pro/Trial dan fitur yang aktif per paket |
| License module | Modul license untuk owner subscription, payment confirmation, approval, rejection, dan current license endpoint |
| License guard/helper | Helper `ensureActiveLicense`, `ensureCanCreateTeam`, `ensureCanAddMember`, dan `ensureFeatureEnabled` untuk membatasi fitur owner saat license tidak aktif |
| Seed license | Seed default plan `TRIAL`, `BASIC`, dan `PRO`, termasuk trial license untuk owner demo pertama |
| SaaS access control | Pembatasan fitur team/invoice/member/reminder agar mengikuti status license owner |
| Admin license | Endpoint admin untuk mengelola plan, license, dan payment license hanya untuk super admin |

### Changed

| Area | Perubahan |
| --- | --- |
| Auth owner | Login owner sekarang otomatis mempersiapkan trial license bila belum ada record license |
| Team flow | Pembuatan team, update team, manajemen member, role team, dan undangan member kini divalidasi terhadap license owner |
| Invoice flow | Generasi invoice manual dan scheduler invoice bulanan hanya berjalan untuk owner dengan license aktif/trial |
| Reminder flow | Scheduler reminder mengabaikan team yang owner license-nya tidak aktif atau plan-nya tidak mengizinkan reminder |
| Payment flow | Approve/reject payment team tetap melalui validasi license agar action admin tidak bypass SaaS control |
| Admin role update | User yang diubah menjadi `OWNER` sekarang dipersiapkan dengan trial license otomatis |

---

## [0.1.2] - 2026-04-28

### Added

| Area | Perubahan |
| --- | --- |
| Admin module | Modul admin terpisah untuk Web Admin Panel dengan controller/service terstruktur dan endpoint berbasis JWT |
| Dashboard | Endpoint `GET /admin/dashboard` untuk ringkasan users, teams, invoices, payments, balance, dan status EOD terakhir |
| Users | Endpoint manajemen user: list, detail, update role, dan update status dengan pagination, search, dan filter |
| Teams | Endpoint manajemen team: list, detail, update team, update status, dan ringkasan owner/member/invoice/kas |
| Team members | Endpoint manajemen anggota team termasuk role/status update dan flow invite/pending member |
| Invoices | Endpoint manajemen invoice: list, detail, create, update, dan update status dengan filter team, periode, dan due date |
| Payments | Endpoint manajemen payment: list dan detail dengan relasi invoice, member, team, amount, status, dan payment date |
| Payment confirmation | Endpoint approve/reject payment confirmation dengan validasi status, transaksi Prisma, dan audit log |
| EOD manual | Endpoint `POST /admin/eod/run` serta history/detail EOD dengan lock/idempotency agar tidak double running |
| Audit logs | Endpoint audit log untuk observasi tindakan penting admin, owner, dan super admin |
| Prisma schema | Model `EodRun` dan `AuditLog`, serta enum dan field status/role yang diperlukan untuk admin panel |
| Guards | Guard/permission helper untuk JWT auth, role checking, super admin bypass, dan validasi akses team |
| Validation | DTO admin baru dengan `class-validator` untuk query, pagination, role, status, EOD, invoice, dan payment confirmation |
| Seed | Seed super admin pertama berbasis env `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, dan `SUPER_ADMIN_NAME` |

### Changed

| Area | Perubahan |
| --- | --- |
| Auth | Login dan response user disesuaikan agar tidak mengekspos password hash atau token sensitif |
| Access control | Role `SUPER_ADMIN` diberi bypass team scope, sementara role lain tetap wajib validasi membership/team access |
| Admin security | Endpoint admin dilindungi JWT dan role guard agar hanya role yang berwenang yang bisa mengakses data sensitif |
| Payment flow | Proses approve/reject payment confirmation menggunakan transaksi Prisma untuk menjaga konsistensi data |
| EOD flow | Proses EOD manual mendapat proteksi lock, status running check, dan pencatatan hasil eksekusi ke database |
| Audit logging | Action penting seperti `RUN_EOD_MANUAL`, `UPDATE_USER_ROLE`, `DISABLE_USER`, `ENABLE_USER`, `APPROVE_PAYMENT`, `REJECT_PAYMENT`, `UPDATE_TEAM`, dan `UPDATE_INVOICE` kini dicatat ke audit log |
| App module | Admin module ditambahkan ke bootstrap aplikasi tanpa mengubah endpoint mobile yang sudah ada |

---

## [0.1.1] - 2026-04-27

### Added

| Area | Perubahan |
| --- | --- |
| Billing config | Konfigurasi due date per team melalui `defaultInvoiceDueDay` dan override per role melalui `invoiceDueDay` |
| National Holiday | CRUD `NationalHoliday` dengan endpoint list, detail, create, update, dan delete untuk pengelolaan hari libur nasional |
| Scheduler API | Endpoint manual `POST /scheduler/billing/run` untuk menjalankan enqueue billing EOD tanpa menunggu cron |

### Changed

| Area | Perubahan |
| --- | --- |
| Billing flow | Logika due date kini memakai prioritas `team.defaultInvoiceDueDay → role.invoiceDueDay → default sistem 1`, menggeser tanggal saat hari libur nasional, dan membuat invoice otomatis H-5 dari due date final |
| Scheduler | Scheduler billing berubah dari job bulanan tetap menjadi proses harian EOD untuk mengevaluasi pembuatan invoice berdasarkan due date aktual |
| Scheduler security | Endpoint manual billing EOD kini dibatasi berdasarkan flag `User.isSuperAdmin` di database |
| Scheduler config | Jam billing EOD kini dapat diubah melalui env `BILLING_EOD_CRON` tanpa mengubah kode |
| Reminder config | Jam scheduler pengingat tagihan kini dapat diubah melalui env `INVOICE_REMINDER_CRON` tanpa mengubah kode |
| Auth config | Default `JWT_EXPIRES_IN` pada environment contoh kini disetel ke `3m` |
| Holiday source | Data hari libur nasional kini disinkronkan lebih dulu dari Nager.Date, lalu disimpan di database agar dapat diedit manual lewat backend CRUD |

---

## [0.1.0] - 2026-04-26

### Added

| Area | Perubahan |
| --- | --- |
| Scaffold | Initial Kolekto backend project scaffold |
| Bootstrap | NestJS bootstrap dengan global validation, exception filter, request logging, helmet, CORS, throttling, dan Swagger di `GET /docs` |
| Schema | Prisma PostgreSQL schema untuk users, teams, team members, roles, accounts, invoices, payments, transactions, donations, notifications, activity logs, dan invoice reminders |
| Auth | JWT authentication module dengan register, login, dan current-user profile endpoint |
| Guards | Shared guards dan decorators untuk JWT auth, team membership validation, dan role metadata |
| Core modules | Team, member, role, dan account modules dengan REST endpoints dan business audit logging |
| Invoice | Invoice module dengan manual generation, kode format `INV-YYYYMM-XXXX`, dan update endpoint |
| Payment | Payment module dengan partial payment submission, approval flow, rejection flow, audit log, dan notifikasi user |
| Transaction | Transaction module dengan expense creation, signed proof URL endpoint, dan balance calculation via transaction aggregation |
| Donation | Donation module dengan automatic income transaction creation |
| Observability | Notification dan audit log modules |
| Storage | MinIO upload service untuk payment proof dan expense proof dengan file validation dan orphan-file cleanup |
| Scheduler | Monthly billing scheduler dan daily reminder scheduler via `@nestjs/schedule` |
| Docker | Multi-stage Dockerfile dan `docker-compose.yml` dengan service `api`, `postgres`, dan `minio` |
| Redis | Redis service di Docker Compose |
| Queue | BullMQ queue infrastructure dengan job: billing, reminder, notification, cleanup |
| Cache | Redis cache service |
| Security | JWT token blacklist service via Redis |
| Invitations | Team invitations untuk user tanpa akun, termasuk accept flow, preview endpoint, dan audit log lifecycle |
| Docs | Dokumentasi awal: API, schema, business flow, storage, VPS deployment, Redis/BullMQ, dan team invitation flow |

### Changed

| Area | Perubahan |
| --- | --- |
| Docker Compose | Fixed `api` service agar berjalan dari built image tanpa host bind mounts yang override production artifacts |
| Env | Kredensial PostgreSQL container dipindah ke variabel `.env` dan ditambahkan ke `.env.example` |
| Prisma | Ditambahkan file migration awal untuk MVP schema agar `prisma migrate deploy` memiliki artifact konkret |
| Scheduler | Scheduler sekarang hanya enqueue BullMQ jobs; processor menangani billing dan reminder work |
| Auth/Cache | Logout endpoint, Redis-backed JWT blacklist, unread notification count cache, dan balance cache invalidation setelah mutasi finansial |
| Timezone | `TZ=Asia/Jakarta` ditambahkan ke API service dan seluruh container agar log mengikuti WIB |
| API logger | Custom WIB 24-hour timestamp menggantikan format Nest logger default |
| bcrypt | Beralih dari native `bcrypt` ke `bcryptjs` agar container tidak bergantung pada native binary |
| Error response | Global exception filter dinormalisasi ke format konsisten: `statusCode`, `timestamp`, `path`, `message`, `error`, `details` |
| Localization | Pesan error, warning, dan operasional user-facing diterjemahkan ke Bahasa Indonesia |
| Accounts | Account payload mendukung `bankName` dan `accountNumber` opsional; `type` dinormalisasi ke uppercase |
