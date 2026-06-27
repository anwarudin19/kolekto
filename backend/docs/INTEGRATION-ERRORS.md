# Daftar Error Integrasi FE-BE

Dokumen ini merangkum error integrasi yang sudah muncul saat pengujian frontend ke backend Kolekto, beserta akar masalah, tindakan perbaikan, dan status follow-up.

## Ringkasan

| Area | Fokus |
| --- | --- |
| Invitation create | Validasi payload, format `roleId`, dan response `inviteCode` |
| Invitation cancel | Method endpoint, payload `reason`, dan status deploy production |
| Invitation link | Nilai `inviteLink` agar tidak fallback ke `localhost` |
| Team join | Payload FE berlebih dan pesan error `inviteCode` tidak valid |
| Deploy | Kebutuhan rebuild image API agar route/perubahan baru aktif |

## Checklist Error

| No | Flow | Endpoint | Error yang Muncul | Penyebab | Yang Harus Diperbaiki | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Create invitation | `POST /teams/:teamId/invitations` | `roleId harus berupa UUID yang valid` | FE mengirim `roleId: "admin"`, padahal backend mengharapkan UUID role tim | FE harus mengirim UUID role dari endpoint roles, atau tidak mengirim `roleId` sama sekali jika tidak diperlukan | Sudah jelas, FE perlu menyesuaikan |
| 2 | Cancel invitation | `PATCH /teams/:teamId/invitations/:invitationId/cancel` | `Cannot PATCH .../cancel` / `404 Not Found` | Server production masih memakai build lama saat route `PATCH` belum aktif | Redeploy backend dengan `docker compose up -d --build api`; selama belum redeploy FE bisa pakai fallback `POST` ke path yang sama | Sudah diperbaiki di kode, perlu redeploy production |
| 3 | Cancel invitation | `PATCH` atau `POST /teams/:teamId/invitations/:invitationId/cancel` | Kebingungan apakah `reason` disimpan | `reason` tidak disimpan di tabel invitation, tetapi di audit log metadata | Tidak perlu ubah FE. Jika butuh histori alasan cancel, baca audit log | Sesuai desain saat ini |
| 4 | Invitation link | Response create invitation | `inviteLink` sempat mengarah ke `http://localhost:3000/...` | Backend dulu fallback ke `localhost` saat `APP_WEB_URL` tidak di-set | Set `APP_WEB_URL` di environment production. Jika tidak ada, backend kini mengembalikan path relatif `/invite/:inviteCode` | Sudah diperbaiki di kode |
| 5 | Invitation code format | Response create invitation | Prefix kode undangan tidak sesuai ekspektasi tim | Prefix sebelumnya diambil dari `team.inviteCode`, bukan singkatan nama tim | Backend kini memakai singkatan nama tim dengan format `SINGKATANTIM-TAHUN-SUFFIX`, misalnya `CBP-2026-AB3D` | Sudah diperbaiki di kode, perlu redeploy production |
| 6 | Join team | `POST /teams/join` | `Field name tidak diperbolehkan` | FE mengirim field ekstra `name`, sedangkan global validation memakai `forbidNonWhitelisted: true` | FE idealnya hanya mengirim `inviteCode`. Backend kini dibuat lebih toleran khusus endpoint join agar field ekstra diabaikan | Sudah diperbaiki di kode, perlu redeploy production |
| 7 | Join team | `POST /teams/join` | Pesan error tidak cukup jelas saat `inviteCode` salah | Service join sebelumnya mengembalikan pesan umum `Kode undangan tidak valid` | Backend kini memakai pesan `Kode undangan tidak valid atau tidak ditemukan` | Sudah diperbaiki di kode, perlu redeploy production |

## Payload dan Response yang Benar

### 1. Create Invitation

Request FE yang benar:

```json
{
  "invitedName": "Aan",
  "invitedEmail": "aan@example.com",
  "invitedPhone": "08123456789",
  "roleId": "550e8400-e29b-41d4-a716-446655440001"
}
```

Catatan:

- `roleId` opsional.
- Jika dikirim, nilainya harus UUID role tim.
- Jangan kirim label seperti `admin` atau `member` sebagai `roleId`.

Response BE saat sukses:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "inviteCode": "CBP-2026-AB3D",
  "inviteLink": "/invite/CBP-2026-AB3D",
  "status": "PENDING"
}
```

### 2. Cancel Invitation

Request FE yang benar:

```json
{
  "reason": "Undangan dibatalkan oleh admin"
}
```

Kontrak endpoint saat ini:

- Resmi: `PATCH /teams/:teamId/invitations/:invitationId/cancel`
- Fallback legacy: `POST /teams/:teamId/invitations/:invitationId/cancel`

Response sukses:

```json
{
  "message": "Undangan berhasil dibatalkan"
}
```

### 3. Join Team

Request FE yang direkomendasikan:

```json
{
  "inviteCode": "CBP-2026-AB3D"
}
```

Hindari mengirim field lain seperti `name` karena tidak dipakai backend.

Response error saat kode tidak valid:

```json
{
  "statusCode": 404,
  "message": "Kode undangan tidak valid atau tidak ditemukan",
  "error": "Tidak Ditemukan"
}
```

## Perbaikan yang Masih Perlu Dicek

| Area | Yang dicek | Cara cek |
| --- | --- | --- |
| Production deploy | Apakah route dan error terbaru sudah aktif | Jalankan `docker compose up -d --build api` di VPS |
| FE payload invitation | Apakah `roleId` sudah UUID | Cek request body dari network tab |
| FE cancel method | Apakah sudah pakai `PATCH` setelah redeploy | Tes endpoint cancel dari FE atau Postman |
| FE join payload | Apakah hanya kirim `inviteCode` | Cek request body `POST /teams/join` |
| APP_WEB_URL | Apakah sudah di-set di production | Cek file `.env` production |
| Nager.Date sync | Apakah server production bisa mengakses `https://date.nager.at` | Cek log API saat billing berjalan |

## Rekomendasi Praktis

- Gunakan dokumen ini sebagai checklist saat testing integrasi FE-BE.
- Setelah ada perubahan backend yang mengubah route, DTO, atau response, selalu lakukan redeploy image API.
- Untuk debugging production, cek juga [docs/COMMANDS-LOGS.md](COMMANDS-LOGS.md) dan [docs/DEPLOYMENT-VPS.md](DEPLOYMENT-VPS.md).
