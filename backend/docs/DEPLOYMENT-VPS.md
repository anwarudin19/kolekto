# Deployment VPS

Dokumen ini menjelaskan deployment Kolekto Backend ke VPS menggunakan Docker Compose.

## Prasyarat

| Kebutuhan | Keterangan |
| --- | --- |
| OS VPS | Linux Ubuntu 22.04 atau setara |
| Docker | Docker Engine terpasang |
| Compose | Docker Compose plugin terpasang |
| Domain | Domain atau subdomain untuk API |
| Proxy | Reverse proxy Nginx atau Caddy |

## Langkah Deploy

| Langkah | Command / Aksi |
| --- | --- |
| 1 | Clone repository ke VPS |
| 2 | Masuk ke folder backend |
| 3 | Copy environment dengan `cp .env.example .env` |
| 4 | Ubah nilai production pada `.env` |
| 5 | Jalankan `docker compose up -d --build` |

## Environment Variable Production

| Variable | Keterangan |
| --- | --- |
| `NODE_ENV=production` | Aktifkan mode production |
| `JWT_SECRET` | Secret JWT yang kuat |
| `JWT_EXPIRES_IN` | Masa berlaku access token, saat ini default diset `3m` |
| `BILLING_EOD_CRON` | Cron scheduler billing EOD, default `55 23 * * *` |
| `INVOICE_REMINDER_CRON` | Cron scheduler pengingat tagihan, default `0 8 * * *` |
| `DATABASE_URL` | URL database production |
| `MINIO_SECRET_KEY` | Secret MinIO production |
| `MINIO_PUBLIC_URL` | URL publik jika object storage memakai domain sendiri |

Contoh `DATABASE_URL`:

```env
DATABASE_URL=postgresql://kolekto:strong_password@postgres:5432/kolekto_db?schema=public
```

## Service Utama

### PostgreSQL

| Item | Keterangan |
| --- | --- |
| Image | `postgres:16-alpine` |
| Port internal | `5432` |
| Volume | `postgres_data` |
| Environment | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |

Saran production:

| Saran | Penjelasan |
| --- | --- |
| Password kuat | Gunakan password yang aman |
| Akses internal | Batasi akses port DB hanya internal bila memungkinkan |
| Backup | Aktifkan backup terjadwal |

### Redis

| Item | Keterangan |
| --- | --- |
| Image | `redis:7-alpine` |
| Port | `6379` |
| Volume | `redis_data` |
| Mode | Appendonly aktif |

Redis dipakai untuk:

| Fungsi | Keterangan |
| --- | --- |
| BullMQ | Queue backend |
| Cache | Cache ringan |
| Rate limit | Login rate limit berbasis Redis |
| Blacklist | Blacklist token JWT |

Saran production:

| Saran | Penjelasan |
| --- | --- |
| Internal network | Batasi Redis hanya internal |
| Password | Gunakan password jika Redis dipisah |
| Monitoring | Monitor memory dan restart policy |

### MinIO

| Item | Keterangan |
| --- | --- |
| API port | `9000` |
| Console port | `9001` |
| Volume | `minio_data` |

Saran production:

| Saran | Penjelasan |
| --- | --- |
| Ganti root password | Gunakan secret yang aman |
| Private network | Letakkan di jaringan private |
| Console access | Hanya expose console ke admin berwenang |

## Reverse Proxy

### Nginx

| Item | Keterangan |
| --- | --- |
| Mode | Nginx berjalan di host VPS, bukan di container |
| Public access | Hanya lewat port `80` dan `443` |
| Upstream | Request diteruskan ke `127.0.0.1:3000` |

Contoh konfigurasi Nginx:

```nginx
server {
    listen 80;
    server_name kolekto.anwarudin.web.id;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Pastikan header berikut diteruskan:

| Header | Fungsi |
| --- | --- |
| `Host` | Menjaga host asli request |
| `X-Forwarded-For` | Meneruskan IP client |
| `X-Forwarded-Proto` | Menjaga skema HTTP/HTTPS |

### Caddy

| Item | Keterangan |
| --- | --- |
| HTTPS | Terminasi HTTPS di Caddy |
| Proxy | Proxy ke `localhost:3000` |

## Port yang Dibutuhkan

| Port | Fungsi |
| --- | --- |
| `80` | HTTP redirect |
| `443` | HTTPS |
| `127.0.0.1:3000` | API |
| `127.0.0.1:9000` | MinIO API |
| `127.0.0.1:9001` | MinIO Console |

PostgreSQL dan Redis tidak perlu expose port ke host untuk production.

## Production Port Exposure

| Service | Rekomendasi |
| --- | --- |
| API | `127.0.0.1:3000:3000` |
| PostgreSQL | Tidak expose `ports` |
| MinIO | `127.0.0.1:9000:9000` dan `127.0.0.1:9001:9001` |
| Redis | Tidak expose `ports` |

Alasan utama:

| Service | Alasan |
| --- | --- |
| API | Tidak bisa diakses langsung dari internet dan hanya lewat proxy |
| PostgreSQL | Berisi data sensitif |
| MinIO | Cukup diakses internal oleh API |
| Redis | Idealnya hanya internal Docker network |

Flow request produksi:

```text
Internet -> Nginx 80/443 -> http://127.0.0.1:3000 -> API container -> PostgreSQL / MinIO / Redis
```

## Backup Data

### Backup PostgreSQL

```bash
docker exec kolekto-postgres pg_dump -U kolekto -d kolekto_db > backup.sql
```

| Saran | Penjelasan |
| --- | --- |
| Harian | Jalankan backup harian |
| Offsite | Simpan ke remote object storage |
| Restore test | Uji restore secara berkala |

### Backup MinIO Volume

| Metode | Keterangan |
| --- | --- |
| Snapshot | Snapshot volume block storage |
| Sync | Rsync atau backup ke object storage lain |
| Host directory | Backup directory volume Docker host |

Pastikan backup database dan MinIO dilakukan berpasangan agar metadata file dan object tetap sinkron.

## Update Deployment

| Langkah | Command |
| --- | --- |
| Pull update | `git pull` |
| Build dan start ulang | `docker compose up -d --build` |
| Migration production | `prisma migrate deploy` dijalankan saat container API start |

Jika hanya mengubah environment variable seperti `JWT_EXPIRES_IN`, `BILLING_EOD_CRON`, atau `INVOICE_REMINDER_CRON`, tetap lakukan restart container API agar konfigurasi baru terbaca saat bootstrap:

```bash
docker compose up -d --build api
```

## Catatan Production

| Catatan | Penjelasan |
| --- | --- |
| HTTPS | Gunakan HTTPS |
| Monitoring | Aktifkan monitoring container |
| Secret | Pisahkan secret dari repository |
| Audit log | Audit log bisnis tetap di database |
| Technical log | Arahkan ke stdout/stderr untuk logging platform |
| BullMQ | Worker BullMQ berjalan di proses API yang sama sehingga log queue muncul di log container API |
