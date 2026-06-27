import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AssistContextService } from './assist-context.service';
import type { AssistResponse } from './assist-guest.service';
import type { AssistTeamAccess } from './assist-policy.service';
import { AssistPolicyService } from './assist-policy.service';

@Injectable()
export class AssistTeamService {
  constructor(
    private readonly contextService: AssistContextService,
    private readonly policyService: AssistPolicyService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  async answer(access: AssistTeamAccess, message: string): Promise<AssistResponse> {
    await this.logAsk(access, message);

    const normalized = this.normalize(message);

    if (this.containsAny(normalized, ['tagihan saya', 'invoice saya', 'status pembayaran saya', 'pembayaran saya'])) {
      return this.answerMyInvoices(access);
    }

    if (this.containsAny(normalized, ['belum bayar', 'belum lunas', 'unpaid', 'menunggak'])) {
      return this.answerOpenInvoices(access);
    }

    if (this.containsAny(normalized, ['reminder', 'ingatkan', 'pengingat'])) {
      return this.answerReminder(access);
    }

    if (this.containsAny(normalized, ['pengeluaran', 'expense', 'keluar'])) {
      if (access.isMember) {
        return this.memberRestrictedReply('Ringkasan pengeluaran team hanya tersedia untuk owner/admin.');
      }
      return this.answerExpense(access);
    }

    if (this.containsAny(normalized, ['pemasukan', 'income', 'masuk'])) {
      if (access.isMember) {
        return this.memberRestrictedReply('Ringkasan pemasukan team hanya tersedia untuk owner/admin.');
      }
      return this.answerIncome(access);
    }

    if (this.containsAny(normalized, ['saldo', 'kas'])) {
      if (access.isMember) {
        return this.memberRestrictedReply('Saldo kas team hanya tersedia untuk owner/admin. Kamu tetap bisa menanyakan tagihan dan status pembayaran milikmu sendiri.');
      }
      return this.answerBalance(access);
    }

    if (this.containsAny(normalized, ['ringkasan', 'summary', 'bulan ini', 'laporan'])) {
      if (access.isMember) {
        return this.answerMyInvoices(access);
      }
      return this.answerSummary(access);
    }

    if (this.containsAny(normalized, ['upload bukti', 'bukti bayar', 'unggah bukti'])) {
      return this.reply(
        'Untuk upload bukti bayar, buka Tagihan Saya, pilih tagihan yang ingin dibayar, lalu kirim nominal, akun tujuan, catatan bila perlu, dan file bukti pembayaran. Setelah itu admin/owner akan memvalidasi pembayaran.',
        access.isMember
          ? ['Tagihan saya', 'Status pembayaran saya']
          : ['Siapa belum bayar?', 'Ringkasan bulan ini'],
      );
    }

    return this.reply(
      access.isMember
        ? 'Saya bisa membantu cek tagihan pribadi, status pembayaran kamu, dan panduan upload bukti bayar. Saya tidak akan menampilkan data pembayaran anggota lain.'
        : 'Saya bisa membantu ringkasan team, saldo kas, invoice yang belum bayar, pemasukan, pengeluaran, template reminder, dan laporan ringkas. Untuk aksi penting seperti membuat reminder atau transaksi, Kola hanya menyiapkan draft dan tetap butuh konfirmasi manual.',
      access.isMember
        ? ['Tagihan saya', 'Status pembayaran saya', 'Cara upload bukti bayar']
        : ['Ringkasan bulan ini', 'Siapa belum bayar?', 'Analisis pengeluaran', 'Buat reminder iuran'],
    );
  }

  private async answerSummary(access: AssistTeamAccess): Promise<AssistResponse> {
    this.policyService.assertAdminLike(access);
    const summary = await this.contextService.getTeamSummary(access);
    const paid = this.pickCount(summary.invoiceCounts, InvoiceStatus.PAID);
    const open = summary.invoiceCounts
      .filter((item) => item.status !== InvoiceStatus.PAID && item.status !== InvoiceStatus.CANCELLED)
      .reduce((total, item) => total + item._count._all, 0);
    const pendingPayments = this.pickCount(summary.paymentCounts, PaymentStatus.PENDING);

    return this.reply(
      [
        `Ringkasan ${summary.teamName} bulan ini:`,
        `Saldo kas saat ini ${this.formatCurrency(summary.balance)}.`,
        `Pemasukan bulan ini ${this.formatCurrency(summary.monthlyIncome)}, pengeluaran ${this.formatCurrency(summary.monthlyExpense)}, net ${this.formatCurrency(summary.monthlyNet)}.`,
        `Ada ${summary.memberCount} anggota aktif, ${paid} tagihan lunas, ${open} tagihan masih terbuka, dan ${pendingPayments} pembayaran menunggu validasi.`,
      ].join(' '),
      ['Siapa belum bayar?', 'Analisis pengeluaran', 'Pemasukan bulan ini', 'Buat reminder iuran'],
    );
  }

  private async answerOpenInvoices(access: AssistTeamAccess): Promise<AssistResponse> {
    const invoices = await this.contextService.getOpenInvoices(access);
    if (!invoices.length) {
      return this.reply(
        access.isMember
          ? 'Tidak ada tagihan terbuka atas nama kamu di team ini.'
          : 'Tidak ada tagihan terbuka yang perlu ditagih di team ini.',
        access.isMember ? ['Tagihan saya', 'Cara upload bukti bayar'] : ['Ringkasan bulan ini', 'Saldo kas team'],
      );
    }

    const lines = invoices.map((invoice, index) => {
      const owner = access.isMember ? 'Kamu' : invoice.user.fullName;
      return `${index + 1}. ${owner} - ${invoice.invoiceCode} ${this.formatCurrency(invoice.amount)} (${this.formatStatus(invoice.status)}, jatuh tempo ${this.formatDate(invoice.dueDate)})`;
    });

    return this.reply(
      access.isMember
        ? `Tagihan kamu yang masih terbuka:\n${lines.join('\n')}`
        : `Daftar tagihan yang belum selesai:\n${lines.join('\n')}`,
      access.isMember ? ['Status pembayaran saya', 'Cara upload bukti bayar'] : ['Buat reminder iuran', 'Ringkasan bulan ini'],
    );
  }

  private async answerMyInvoices(access: AssistTeamAccess): Promise<AssistResponse> {
    const invoices = await this.contextService.getMyInvoices(access);
    if (!invoices.length) {
      return this.reply(
        'Belum ada tagihan atas nama kamu di team ini.',
        ['Cara upload bukti bayar', 'Cara kerja iuran'],
      );
    }

    const lines = invoices.map((invoice, index) => {
      const latestPayment = invoice.payments[0];
      const paymentText = latestPayment
        ? `Pembayaran terakhir ${this.formatCurrency(latestPayment.amount)} status ${this.formatStatus(latestPayment.status)}.`
        : 'Belum ada pembayaran tercatat.';
      return `${index + 1}. ${invoice.invoiceCode} ${this.formatCurrency(invoice.amount)} untuk ${invoice.role.name}, status ${this.formatStatus(invoice.status)}, jatuh tempo ${this.formatDate(invoice.dueDate)}. ${paymentText}`;
    });

    return this.reply(
      `Berikut tagihan kamu:\n${lines.join('\n')}`,
      ['Cara upload bukti bayar', 'Status pembayaran saya'],
    );
  }

  private async answerReminder(access: AssistTeamAccess): Promise<AssistResponse> {
    if (access.isMember) {
      return this.reply(
        'Reminder iuran hanya bisa disiapkan untuk owner/admin. Untuk kamu, Kola bisa bantu cek tagihan pribadi dan status pembayaran.',
        ['Tagihan saya', 'Status pembayaran saya'],
      );
    }

    const invoices = await this.contextService.getOpenInvoices(access);
    if (!invoices.length) {
      return this.reply(
        'Tidak ada tagihan terbuka, jadi belum ada reminder yang perlu disiapkan. Kola tidak mengirim reminder otomatis tanpa konfirmasi.',
        ['Ringkasan bulan ini', 'Saldo kas team'],
      );
    }

    const names = invoices.slice(0, 5).map((invoice) => invoice.user.fullName);
    const sample = `Halo, ini reminder iuran ${access.teamName}. Mohon cek dan selesaikan tagihan yang masih terbuka di Kolekto. Jika sudah bayar, silakan upload bukti pembayaran agar admin bisa validasi.`;

    return this.reply(
      `Ada ${invoices.length} tagihan terbuka. Contoh penerima awal: ${names.join(', ')}. Draft reminder:\n"${sample}"\nKola belum mengirim reminder apa pun. Silakan konfirmasi dan kirim melalui fitur reminder yang tersedia.`,
      ['Siapa belum bayar?', 'Ringkasan bulan ini'],
    );
  }

  private async answerExpense(access: AssistTeamAccess): Promise<AssistResponse> {
    const summary = await this.contextService.getExpenseSummary(access);
    const latest = summary.latest.length
      ? ` Transaksi terbaru: ${summary.latest
        .map((item) => `${this.formatCurrency(item.amount)}${item.description ? ` untuk ${item.description}` : ''}`)
        .join('; ')}.`
      : ' Belum ada transaksi pengeluaran bulan ini.';

    return this.reply(
      `Total pengeluaran bulan ini ${this.formatCurrency(summary.total)}.${latest}`,
      ['Pemasukan bulan ini', 'Saldo kas team', 'Ringkasan bulan ini'],
    );
  }

  private async answerIncome(access: AssistTeamAccess): Promise<AssistResponse> {
    const summary = await this.contextService.getIncomeSummary(access);

    return this.reply(
      `Total pemasukan tercatat bulan ini ${this.formatCurrency(summary.total)}. Dari pembayaran iuran yang sudah approved, totalnya ${this.formatCurrency(summary.approvedPaymentTotal)} dari ${summary.approvedPaymentCount} pembayaran.`,
      ['Analisis pengeluaran', 'Saldo kas team', 'Ringkasan bulan ini'],
    );
  }

  private async answerBalance(access: AssistTeamAccess): Promise<AssistResponse> {
    const balance = await this.contextService.getBalance(access);
    const net = balance.income - balance.expense;

    return this.reply(
      `Saldo kas team saat ini ${this.formatCurrency(net)}. Total pemasukan tercatat ${this.formatCurrency(balance.income)} dan total pengeluaran tercatat ${this.formatCurrency(balance.expense)}.`,
      ['Ringkasan bulan ini', 'Pemasukan bulan ini', 'Analisis pengeluaran'],
    );
  }

  private memberRestrictedReply(answer: string): AssistResponse {
    return this.reply(answer, ['Tagihan saya', 'Status pembayaran saya', 'Cara upload bukti bayar']);
  }

  private reply(answer: string, suggestions: string[]): AssistResponse {
    return {
      mode: 'team',
      answer,
      suggestions,
      actions: [],
    };
  }

  private async logAsk(access: AssistTeamAccess, message: string) {
    await this.auditLogsService.create({
      teamId: access.teamId,
      userId: access.userId,
      action: 'KOLA_ASSIST_ASK',
      entityType: 'Assist',
      description: `Kola Assist ditanya oleh ${access.memberName}`,
      metadata: {
        role: access.role,
        intent: this.detectIntent(message),
      },
    });
  }

  private detectIntent(message: string) {
    const normalized = this.normalize(message);
    if (this.containsAny(normalized, ['ringkasan', 'summary', 'laporan'])) return 'SUMMARY';
    if (this.containsAny(normalized, ['belum bayar', 'unpaid', 'menunggak'])) return 'UNPAID_INVOICES';
    if (this.containsAny(normalized, ['tagihan saya', 'invoice saya', 'pembayaran saya'])) return 'MY_INVOICES';
    if (this.containsAny(normalized, ['reminder', 'pengingat'])) return 'REMINDER_DRAFT';
    if (this.containsAny(normalized, ['pengeluaran', 'expense'])) return 'EXPENSE';
    if (this.containsAny(normalized, ['pemasukan', 'income'])) return 'INCOME';
    if (this.containsAny(normalized, ['saldo', 'kas'])) return 'BALANCE';
    return 'GENERAL';
  }

  private pickCount<T extends { status: string; _count: { _all: number } }>(items: T[], status: string) {
    return items.find((item) => item.status === status)?._count._all ?? 0;
  }

  private normalize(value: string) {
    return value.trim().toLowerCase();
  }

  private containsAny(value: string, keywords: string[]) {
    return keywords.some((keyword) => value.includes(keyword));
  }

  private formatCurrency(value: unknown) {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeZone: 'Asia/Jakarta',
    }).format(value);
  }

  private formatStatus(status: string) {
    const labels: Record<string, string> = {
      DRAFT: 'draft',
      UNPAID: 'belum bayar',
      PARTIAL: 'sebagian',
      PAID: 'lunas',
      EXPIRED: 'kedaluwarsa',
      OVERDUE: 'terlambat',
      CANCELLED: 'dibatalkan',
      PENDING: 'menunggu',
      APPROVED: 'disetujui',
      REJECTED: 'ditolak',
    };

    return labels[status] ?? status.toLowerCase();
  }
}
