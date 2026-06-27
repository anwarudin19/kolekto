import { Injectable } from '@nestjs/common';

export type AssistResponse = {
  mode: 'guest' | 'team';
  answer: string;
  suggestions: string[];
  actions: Array<Record<string, unknown>>;
};

const TEAM_DATA_KEYWORDS = [
  'saldo saya',
  'saldo team',
  'saldo tim',
  'tagihan saya',
  'invoice saya',
  'anggota siapa',
  'siapa belum bayar',
  'belum bayar',
  'pembayaran saya',
  'data team',
  'data tim',
  'laporan team',
  'laporan tim',
  'transaksi team',
  'transaksi tim',
];

@Injectable()
export class AssistGuestService {
  answer(message: string): AssistResponse {
    const normalized = this.normalize(message);

    if (this.containsAny(normalized, TEAM_DATA_KEYWORDS)) {
      return this.reply(
        'Untuk melihat data team, tagihan, saldo, anggota, transaksi, pembayaran, atau laporan kas, kamu perlu login dulu agar Kola bisa mengecek akses dan menjaga data tetap aman.',
        ['Cara login', 'Cara join team', 'Apa itu Kolekto?'],
      );
    }

    if (this.containsAny(normalized, ['apa itu', 'kolekto itu', 'tentang kolekto'])) {
      return this.reply(
        'Kolekto adalah aplikasi untuk membantu komunitas atau team mengelola iuran, tagihan, pembayaran, bukti bayar, reminder, dan laporan kas secara lebih tertib.',
        ['Fitur utama', 'Cara daftar', 'Cara kerja iuran'],
      );
    }

    if (this.containsAny(normalized, ['fitur', 'utama', 'bisa apa'])) {
      return this.reply(
        'Fitur utama Kolekto meliputi manajemen team dan anggota, role owner/admin/member, pembuatan tagihan iuran, upload bukti bayar, validasi pembayaran, reminder, pencatatan pemasukan dan pengeluaran, serta laporan kas.',
        ['Cara membuat team', 'Cara join team', 'Cara kerja pembayaran'],
      );
    }

    if (this.containsAny(normalized, ['daftar', 'registrasi', 'buat akun'])) {
      return this.reply(
        'Untuk daftar, buka halaman register atau tautan undangan team, isi nama, email, nomor telepon bila ada, dan password. Jika daftar dari undangan, akun bisa langsung terhubung ke team terkait.',
        ['Cara login', 'Cara join team', 'Role owner/admin/member'],
      );
    }

    if (this.containsAny(normalized, ['login', 'masuk'])) {
      return this.reply(
        'Untuk login, masukkan email dan password di halaman login. Setelah berhasil, Kolekto akan membawa kamu ke dashboard sesuai role dan team yang bisa kamu akses.',
        ['Cara daftar', 'Cara membuat team', 'Tagihan dan pembayaran'],
      );
    }

    if (this.containsAny(normalized, ['membuat team', 'buat team', 'buat tim', 'membuat tim'])) {
      return this.reply(
        'Setelah login, owner dapat membuka menu Tim lalu memilih Buat Tim. Dari sana owner bisa mengatur nama team, anggota, role iuran, akun kas, dan undangan.',
        ['Cara join team', 'Role owner/admin/member', 'Fitur utama'],
      );
    }

    if (this.containsAny(normalized, ['join team', 'join tim', 'gabung team', 'gabung tim', 'kode tim'])) {
      return this.reply(
        'Untuk join team, login atau daftar lebih dulu, lalu gunakan tautan undangan atau kode team yang dibagikan owner/admin. Setelah diterima, team akan muncul di dashboard.',
        ['Cara daftar', 'Cara login', 'Cara kerja team'],
      );
    }

    if (this.containsAny(normalized, ['role', 'owner', 'admin', 'member', 'peran'])) {
      return this.reply(
        'Owner mengelola team secara penuh. Admin membantu operasional seperti anggota, tagihan, pembayaran, reminder, dan laporan. Member melihat tagihan pribadi, status pembayaran, dan mengunggah bukti bayar miliknya.',
        ['Cara kerja team', 'Cara kerja iuran', 'Upload bukti bayar'],
      );
    }

    if (this.containsAny(normalized, ['iuran', 'tagihan', 'pembayaran', 'bukti', 'upload', 'reminder', 'laporan kas'])) {
      return this.reply(
        'Alur iuran di Kolekto dimulai dari role iuran dan tagihan, lalu member membayar serta upload bukti. Admin/owner memvalidasi pembayaran, mengirim reminder bila perlu, dan memantau laporan kas dari pemasukan serta pengeluaran.',
        ['Cara upload bukti bayar', 'Role owner/admin/member', 'Fitur utama'],
      );
    }

    return this.reply(
      'Saya Kola, asisten Kolekto. Saya bisa menjelaskan informasi umum seperti fitur Kolekto, cara daftar, login, membuat atau join team, role, iuran, pembayaran, reminder, dan laporan kas. Untuk data team pribadi, kamu perlu login dulu.',
      ['Apa itu Kolekto?', 'Fitur utama', 'Cara daftar', 'Cara join team'],
    );
  }

  private reply(answer: string, suggestions: string[]): AssistResponse {
    return {
      mode: 'guest',
      answer,
      suggestions,
      actions: [],
    };
  }

  private normalize(value: string) {
    return value.trim().toLowerCase();
  }

  private containsAny(value: string, keywords: string[]) {
    return keywords.some((keyword) => value.includes(keyword));
  }
}
