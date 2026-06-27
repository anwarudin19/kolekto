# Kolekto Backend

Kolekto Backend adalah backend modular monolith production-ready untuk aplikasi iuran kas tim, organisasi, dan komunitas. Backend ini menangani autentikasi JWT, multi-team membership, invoice iuran, pembayaran parsial dengan approval admin, transaksi kas, donasi, notifikasi, audit log, scheduler billing harian, manajemen lisensi, dan penyimpanan bukti file di MinIO.

## Ringkasan

| Item | Isi |
| --- | --- |
| Arsitektur | Modular monolith |
| Auth | JWT |
| Database | PostgreSQL + Prisma |
| Queue | Redis + BullMQ |
| Storage | MinIO |
| Dokumentasi utama | API, business flow, database schema, commands/logs, deployment, storage, integration errors |

---

## Tech Stack

| Stack | Versi | Keterangan |
| --- | --- | --- |
| NestJS | 10.4.8 | Framework backend |
| TypeScript | - | Bahasa utama |
| PostgreSQL | 16 | Database utama |
| Prisma ORM | 6.6.0 | ORM dan schema management |
| pnpm | 10.10.0 | Package manager |
| JWT Auth | - | Autentikasi via Passport |
| Swagger / OpenAPI | - | Dokumentasi API di `/docs` |
| Docker & Docker Compose | - | Container runtime |
| Redis | 8.x | Cache, rate limit, token blacklist, queue |
| BullMQ / @nestjs/bullmq | - | Background job |
| MinIO | latest | Object storage |
| bcrypt | - | Password hashing |
| class-validator | - | Validasi DTO |
| helmet | - | Security headers |
| cors | - | Cross-origin policy |
| @nestjs/throttler | - | Rate limiting |
| @nestjs/schedule | - | Scheduler harian |

---

## Struktur Modul Backend

| Modul | Fungsi |
| --- | --- |
| `auth` | Register, login, logout, profil pengguna |
| `users` | Data dan manajemen user |
| `teams` | Tim, konfigurasi, dan join via kode undangan |
| `members` | Manajemen anggota tim (status, jabatan) |
| `roles` | Jabatan dan nominal iuran per periode |
| `invitations` | Alur undangan masuk tim (buat, accept, cancel) |
| `accounts` | Akun kas tim (CASH, BANK, EWALLET) |
| `invoices` | Invoice iuran per anggota per periode |
| `payments` | Submit dan approval pembayaran dengan bukti |
| `transactions` | Mutasi kas (INCOME/EXPENSE) |
| `donations` | Donasi sukarela anonim/bernama |
| `notifications` | Notifikasi in-app via queue async |
| `audit-logs` | Audit log seluruh aktivitas bisnis |
| `licenses` | Lisensi owner (TRIAL, ACTIVE, EXPIRED, SUSPENDED) |
| `plans` | Plan berlangganan dengan feature flags |
| `admin` | Kontrol Super Admin |
| `scheduler` | EOD billing harian dan invoice reminder |
| `uploads` | Upload file dan signed URL ke MinIO |
| `national-holidays` | Manajemen hari libur nasional untuk shifting due date |
| `queue` | Integrasi BullMQ job queue |
| `cache` | Layer caching Redis |
| `assist` | Helper konteks dan kebijakan bisnis |
| `config` | Konfigurasi app, database, JWT, MinIO, Redis |
| `common` | Guards, interceptors, filters, decorators, DTOs |
| `prisma` | Manajemen Prisma client |

---

## Cara Install

| Langkah | Command / Aksi |
| --- | --- |
| Copy environment | `cp .env.example .env` |
| Sesuaikan env local | `DATABASE_URL=localhost`, `REDIS_HOST=localhost`, `MINIO_ENDPOINT=localhost` bila menjalankan service via Docker di host |
| Install dependency | `pnpm install` |
| Generate Prisma client | `pnpm prisma generate` |

### Catatan Environment

Jika API dijalankan langsung dari host dengan `pnpm start:dev`, pastikan host service pada `.env` mengarah ke `localhost`.

Jika backend dijalankan lewat Docker Compose dari root repository:

- Root `.env` dipakai Docker Compose untuk substitusi variabel
- `backend/.env` dipakai runtime API container
- Service internal tetap memakai hostname Docker seperti `postgres`, `redis`, dan `minio`
- `MINIO_PUBLIC_URL` tetap harus URL yang bisa diakses browser

**Contoh `.env` untuk Docker Compose:**

```env
DATABASE_URL=postgresql://kolekto:kolekto_password@kolekto-postgres:5432/kolekto_db?schema=public
REDIS_HOST=kolekto-redis
MINIO_ENDPOINT=kolekto-minio
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_REGION=us-east-1
```

**Contoh `.env` untuk local dev:**

```env
DATABASE_URL=postgresql://kolekto:kolekto_password@localhost:5432/kolekto_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_REGION=us-east-1
```

Untuk link undangan frontend, set `APP_WEB_URL` ke domain atau origin frontend. Jika tidak diset, backend mengembalikan `inviteLink` sebagai path relatif seperti `/invite/ABC1234`.

Untuk shifting `dueDate` saat hari libur nasional, backend mencoba sinkron awal dari Nager.Date API ke tabel `NationalHoliday`. Setelah data masuk, tabel tersebut menjadi sumber data yang bisa diedit manual lewat admin panel.

---

## Cara Run Local

| Langkah | Command |
| --- | --- |
| 1. Jalankan infra | `docker compose up -d postgres redis minio` |
| 2. Jalankan migration | `pnpm prisma migrate dev` |
| 3. Jalankan seed | `pnpm seed` |
| 4. Jalankan backend | `pnpm start:dev` |

Backend default berjalan di `http://localhost:3000`.

---

## Cara Run Full Stack dengan Docker Compose

| Langkah | Command / Hasil |
| --- | --- |
| Jalankan stack penuh | `docker compose up -d` |
| API | `http://localhost:3000` |
| Swagger | `http://localhost:3000/docs` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |

`docker-compose.backend.yml` di folder `backend/` tersedia sebagai compose layanan backend saja, sementara `docker-compose.yml` di root menjadi entry point utama untuk full stack.

---

## Migration Prisma

| Command | Fungsi |
| --- | --- |
| `pnpm prisma migrate dev` | Development migration |
| `pnpm prisma migrate deploy` | Production migration |
| `pnpm prisma generate` | Generate Prisma client |

---

## Seed Database

| Command | Fungsi |
| --- | --- |
| `pnpm seed` | Jalankan seed database |

Seed default membuat:

| Data | Keterangan |
| --- | --- |
| User | 1 user owner demo |
| Team | 1 team demo |
| Role | 1 role bulanan |
| Account | 1 account kas utama |

---

## Roles & Akses

| Role | Deskripsi |
| --- | --- |
| `SUPER_ADMIN` | Pengelola platform, akses penuh semua data |
| `OWNER` | Pemilik tim, akses penuh ke tim sendiri |
| `ADMIN` | Asisten owner, kelola anggota dan keuangan |
| `TREASURER` | Bendahara, fokus ke invoice dan kas |
| `MEMBER` | Anggota biasa, akses terbatas hanya ke data sendiri |

---

## Status Lisensi

| Status | Keterangan |
| --- | --- |
| `TRIAL` | Masa percobaan otomatis setelah registrasi |
| `ACTIVE` | Lisensi aktif setelah pembayaran diapprove |
| `EXPIRED` | Lisensi kadaluarsa, fitur tertentu dibatasi |
| `SUSPENDED` | Lisensi ditangguhkan oleh Super Admin |

---

## Background Jobs (BullMQ)

| Queue | Fungsi |
| --- | --- |
| `billing-generate-invoices` | Generate invoice harian saat EOD |
| `invoice-reminders` | Kirim pengingat H-3, H-1, dan overdue |
| `notifications` | Buat notifikasi in-app secara async |
| `file-cleanup` | Hapus file orphan di MinIO |

---

## Scheduler

| Jadwal | Tugas |
| --- | --- |
| Setiap hari pukul 23:55 | EOD: generate invoice baru, kirim reminder |
| Saat service start | Sinkron data hari libur dari Nager.Date API (jika belum ada) |

---

## Testing

| Command | Fungsi |
| --- | --- |
| `pnpm test` | Basic unit test |
| `pnpm test:cov` | Coverage test |

Fokus utama scaffold ini ada pada struktur production-ready dan business flow service layer. Disarankan menambah unit test dan e2e test sebelum go-live.

---

## Swagger

| Item | Detail |
| --- | --- |
| Endpoint | `GET /docs` |
| Auth | Bearer JWT |
| Fitur | Tag per modul, DTO request lengkap, semua endpoint teregistrasi |

---

## Security

| Fitur | Keterangan |
| --- | --- |
| Helmet | Security headers |
| CORS | Cross-origin policy per environment |
| Global validation pipe | Validasi semua request DTO |
| Rate limiting | Throttling via @nestjs/throttler |
| JWT auth guard | Proteksi semua endpoint authenticated |
| Role guard | Validasi role per endpoint |
| Team membership guard | Validasi keanggotaan tim |
| Centralized exception filter | Format error konsisten |
| Password hashing | bcrypt |
| Token blacklist | Redis blacklist saat logout |
| Login rate limit | Redis counter per IP/user |

---

## Konfigurasi Upload

| Env Variable | Default | Keterangan |
| --- | --- | --- |
| `UPLOAD_MAX_SIZE_MB` | `5` | Ukuran maks. per file bukti dalam MB |
| `UPLOAD_MAX_PROOF_FILES` | `5` | Jumlah maks. file bukti per transaksi pengeluaran |

---

## Catatan Operasional

| Catatan | Penjelasan |
| --- | --- |
| File bukti pengeluaran | Disimpan di tabel `TransactionAttachment` (one-to-many); field lama di `Transaction` dipertahankan untuk backward compatibility |
| Banyak file bukti | Setiap transaksi `EXPENSE` dapat memiliki banyak attachment; batas dikontrol via `UPLOAD_MAX_PROOF_FILES` |
| Payment `PENDING` | Tidak mengubah saldo akun kas |
| Saldo account | Dihitung dari akumulasi `Transaction`, bukan field balance manual |
| Approval/rejection | Dijalankan dalam database transaction untuk menjamin konsistensi state bisnis |
| Redis | Queue background job, cache ringan, login rate limit, blacklist token JWT |
| Due date holiday | Digeser ke hari kerja berikutnya bila jatuh di hari libur nasional |
| Invite link | Berisi `inviteCode` unik per tim, bisa direset oleh owner |
| Invoice code | Format `INV-{TEAMCODE}-YYYYMM-XXXX`; `TEAMCODE` diturunkan otomatis dari nama tim |

---

## Referensi Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [API-ENDPOINTS.md](API-ENDPOINTS.md) | Daftar lengkap endpoint API dengan contoh request/response |
| [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md) | Detail model Prisma dan relasi antar tabel |
| [BUSINESS-FLOW.md](BUSINESS-FLOW.md) | Alur bisnis utama: registrasi, invoice, pembayaran, lisensi |
| [REDIS-BULLMQ.md](REDIS-BULLMQ.md) | Redis, BullMQ queue, dan background job |
| [STORAGE-MINIO.md](STORAGE-MINIO.md) | Setup MinIO dan signed URL |
| [COMMANDS-LOGS.md](COMMANDS-LOGS.md) | Command umum, Prisma, Docker, dan cara membaca log |
| [DEPLOYMENT-VPS.md](DEPLOYMENT-VPS.md) | Panduan deployment ke VPS production |
| [INTEGRATION-ERRORS.md](INTEGRATION-ERRORS.md) | Error integrasi FE-BE, akar masalah, dan checklist perbaikan |
| [TEAM-INVITATION-FLOW.md](TEAM-INVITATION-FLOW.md) | Alur detail undangan tim |
