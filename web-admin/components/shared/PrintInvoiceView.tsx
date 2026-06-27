'use client';

import { Icon } from '@/components/icons/Icon';
import { formatRp, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

type Props = { invoice: Invoice; onClose: () => void };

export function PrintInvoiceView({ invoice, onClose }: Props) {
  const print = () => window.print();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(5,50,53,0.65)',
      display: 'grid', placeItems: 'start center',
      overflowY: 'auto', padding: '40px 20px',
    }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .print-actions { display: none !important; }
        }
      `}</style>

      <div className="print-actions" style={{ position: 'fixed', top: 16, right: 16, zIndex: 260, display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ padding: '8px 14px', background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>
          Tutup
        </button>
        <button onClick={print} style={{ padding: '8px 14px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="download" size={14} /> Cetak / PDF
        </button>
      </div>

      <div className="print-receipt" style={{
        width: 600, maxWidth: '100%', background: 'white', color: '#1a1a1a',
        borderRadius: 8, padding: 56, boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-sans)', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 22, borderBottom: '1px solid #e0e0e0' }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: '#053235', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
              K<span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: '#CD9A2C' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0a3a3e' }}>Tim — Kolekto</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Manajemen Iuran via Kolekto</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#888' }}>
              {invoice.status === 'PAID' ? 'Kwitansi Pembayaran' : 'Tagihan Iuran'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 6, color: '#444' }}>{invoice.code}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Dibuat {formatDate(invoice.createdAt)}</div>
          </div>
        </div>

        {/* Status banner */}
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 28,
          background: invoice.status === 'PAID' ? '#e8f5ee' : '#fff7e6',
          color: invoice.status === 'PAID' ? '#1f7a4d' : '#a8731f',
          fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{invoice.status === 'PAID' ? '✓ Telah dibayar — pembayaran disetujui' : '⚠ Menunggu pembayaran'}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{invoice.status === 'PAID' ? formatDate(invoice.updatedAt) : ''}</span>
        </div>

        {/* Recipient + Period */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Ditagih kepada</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{invoice.member?.memberName ?? '—'}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Jabatan: {invoice.role?.name ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Periode iuran</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{new Date(invoice.periodDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Jatuh tempo: {formatDate(invoice.dueDate)}</div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1a1a1a' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#888' }}>Deskripsi</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#888' }}>Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <td style={{ padding: '14px 0' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Iuran rutin {new Date(invoice.periodDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Jabatan: {invoice.role?.name ?? '—'}</div>
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, verticalAlign: 'top', padding: '14px 0' }}>
                Rp {formatRp(invoice.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#0a3a3e', color: 'white', borderRadius: 8, marginBottom: 28 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>TOTAL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>Rp {formatRp(invoice.amount)}</span>
        </div>

        {invoice.status === 'PAID' && (
          <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 28, fontSize: 12, color: '#555' }}>
            <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>Konfirmasi pembayaran</div>
            Pembayaran telah diterima dan disetujui oleh bendahara tim. Dokumen ini dapat digunakan sebagai bukti sah pelunasan iuran.
          </div>
        )}

        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 20, fontSize: 10.5, color: '#888', textAlign: 'center' }}>
          Dokumen ini dihasilkan otomatis oleh Kolekto · kolekto.id<br />
          Pertanyaan? Hubungi bendahara tim Anda.
        </div>

        {invoice.status !== 'PAID' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', opacity: 0.06, fontWeight: 800, fontSize: 80, letterSpacing: '0.2em', color: '#a8731f', transform: 'rotate(-25deg)' }}>
            BELUM LUNAS
          </div>
        )}
      </div>
    </div>
  );
}
