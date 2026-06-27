# Redis dan BullMQ

Dokumen ini menjelaskan pemakaian Redis dan BullMQ di backend Kolekto dalam format yang lebih ringkas dan konsisten.

## Ringkasan Penggunaan

| Area | Fungsi |
| --- | --- |
| Queue | Proses background job melalui BullMQ |
| Cache | Cache ringan untuk data baca tertentu |
| Rate limit | Counter Redis untuk login dan request API |
| Blacklist token | Simpan token JWT yang sudah logout |

Redis tidak menggantikan PostgreSQL. Data utama tetap berada di PostgreSQL.

## Queue yang Tersedia

| Queue | Tujuan | Processor |
| --- | --- | --- |
| `billing-generate-invoices` | Generate tagihan harian berbasis due date dan skip tagihan yang sudah ada | `BillingProcessor` |
| `invoice-reminders` | Pengingat tagihan `H-3`, `H-1`, dan overdue | `ReminderProcessor` |
| `notifications` | Buat notifikasi async untuk pembayaran, donasi, dan pengingat | `NotificationProcessor` |
| `file-cleanup` | Hapus orphan file MinIO jika proses DB gagal | `FileCleanupProcessor` |

## Job Flow

### Billing harian EOD

| Langkah | Detail |
| --- | --- |
| 1 | Scheduler billing jalan sesuai cron `BILLING_EOD_CRON` (default setiap hari pukul 23:55) |
| 2 | Scheduler hanya enqueue job |
| 3 | `BillingProcessor` memproses generate tagihan |
| 4 | Processor menentukan due date dari prioritas `team -> role -> default sistem` |
| 5 | Jika due date hari libur nasional, processor mundur maksimal 7 hari ke belakang |
| 6 | Tagihan hanya dibuat saat hari ini adalah `H-5` dari due date efektif |
| 7 | Tagihan yang sudah ada dilewati |
| 8 | Activity log bisnis tetap dicatat |

### Pengingat tagihan

| Langkah | Detail |
| --- | --- |
| 1 | Scheduler pengingat berjalan sesuai cron `INVOICE_REMINDER_CRON` (default setiap hari pukul 08:00) |
| 2 | Scheduler hanya enqueue job reminder |
| 3 | `ReminderProcessor` mencari tagihan `UNPAID` atau `PARTIAL` |
| 4 | Processor menghitung status `H-3`, `H-1`, atau `OVERDUE` |
| 5 | Jika belum pernah dikirim, data `InvoiceReminder` disimpan |
| 6 | Processor enqueue notification job |
| 7 | `NotificationProcessor` membuat record notifikasi |

### Pembayaran approved atau rejected

| Langkah | Detail |
| --- | --- |
| 1 | API memproses transaksi utama di PostgreSQL |
| 2 | Setelah transaksi utama sukses, API enqueue notification job |
| 3 | Worker notification menyimpan notifikasi ke database |

### Cleanup file upload

| Langkah | Detail |
| --- | --- |
| 1 | API upload file ke MinIO |
| 2 | Jika proses database gagal, API enqueue file cleanup job |
| 3 | Worker cleanup menghapus object berdasarkan `storageKey` |

## Cara Menjalankan Redis

| Skenario | Command |
| --- | --- |
| Jalankan Redis saja | `docker compose up -d redis` |
| Jalankan service inti | `docker compose up -d postgres redis minio` |

## Cara Melihat Log Processor

| Kondisi | Command |
| --- | --- |
| Worker BullMQ satu proses dengan API | `docker compose logs -f api` |

Log yang biasanya terlihat:

- `Monthly billing job enqueued`
- `Job pengingat tagihan berhasil dimasukkan ke antrean`
- `Processing billing job`
- `Processing reminder job`
- `Processing notification job`
- `Processing file cleanup job`

## Cache Strategy

| Cache | Fungsi |
| --- | --- |
| `account balance` | Cache saldo account |
| `unread notification badge` | Cache jumlah notifikasi belum dibaca |
| `login attempt counter` | Counter login attempt |
| `API request counter` | Counter request API umum |

Prinsip cache:

| Prinsip | Penjelasan |
| --- | --- |
| Source of truth | PostgreSQL tetap sumber data utama |
| Cache | Hanya akselerator baca |
| Mutasi finansial | Cache balance dihapus saat data berubah |
| Notifikasi | Cache unread count dihapus saat status berubah |

Contoh key:

| Key | Kegunaan |
| --- | --- |
| `cache:account-balance:{teamId}:{accountId}` | Cache saldo account |
| `cache:notifications:unread:{userId}` | Cache unread notification count |
| `rate:login:{email}:{ip}` | Counter login |
| `rate:api:{ip}:{method}:{path}` | Counter request API |

## Rate Limit

| Lapisan | Fungsi |
| --- | --- |
| `@nestjs/throttler` | Throttle dasar global |
| Redis counter | Login attempt |
| Redis counter | Request API umum |

Dengan pola ini, backend tetap punya throttling dasar walau Redis bermasalah, tetapi saat Redis aktif kita tetap mendapatkan limit berbasis counter Redis untuk jalur penting.

## Token Blacklist

| Langkah | Detail |
| --- | --- |
| 1 | JWT diambil dari Authorization header |
| 2 | Token di-hash dengan SHA-256 |
| 3 | Hash disimpan di Redis dengan key `jwt:blacklist:{tokenHash}` |
| 4 | TTL mengikuti sisa masa aktif token |

`JwtAuthGuard` akan menolak token yang sudah ada di blacklist.

## Troubleshooting Redis

### Redis tidak bisa diakses

| Cek | Keterangan |
| --- | --- |
| `REDIS_HOST` | Pastikan sesuai environment |
| `REDIS_PORT` | Pastikan port benar |
| Container Redis | Pastikan service hidup |
| Network antar service | Pastikan API bisa reach Redis |

Command cek:

```bash
docker compose ps
docker compose logs -f redis
```

### Queue job tidak jalan

| Cek | Keterangan |
| --- | --- |
| Service `api` hidup | Worker berjalan di proses API |
| Redis hidup | Queue butuh Redis aktif |
| Log API | Lihat error koneksi BullMQ |

### Redis down

| Dampak | Keterangan |
| --- | --- |
| Cache | Memakai fallback warning log |
| Endpoint utama | Tetap jalan jika tidak bergantung Redis |
| Queue async | Akan terdampak bila Redis tidak tersedia |
