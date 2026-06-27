# Env Setup Ringkas

Panduan singkat pembagian environment variable untuk Kolekto.

## Saat Menjalankan `docker compose` Dari Root

- Root [`.env`](./.env) dipakai Docker Compose untuk substitusi variabel di [docker-compose.yml](./docker-compose.yml)
- [`backend/.env`](./backend/.env) dipakai runtime API di dalam container
- [web-admin/.env.local](./web-admin/.env.local) dipakai hanya untuk local dev frontend

## File dan Tugasnya

### Root `.env`

Isi yang umum dipakai:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `NEXT_PUBLIC_API_URL`

### `backend/.env`

Isi yang dibaca NestJS API:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_USE_SSL`
- `MINIO_REGION`
- `MINIO_PUBLIC_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

### `web-admin/.env.local`

Isi untuk local dev frontend:

- `NEXT_PUBLIC_API_URL`

## Aturan Penting

- `DATABASE_URL`, `REDIS_HOST`, dan `MINIO_ENDPOINT` di backend container harus pakai hostname internal Docker
- `MINIO_PUBLIC_URL` harus URL yang bisa dibuka browser
- `NEXT_PUBLIC_API_URL` harus mengarah ke API yang dipakai frontend

## Contoh Production

```env
# root .env
POSTGRES_DB=kolekto_db
POSTGRES_USER=kolekto
POSTGRES_PASSWORD=kolekto_password
MINIO_ACCESS_KEY=kolekto
MINIO_SECRET_KEY=change_this_minio_password
NEXT_PUBLIC_API_URL=https://kolekto.anwarudin.web.id/api
```

```env
# backend/.env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://kolekto:kolekto_password@kolekto-postgres:5432/kolekto_db?schema=public
REDIS_HOST=kolekto-redis
REDIS_PORT=6379
MINIO_ENDPOINT=kolekto-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=kolekto
MINIO_SECRET_KEY=change_this_minio_password
MINIO_BUCKET=kolekto-uploads
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=http://localhost:9000
```

## Contoh Local

```env
# backend/.env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://kolekto:kolekto_password@localhost:5432/kolekto_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=kolekto
MINIO_SECRET_KEY=change_this_minio_password
MINIO_BUCKET=kolekto-uploads
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=http://localhost:9000
```

```env
# web-admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```


