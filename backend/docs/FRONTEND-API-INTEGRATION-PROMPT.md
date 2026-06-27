# Prompt Integrasi Frontend ke Backend Kolekto

Gunakan prompt ini untuk meminta AI atau tim frontend membangun integrasi aplikasi ke backend Kolekto.

---

## Prompt

Kamu adalah senior frontend engineer. Tugasmu adalah mengintegrasikan frontend aplikasi Kolekto ke backend yang sudah tersedia. Fokus utama adalah membuat koneksi data yang rapi, aman, dan mudah dipelihara.

### Tujuan

- Integrasikan frontend ke API backend Kolekto.
- Gunakan autentikasi JWT Bearer token.
- Tampilkan dan kelola data team, member, role, account, invoice, payment, transaction, donation, notification, audit log, dan profile user.
- Dukung upload file bukti payment dan expense via `multipart/form-data`.
- Pastikan state frontend sinkron dengan status data di backend.

### Informasi Backend

- Base URL API: gunakan environment variable deployment yang aktif, misalnya `NEXT_PUBLIC_API_URL` atau `VITE_API_URL`
- Header auth: `Authorization: Bearer <jwt_token>`
- Dokumentasi API: `GET /docs`
- Dokumen referensi:
  - `docs/API-ENDPOINTS.md`
  - `docs/BUSINESS-FLOW.md`
  - `docs/DATABASE-SCHEMA.md`
  - `docs/COMMANDS-LOGS.md`

### Aturan Integrasi

#### 1) Authentication

- Gunakan register, login, logout, dan current user profile.
- Simpan JWT token dengan aman di frontend sesuai best practice proyek yang dipakai.
- Setiap request terproteksi wajib mengirim Bearer token.
- Jika token expired atau invalid, redirect ke halaman login.

#### 2) Team Context

- Semua fitur bisnis berjalan dalam konteks team aktif.
- Setelah user login, tampilkan daftar team yang dimiliki atau diikuti.
- Simpan `activeTeamId` di state global atau store.
- Semua endpoint team-scoped harus memakai `teamId` yang aktif.

#### 3) Data yang Perlu Dibangun di UI

Bangun halaman atau komponen untuk:

- Auth: login, register, logout, profile
- Team: daftar team, create team, join team, edit team
- Member: list member, tambah member, edit member
- Role: list role, tambah role, edit role
- Account: list account, tambah account, edit account, lihat balance
- Invoice: list invoice, detail invoice, generate invoice, update invoice
- Payment: submit payment, list payment, approve, reject
- Transaction: list transaction, detail transaction, expense submission, proof URL
- Donation: submit donation, list donation
- Notification: list notification, unread count, mark as read
- Audit log: list business audit log

#### 4) Upload File

- Payment proof dan expense proof wajib memakai `multipart/form-data`.
- Field file bernama `proof`.
- Validasi file di frontend sebelum upload:
  - `image/jpeg`
  - `image/png`
  - `application/pdf`
- Maksimum ukuran file: 5 MB.
- Tampilkan progress upload dan error message yang jelas.

#### 5) State Management

- Gunakan state management yang konsisten untuk:
  - user auth state
  - token session
  - active team
  - unread notification count
  - list data per module
- Hindari fetch berulang yang tidak perlu.
- Setelah create/update/approve/reject, refresh data terkait atau lakukan optimistic update jika aman.

#### 6) Error Handling

- Tangani status error berikut dengan jelas:
  - `401` unauthenticated
  - `403` unauthorized / bukan member team / bukan OWNER-ADMIN
  - `404` data tidak ditemukan
  - `400` validasi request gagal
  - `409` duplikasi data atau konflik bisnis
  - `500` error server
- Tampilkan pesan error yang mudah dipahami user.
- Jika backend mengembalikan pesan validasi per field, tampilkan di form field terkait.

#### 7) Business Rules yang Harus Dipatuhi

- Invoice adalah tagihan, bukan saldo kas.
- Saldo account dihitung dari transaksi, bukan field balance manual.
- Payment status awal adalah `PENDING`.
- Payment `APPROVED` baru membuat income transaction.
- Payment `REJECTED` tidak mengubah saldo.
- Donation langsung membuat income transaction.
- Expense manual langsung membuat expense transaction.
- Notifikasi harus bisa dibaca dan ditandai sebagai read.

### Pola Request

Gunakan pendekatan seperti ini:

- `GET` untuk list dan detail data.
- `POST` untuk create atau action bisnis.
- `PATCH` untuk update.
- `multipart/form-data` untuk upload bukti.
- Sertakan Bearer token di setiap request protected.

### Prioritas Integrasi

Prioritaskan implementasi berikut:

1. Login dan register
2. Team list dan team switcher
3. Dashboard ringkas
4. Member, role, dan account management
5. Invoice list dan detail
6. Submit payment dan approval flow
7. Transaction dan donation
8. Notification center
9. Audit log

### Deliverables yang Diharapkan

- Komponen UI yang terhubung ke API
- Service layer atau API client yang terstruktur
- TypeScript types untuk request dan response
- Handling loading, empty state, error state
- Integration untuk upload file dan preview proof URL
- Dokumentasi singkat cara menjalankan frontend dengan backend ini

### Catatan Implementasi

- Gunakan environment variable untuk base URL API, misalnya `NEXT_PUBLIC_API_URL` atau `VITE_API_URL`.
- Pastikan tidak ada hardcode URL di komponen.
- Pisahkan layer API, state, dan presentational component.
- Jika memakai React, gunakan hooks atau query library yang sesuai.
- Jika memakai Next.js, perhatikan perbedaan server/client component saat akses token.

### Output yang Diminta

Berikan hasil implementasi frontend yang siap terkoneksi ke backend Kolekto, dengan struktur kode yang rapi, aman, dan mudah dikembangkan.

---

## Versi Singkat untuk Copy-Paste

Kalau ingin prompt pendek, gunakan ini:

> Kamu adalah senior frontend engineer. Integrasikan frontend aplikasi Kolekto ke backend yang tersedia melalui environment variable API base URL proyek, misalnya `NEXT_PUBLIC_API_URL` atau `VITE_API_URL`. Gunakan JWT Bearer token untuk semua endpoint protected, dukung upload file `multipart/form-data` untuk payment proof dan expense proof, dan bangun UI untuk auth, team, member, role, account, invoice, payment, transaction, donation, notification, dan audit log. Patuh pada business rules backend: invoice bukan saldo, payment `APPROVED` baru membuat income transaction, donation dan expense langsung membuat transaction, serta saldo account dihitung dari transaksi. Gunakan environment variable untuk API base URL, pisahkan API layer dari UI, tangani loading/error/empty state, dan pastikan state frontend selalu sinkron dengan backend.
