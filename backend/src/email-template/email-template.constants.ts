import { EmailTemplateType } from '@prisma/client';

export type EmailTemplateDefinition = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = [
  EmailTemplateType.RESET_PASSWORD,
  EmailTemplateType.VERIFY_EMAIL,
  EmailTemplateType.INVOICE_REMINDER,
  EmailTemplateType.PAYMENT_CONFIRMED,
  EmailTemplateType.TEAM_INVITATION,
  EmailTemplateType.LICENSE_EXPIRING,
];

export const EMAIL_TEMPLATE_REQUIRED_VARIABLES: Record<EmailTemplateType, string[]> = {
  RESET_PASSWORD: ['name', 'resetUrl', 'expiresMinutes'],
  VERIFY_EMAIL: ['name', 'verifyUrl', 'expiresMinutes'],
  INVOICE_REMINDER: ['name', 'teamName', 'invoiceNumber', 'amount', 'dueDate', 'paymentUrl'],
  PAYMENT_CONFIRMED: ['name', 'teamName', 'amount', 'paidAt'],
  TEAM_INVITATION: ['name', 'teamName', 'inviteUrl', 'invitedBy'],
  LICENSE_EXPIRING: ['name', 'teamName', 'expiredAt', 'planName'],
};

const buildShell = (accentLabel: string, title: string, intro: string, body: string, ctaLabel: string, ctaUrl: string, footerNote: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#102033;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbe5f0;box-shadow:0 18px 50px rgba(16,32,51,.08);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;">
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.82;">Kolekto</div>
              <div style="font-size:26px;line-height:1.2;font-weight:700;margin-top:8px;">${accentLabel}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">${title}</div>
              <h1 style="margin:12px 0 14px;font-size:24px;line-height:1.25;color:#0f172a;">${intro}</h1>
              <div style="font-size:15px;line-height:1.8;color:#334155;">${body}</div>
              <div style="margin:28px 0 10px;">
                <a href="${ctaUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:14px;">${ctaLabel}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="background:#f8fafc;border:1px solid #dbe5f0;border-radius:18px;padding:18px 20px;color:#475569;font-size:13px;line-height:1.7;">
                ${footerNote}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 30px;text-align:center;border-top:1px solid #edf2f7;color:#94a3b8;font-size:12px;line-height:1.7;">
              Email ini dikirim otomatis oleh sistem Kolekto. Mohon jangan membalas email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const buildText = (lines: string[]) => lines.join('\n\n');

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateType, EmailTemplateDefinition> = {
  RESET_PASSWORD: {
    name: 'Reset Password',
    subject: 'Reset password akun Kolekto untuk {{name}}',
    htmlBody: buildShell(
      'Reset Password',
      'Reset Password',
      'Kami menerima permintaan reset password',
      '<p>Halo <strong>{{name}}</strong>, kami menerima permintaan reset password untuk akun Kolekto Anda.</p><p>Link reset berikut berlaku selama <strong>{{expiresMinutes}} menit</strong> dan hanya bisa digunakan satu kali.</p><p>Jika Anda tidak meminta reset password, abaikan email ini.</p>',
      'Buat Password Baru',
      '{{resetUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Aksi yang perlu dilakukan</div><div>Gunakan tombol di atas untuk menuju halaman reset password.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      'Kami menerima permintaan reset password untuk akun Kolekto Anda.',
      'Link reset: {{resetUrl}}',
      'Link ini berlaku selama {{expiresMinutes}} menit.',
      'Jika Anda tidak meminta reset password, abaikan email ini.',
    ]),
  },
  VERIFY_EMAIL: {
    name: 'Verifikasi Email',
    subject: 'Verifikasi email Kolekto untuk {{name}}',
    htmlBody: buildShell(
      'Verify Email',
      'Verifikasi Email',
      'Aktifkan akun Anda sekarang',
      '<p>Halo <strong>{{name}}</strong>, klik tombol di bawah untuk memverifikasi alamat email Anda.</p><p>Link verifikasi berlaku selama <strong>{{expiresMinutes}} menit</strong>.</p>',
      'Verifikasi Email',
      '{{verifyUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Selesaikan pendaftaran</div><div>Jika Anda tidak melakukan pendaftaran, Anda dapat mengabaikan email ini.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      'Klik link berikut untuk memverifikasi email Anda:',
      '{{verifyUrl}}',
      'Link verifikasi berlaku selama {{expiresMinutes}} menit.',
    ]),
  },
  INVOICE_REMINDER: {
    name: 'Pengingat Invoice',
    subject: 'Invoice {{invoiceNumber}} untuk {{teamName}} jatuh tempo',
    htmlBody: buildShell(
      'Invoice Reminder',
      'Pengingat Invoice',
      'Ada tagihan yang mendekati jatuh tempo',
      '<p>Halo <strong>{{name}}</strong>, invoice <strong>{{invoiceNumber}}</strong> untuk tim <strong>{{teamName}}</strong> sebesar <strong>{{amount}}</strong> akan jatuh tempo pada <strong>{{dueDate}}</strong>.</p><p>Silakan lakukan pembayaran melalui tombol di bawah.</p>',
      'Bayar Sekarang',
      '{{paymentUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Informasi tagihan</div><div>Pastikan pembayaran dilakukan sebelum tanggal jatuh tempo agar status invoice tetap lancar.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      'Invoice {{invoiceNumber}} untuk tim {{teamName}} sebesar {{amount}} jatuh tempo pada {{dueDate}}.',
      'Bayar melalui: {{paymentUrl}}',
    ]),
  },
  PAYMENT_CONFIRMED: {
    name: 'Pembayaran Dikonfirmasi',
    subject: 'Pembayaran untuk {{teamName}} telah dikonfirmasi',
    htmlBody: buildShell(
      'Payment Confirmed',
      'Pembayaran Dikonfirmasi',
      'Pembayaran Anda telah kami terima',
      '<p>Halo <strong>{{name}}</strong>, pembayaran sebesar <strong>{{amount}}</strong> untuk tim <strong>{{teamName}}</strong> telah dikonfirmasi pada <strong>{{paidAt}}</strong>.</p>',
      'Lihat Riwayat',
      '{{historyUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Status pembayaran</div><div>Terima kasih, pembayaran Anda sudah tercatat di sistem Kolekto.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      'Pembayaran sebesar {{amount}} untuk tim {{teamName}} telah dikonfirmasi pada {{paidAt}}.',
      'Terima kasih sudah menggunakan Kolekto.',
    ]),
  },
  TEAM_INVITATION: {
    name: 'Undangan Tim',
    subject: 'Undangan bergabung ke tim {{teamName}}',
    htmlBody: buildShell(
      'Team Invitation',
      'Undangan Tim',
      'Anda diundang untuk bergabung',
      '<p>Halo <strong>{{name}}</strong>, <strong>{{invitedBy}}</strong> mengundang Anda untuk bergabung ke tim <strong>{{teamName}}</strong>.</p><p>Klik tombol di bawah untuk menerima undangan dan mulai berkolaborasi.</p>',
      'Terima Undangan',
      '{{inviteUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Langkah berikutnya</div><div>Gunakan link undangan untuk masuk dan menyelesaikan proses bergabung.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      '{{invitedBy}} mengundang Anda untuk bergabung ke tim {{teamName}}.',
      'Terima undangan melalui: {{inviteUrl}}',
    ]),
  },
  LICENSE_EXPIRING: {
    name: 'Lisensi Hampir Habis',
    subject: 'Lisensi {{planName}} untuk {{teamName}} segera berakhir',
    htmlBody: buildShell(
      'License Expiring',
      'Lisensi Hampir Habis',
      'Lisensi Anda akan segera berakhir',
      '<p>Halo <strong>{{name}}</strong>, lisensi paket <strong>{{planName}}</strong> untuk tim <strong>{{teamName}}</strong> akan berakhir pada <strong>{{expiredAt}}</strong>.</p><p>Silakan perpanjang sebelum masa aktif habis agar layanan tetap berjalan normal.</p>',
      'Perpanjang Sekarang',
      '{{renewUrl}}',
      '<div style="font-weight:700;margin-bottom:6px;">Status lisensi</div><div>Jangan menunggu sampai masa aktif selesai agar tim tetap dapat menggunakan Kolekto tanpa gangguan.</div>',
    ),
    textBody: buildText([
      'Halo {{name}},',
      'Lisensi paket {{planName}} untuk tim {{teamName}} akan berakhir pada {{expiredAt}}.',
      'Perpanjang melalui: {{renewUrl}}',
    ]),
  },
};

export const EMAIL_TEMPLATE_PREVIEW_CONTEXTS: Record<EmailTemplateType, Record<string, unknown>> = {
  RESET_PASSWORD: {
    name: 'Anwar',
    resetUrl: 'https://kolekto.example/reset-password?token=demo-token',
    expiresMinutes: 60,
  },
  VERIFY_EMAIL: {
    name: 'Anwar',
    verifyUrl: 'https://kolekto.example/verify-email?token=demo-token',
    expiresMinutes: 30,
  },
  INVOICE_REMINDER: {
    name: 'Anwar',
    teamName: 'Tim Kas RT 01',
    invoiceNumber: 'INV-2026-0012',
    amount: 'Rp 150.000',
    dueDate: '25 Mei 2026',
    paymentUrl: 'https://kolekto.example/invoices/INV-2026-0012',
  },
  PAYMENT_CONFIRMED: {
    name: 'Anwar',
    teamName: 'Tim Kas RT 01',
    amount: 'Rp 150.000',
    paidAt: '23 Mei 2026 08:15 WIB',
    historyUrl: 'https://kolekto.example/payments',
  },
  TEAM_INVITATION: {
    name: 'Anwar',
    teamName: 'Tim Kas RT 01',
    inviteUrl: 'https://kolekto.example/invite/demo-token',
    invitedBy: 'Budi',
  },
  LICENSE_EXPIRING: {
    name: 'Anwar',
    teamName: 'Tim Kas RT 01',
    expiredAt: '30 Juni 2026',
    planName: 'Pro',
    renewUrl: 'https://kolekto.example/license/renew',
  },
};

export function getRequiredEmailTemplateVariables(type: EmailTemplateType): string[] {
  return EMAIL_TEMPLATE_REQUIRED_VARIABLES[type] ?? [];
}

export function getDefaultEmailTemplate(type: EmailTemplateType): EmailTemplateDefinition {
  return EMAIL_TEMPLATE_DEFAULTS[type];
}

export function getPreviewContext(type: EmailTemplateType): Record<string, unknown> {
  return EMAIL_TEMPLATE_PREVIEW_CONTEXTS[type] ?? {};
}
