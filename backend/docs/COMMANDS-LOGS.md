# Command dan Log Backend

Dokumen ini berisi daftar command yang paling sering dipakai untuk menjalankan, memelihara, dan membaca log backend Kolekto.

## Format Ringkas

| Bagian | Isi |
| --- | --- |
| Workflow dev | Install dependency → jalankan infra → generate Prisma → migrate → seed → start API |
| Troubleshooting | Mulai dari log `api`, lalu cek `postgres`, `redis`, atau `minio` sesuai gejala |
| Production-like | Gunakan Docker Compose dan baca log container saat service gagal start |

## Command Dasar

| Command | Fungsi |
| --- | --- |
| `pnpm install` | Install dependency project |
| `pnpm start:dev` | Jalankan backend mode development |
| `pnpm build` | Build aplikasi NestJS dan TypeScript |
| `pnpm start` | Jalankan hasil build dari folder dist |
| `pnpm format` | Format source code dan dokumentasi |
| `pnpm lint` | Jalankan ESLint dan auto-fix |
| `pnpm test` | Jalankan unit test |
| `pnpm test:cov` | Jalankan test dengan coverage |

## Workflow Development

Urutan yang umum dipakai saat mulai kerja di environment lokal.

| Langkah | Command |
| --- | --- |
| 1. Install dependency | `pnpm install` |
| 2. Jalankan service pendukung | `docker compose up -d postgres redis minio` |
| 3. Generate Prisma Client | `pnpm prisma:generate` |
| 4. Jalankan migration | `pnpm prisma:migrate` |
| 5. Seed data jika dibutuhkan | `pnpm seed` |
| 6. Start backend mode watch | `pnpm start:dev` |

Contoh lengkap:

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma:migrate
pnpm seed
pnpm start:dev
```

## Command Prisma

| Command | Fungsi |
| --- | --- |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Jalankan migration development |
| `pnpm prisma:deploy` | Jalankan migration production |
| `pnpm prisma:studio` | Buka Prisma Studio |
| `pnpm seed` | Jalankan seed data |

Prisma Studio dipakai untuk melihat dan mengubah data secara visual saat debugging atau seed validation.

Catatan:

| Tips | Penjelasan |
| --- | --- |
| Schema berubah | Jalankan `pnpm prisma:generate` |
| Sebelum seed | Jalankan migration dulu agar struktur tabel sesuai |

## Command Docker

| Command | Fungsi |
| --- | --- |
| `docker compose up -d` | Jalankan seluruh stack |
| `docker compose up -d api postgres redis minio` | Jalankan service tertentu |
| `docker compose down` | Stop semua service |
| `docker compose down -v` | Stop semua service dan hapus volume |
| `docker compose up -d --build api` | Rebuild image API lalu start |
| `docker compose ps` | Lihat status service |
| `docker compose restart api` | Restart service tertentu |
| `docker compose exec api sh` | Masuk ke container API |
| `docker compose build --no-cache api` | Build image API tanpa cache |

## Cara Baca Log

| Command | Kapan dipakai |
| --- | --- |
| `docker compose logs -f` | Lihat log semua service secara live |
| `docker compose logs -f --timestamps` | Lihat log semua service dengan timestamp |
| `docker compose logs -f api` | Fokus ke log service API |
| `docker compose logs -f --since=1h api` | Lihat log API sejak 1 jam terakhir |
| `docker compose logs -f postgres` | Debug koneksi dan migration database |
| `docker compose logs -f redis` | Debug queue, cache, atau worker |
| `docker compose logs -f minio` | Debug upload file dan storage |
| `docker compose logs --tail=100 api` | Lihat 100 baris terakhir log API |
| `docker compose logs api 2>&1 | grep -i error` | Filter error terbaru dari log API |
| `docker logs -f kolekto-api` | Baca log container langsung |
| `docker compose logs --no-color api > api.log` | Simpan log ke file |
| `pnpm logs:today` | Tail log harian backend dari file `logs/YYYY-MM-DD.log` |
| `clear && docker compose logs -f api` | Bersihkan layar lalu tampilkan log fresh |

## Log Per Service

| Service | Fokus cek |
| --- | --- |
| `api` | Error startup, validasi config, Prisma migrate, auth, request handler |
| `postgres` | Koneksi database, migration, dan startup DB |
| `redis` | Queue, cache, background job, token blacklist |
| `minio` | Upload file, presigned URL, dan penyimpanan bukti |

Catatan file log:

| Lokasi | Keterangan |
| --- | --- |
| `logs/YYYY-MM-DD.log` | Log harian backend saat dijalankan langsung dari folder `backend` |
| `backend/logs/YYYY-MM-DD.log` | Log harian backend saat stack dijalankan dari root repository dengan Docker Compose |

## Command Troubleshooting

| Gejala | Langkah cepat |
| --- | --- |
| Schema Prisma tidak berubah | Jalankan `pnpm prisma:generate` lalu restart server |
| Migration gagal di Docker | Cek log `api` dan `postgres` terlebih dulu |
| Upload file bermasalah | Cek log `minio` dan kredensial `.env` |
| Queue/background job tidak jalan | Cek log `redis` dan worker terkait |
| Container langsung exit | Cek `docker compose logs -f api` dan pastikan migration tidak gagal |
| API tidak bisa diakses | Cek port mapping dan `docker compose ps` |

## Checklist Saat Error

| Urutan | Langkah |
| --- | --- |
| 1 | Cek status container dengan `docker compose ps` |
| 2 | Baca log service yang paling relevan |
| 3 | Pastikan `.env` sesuai dengan mode run yang dipakai |
| 4 | Jalankan `pnpm prisma:generate` bila schema Prisma berubah |
| 5 | Jalankan ulang service setelah perbaikan |

## Referensi Cepat

- Dokumentasi utama backend: [docs/README-BACKEND.md](README-BACKEND.md)
- Flow bisnis: [docs/BUSINESS-FLOW.md](BUSINESS-FLOW.md)
- Endpoint API: [docs/API-ENDPOINTS.md](API-ENDPOINTS.md)
- Redis dan BullMQ: [docs/REDIS-BULLMQ.md](REDIS-BULLMQ.md)
