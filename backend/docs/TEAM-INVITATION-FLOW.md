# Team Invitation Flow

Dokumen ini menjelaskan kenapa Kolekto membutuhkan `TeamInvitation`, bagaimana alur undangan bekerja, dan bagaimana bedanya dengan `TeamMember`.

## Kenapa Butuh TeamInvitation

Sebelum fitur ini ada, anggota team hanya bisa ditambahkan jika sudah punya akun karena tabel `TeamMember` membutuhkan `userId`.

Masalahnya:

- OWNER atau ADMIN sering ingin mengundang calon anggota yang belum pernah register.
- Calon anggota belum punya `userId`, jadi belum bisa langsung dimasukkan ke `TeamMember`.

Solusinya adalah menyimpan calon anggota lebih dulu di tabel `TeamInvitation`. Data `TeamMember` baru dibuat saat calon anggota benar-benar register atau login lalu menerima undangan.

## Perbedaan TeamInvitation vs TeamMember

| Entitas | Fungsi |
| --- | --- |
| `TeamInvitation` | Menyimpan undangan calon anggota yang belum atau belum tentu menjadi anggota team |
| `TeamMember` | Menyimpan anggota team yang sudah benar-benar terhubung ke `userId` |

Perbedaan penting:

| Area | `TeamInvitation` | `TeamMember` |
| --- | --- | --- |
| Butuh `userId` | Tidak | Ya |
| Bisa untuk user belum terdaftar | Ya | Tidak |
| Menentukan akses team | Tidak | Ya |
| Status utama | `PENDING`, `ACCEPTED`, `EXPIRED`, `CANCELLED` | `ACTIVE`, `INVITED`, `INACTIVE`, `LEFT`, `BANNED` |
| Kapan dibuat | Saat OWNER/ADMIN mengundang | Saat user menerima undangan atau ditambahkan langsung |

## Flow User Belum Punya Akun

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN membuat undangan baru |
| 2 | Backend membuat `TeamInvitation` dengan `inviteCode` unik |
| 3 | Frontend membagikan invite link ke calon anggota |
| 4 | Calon anggota register atau login |
| 5 | Frontend memanggil endpoint accept invitation |
| 6 | Backend membuat `TeamMember` dengan `userId` dari akun yang baru login |
| 7 | Backend update undangan menjadi `ACCEPTED` |

## Flow User Sudah Punya Akun

| Langkah | Detail |
| --- | --- |
| 1 | OWNER atau ADMIN membuat undangan |
| 2 | User yang sudah punya akun membuka preview undangan |
| 3 | User login jika belum ada sesi aktif |
| 4 | User memanggil endpoint accept invitation |
| 5 | Backend membuat `TeamMember` dan menutup undangan dengan status `ACCEPTED` |

## Aturan Create Invitation

| Aturan | Penjelasan |
| --- | --- |
| Akses | Hanya `OWNER` atau `ADMIN` dalam team |
| Nama calon anggota | Wajib diisi |
| Email / nomor HP | Minimal salah satu wajib ada |
| `roleId` | Opsional, tetapi jika diisi harus milik team yang sama |
| `inviteCode` | Unique, uppercase, mudah dibaca, memuat format `SINGKATANTIM-TAHUN-SUFFIX`, dan sulit ditebak |
| `inviteLink` | Menggunakan `APP_WEB_URL` jika tersedia, jika tidak backend mengembalikan path relatif `/invite/:inviteCode` |
| Status awal | `PENDING` |
| `expiresAt` | Opsional |

## Aturan Preview Invitation

| Aturan | Penjelasan |
| --- | --- |
| Akses | Public atau authenticated |
| Data sensitif | Tidak boleh menampilkan email atau nomor HP lengkap |
| Tujuan | Menampilkan nama team, nama calon anggota, role, status, dan masa berlaku |

## Aturan Accept Invitation

| Aturan | Penjelasan |
| --- | --- |
| Akses | Wajib authenticated |
| Status | Hanya undangan `PENDING` yang boleh dipakai |
| Kedaluwarsa | Undangan yang lewat `expiresAt` harus dianggap `EXPIRED` |
| Membership | Jika user sudah menjadi member team, accept harus ditolak |
| TeamMember | Selalu dibuat dengan `systemRole=MEMBER` |
| `roleId` | Mengikuti data invitation jika ada |
| `status` member | `ACTIVE` |
| Audit log | `ACCEPT_INVITATION` harus disimpan |

## Aturan Cancel Invitation

| Aturan | Penjelasan |
| --- | --- |
| Akses | Hanya `OWNER` atau `ADMIN` |
| Status yang bisa dibatalkan | Hanya `PENDING` |
| Hasil | Status undangan menjadi `CANCELLED` |
| Audit log | `CANCEL_INVITATION` harus disimpan |

## Relasi ke Register

Register normal tetap berjalan seperti biasa.

Jika frontend membawa `inviteCode` saat register:

| Langkah | Detail |
| --- | --- |
| 1 | Backend membuat user baru |
| 2 | Backend memvalidasi invite code |
| 3 | Backend menerima undangan setelah akun berhasil dibuat |
| 4 | Response register mengembalikan token dan info team hasil invitation |

Jika frontend tidak mengirim `inviteCode`, maka register tetap berjalan normal tanpa perubahan flow.
