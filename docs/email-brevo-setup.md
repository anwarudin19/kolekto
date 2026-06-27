# Setup Brevo SMTP untuk Kolekto

Dokumen singkat ini menjelaskan cara menyiapkan Brevo SMTP untuk email transactional di Kolekto.

## 1. Daftar di Brevo

1. Buka https://www.brevo.com/
2. Buat akun atau login.
3. Masuk ke dashboard Brevo.

## 2. Ambil SMTP Login

1. Buka menu `SMTP & API` di Brevo.
2. Cari bagian `SMTP` atau `SMTP Credentials`.
3. Salin `SMTP login` yang diberikan Brevo.
4. Gunakan nilai itu sebagai `SMTP_USER`.

## 3. Generate SMTP Key

1. Di halaman `SMTP & API`, pilih `Generate a new SMTP key`.
2. Beri nama key sesuai kebutuhan, misalnya `kolekto-prod`.
3. Simpan key tersebut dengan aman.
4. Gunakan nilai itu sebagai `SMTP_PASS`.
5. Jangan gunakan API key biasa. Kolekto membutuhkan SMTP Key.

## 4. Isi `.env`

Tambahkan konfigurasi berikut di backend:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=isi_smtp_login_dari_brevo
SMTP_PASS=isi_smtp_key_dari_brevo
SMTP_FROM="Kolekto <noreply@kolekto.anwarudin.web.id>"
APP_FRONTEND_URL=https://domain-frontend-kamu
```

Catatan:

- `SMTP_PASS` tidak disimpan di database.
- Jangan commit `.env` ke GitHub.
- Jika memakai domain lokal saat development, tetap gunakan nilai dummy di `.env.example`.

## 5. Verifikasi domain atau subdomain sender

1. Di Brevo, tambahkan dan verifikasi domain yang dipakai untuk mengirim email.
2. Jika menggunakan subdomain khusus seperti `noreply@kolekto.anwarudin.web.id`, pastikan DNS verifikasi sudah lengkap.
3. Ikuti instruksi SPF, DKIM, dan domain verification dari Brevo.
4. Setelah verifikasi selesai, status sender akan lebih stabil dan email lebih kecil kemungkinan masuk spam.

## 6. Test forgot password

1. Login ke aplikasi.
2. Kirim request `POST /auth/forgot-password` dari frontend atau API client.
3. Pastikan email user terdaftar.
4. Backend akan mengirim email reset password melalui template aktif `RESET_PASSWORD`.
5. Response tetap generik:
   `Jika email terdaftar, link reset password akan dikirim.`

## 7. Test send email template dari admin panel

1. Login sebagai `SUPER_ADMIN`.
2. Buka `Settings / Email Templates`.
3. Pilih template yang ingin diuji.
4. Klik `Send Test`.
5. Masukkan alamat email tujuan.
6. Kirim test email dan cek inbox.

## 8. Troubleshooting

Jika email gagal terkirim:

1. Pastikan `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, dan `SMTP_PASS` sudah benar.
2. Pastikan `SMTP_PASS` adalah SMTP Key, bukan API Key.
3. Cek apakah sender domain sudah diverifikasi di Brevo.
4. Pastikan `SMTP_FROM` memakai alamat sender yang valid.
5. Periksa tabel `EmailLog` untuk melihat status `FAILED` dan pesan error umum.
6. Pastikan Redis tidak diperlukan untuk pengiriman email. Jika Redis tidak aktif, sistem akan memakai memory cache sementara.
7. Cek log backend untuk pesan error tanpa membagikan secret.
