# Storage MinIO

Kolekto menggunakan MinIO sebagai object storage untuk menyimpan bukti pembayaran dan bukti pengeluaran.

## Ringkasan

| Area | Detail |
| --- | --- |
| Penyimpanan | File binary tidak disimpan di PostgreSQL |
| Metadata | `storageKey`, `originalFileName`, `mimeType`, `fileSize`, dan `proofUrl` bila diperlukan |
| Akses file | Menggunakan signed URL, bukan bucket public default |

## Environment Variable

| Variable | Keterangan |
| --- | --- |
| `MINIO_ENDPOINT=minio` | Host endpoint MinIO |
| `MINIO_PORT=9000` | Port API MinIO |
| `MINIO_ACCESS_KEY=kolekto` | Username MinIO |
| `MINIO_SECRET_KEY=change_this_minio_password` | Password MinIO |
| `MINIO_BUCKET=kolekto-uploads` | Nama bucket default |
| `MINIO_USE_SSL=false` | Mode SSL untuk koneksi MinIO |
| `MINIO_PUBLIC_URL=http://localhost:9000` | URL publik untuk akses object bila diperlukan |
| `MINIO_REGION=us-east-1` | Region eksplisit agar signed URL tidak perlu lookup bucket region |

Catatan:

- `MINIO_ENDPOINT` dipakai backend untuk koneksi internal container ke MinIO
- `MINIO_PUBLIC_URL` dipakai saat membangkitkan signed URL agar browser menerima host yang bisa diakses
- Jika aplikasi berjalan di Docker Compose dari root repo, file env yang dibaca untuk substitusi ada di [`.env`](../../.env)
- Env runtime backend tetap dibaca dari [`backend/.env`](../../backend/.env)

## Bucket

| Item | Keterangan |
| --- | --- |
| Default bucket | `kolekto-uploads` |
| Bootstrap | Dicek saat aplikasi bootstrap melalui `UploadsService` |
| Auto-create | Jika belum ada, service akan mencoba membuat bucket |

## Path File

| Jenis file | Path |
| --- | --- |
| Payment proof | `payments/{teamId}/{YYYY-MM}/{uuid}-{safeFilename}` |
| Expense proof | `expenses/{teamId}/{YYYY-MM}/{uuid}-{safeFilename}` |

Contoh path:

| Contoh | Keterangan |
| --- | --- |
| `payments/0f5a.../2026-04/1d2f-proof-transfer.png` | Bukti pembayaran |
| `expenses/0f5a.../2026-04/9c8b-nota-belanja.pdf` | Bukti pengeluaran |

## Signed URL

| Item | Keterangan |
| --- | --- |
| Public access | File tidak diekspos public secara default |
| Endpoint | `GET /transactions/:id/proof-url` |
| Service internal | `getSignedUrl(storageKey)` dan `deleteFile(storageKey)` |
| TTL signed URL | 15 menit |

## Validasi File

| Aturan | Nilai |
| --- | --- |
| Maksimum upload | 5 MB |
| MIME diizinkan | `image/jpeg`, `image/png`, `application/pdf` |
| Error | `400 Bad Request` jika file tidak sesuai |

## Cleanup Orphan File

| Langkah | Detail |
| --- | --- |
| 1 | Upload ke MinIO dilakukan lebih dulu |
| 2 | Jika insert DB gagal, file dihapus lagi dari MinIO |

Ini penting untuk menjaga bucket tetap bersih dan menghindari orphan object.

## Cara Akses Console MinIO

| Item | Nilai |
| --- | --- |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| Username | Nilai `MINIO_ACCESS_KEY` |
| Password | Nilai `MINIO_SECRET_KEY` |
