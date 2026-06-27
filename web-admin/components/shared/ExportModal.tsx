'use client';

import { useState, useEffect } from 'react';
import { Modal, Btn, Field } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { useToast } from '@/app/providers';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultKind?: string;
};

export function ExportModal({ open, onClose, defaultKind = 'laporan' }: Props) {
  const { push } = useToast();
  const [format, setFormat]   = useState<'pdf'|'csv'|'excel'>('pdf');
  const [period, setPeriod]   = useState('current');
  const [includes, setIncludes] = useState({
    summary: true, members: true, transactions: true, audit: false, attachments: false,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (!open) { setBusy(false); setDone(false); } }, [open]);

  const filename = `kolekto-${defaultKind}-${period}-${new Date().toISOString().slice(0,10)}.${format === 'excel' ? 'xlsx' : format}`;

  const start = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); setDone(true); }, 1600);
  };

  const footer = done ? (
    <>
      <Btn variant="ghost" onClick={onClose}>Tutup</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon="download" onClick={() => { push(`${filename} diunduh`, 'success'); onClose(); }}>
        Unduh file
      </Btn>
    </>
  ) : (
    <>
      <Btn variant="ghost" onClick={onClose} disabled={busy}>Batal</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon={busy ? 'refresh' : 'download'} onClick={start} disabled={busy}>
        {busy ? 'Memproses…' : 'Mulai export'}
      </Btn>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Export laporan" wide footer={footer}>
      {done ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ok-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Icon name="check" size={36} style={{ color: 'var(--ok)' }} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Export siap.</h3>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 6 }}>
            File <code>{filename}</code> · 142 KB
          </p>
        </div>
      ) : busy ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', border: '3px solid var(--surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>Menyiapkan {format.toUpperCase()}…</div>
          <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="col" style={{ gap: 18 }}>
          <Field label="Format file">
            <div className="row tight">
              {([
                { id: 'pdf',   label: 'PDF',   sub: 'Siap cetak / kirim' },
                { id: 'csv',   label: 'CSV',   sub: 'Untuk spreadsheet' },
                { id: 'excel', label: 'Excel', sub: '.xlsx native' },
              ] as const).map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)} style={{
                  flex: 1, padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--line)'}`,
                  background: format === f.id ? 'var(--accent-soft)' : 'var(--bg-elev)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{f.sub}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Periode data">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[['current','Bulan ini'],['last','Bulan lalu'],['q2','Q2 2026'],['ytd','Year-to-date'],['all','Semua data'],['custom','Kustom…']].map(([id,label]) => (
                <button key={id} className={`chip ${period === id ? 'active' : ''}`} onClick={() => setPeriod(id)}>{label}</button>
              ))}
            </div>
          </Field>

          <Field label="Yang disertakan">
            <div className="col tight">
              {([
                { id: 'summary',      label: 'Ringkasan eksekutif',          sub: 'Saldo, total pemasukan/pengeluaran' },
                { id: 'members',      label: 'Daftar anggota & status iuran', sub: 'Per-anggota: bayar / belum / telat' },
                { id: 'transactions', label: 'Detail transaksi kas',          sub: 'Setiap pemasukan & pengeluaran' },
                { id: 'audit',        label: 'Audit log',                     sub: 'Approve, reject, dan perubahan data' },
                { id: 'attachments',  label: 'Lampiran bukti transfer',       sub: 'Ukuran file lebih besar (~10MB)' },
              ] as const).map(it => (
                <label key={it.id} style={{
                  display: 'flex', gap: 10, padding: '10px 12px',
                  border: `1px solid ${includes[it.id] ? 'var(--accent)' : 'var(--line)'}`,
                  background: includes[it.id] ? 'var(--accent-soft)' : 'var(--bg-elev)',
                  borderRadius: 10, cursor: 'pointer', alignItems: 'flex-start',
                }}>
                  <input type="checkbox" checked={includes[it.id]}
                    onChange={() => setIncludes(p => ({ ...p, [it.id]: !p[it.id] }))}
                    style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.label}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{it.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 10, fontSize: 12.5 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Preview nama file</div>
            <code>{filename}</code>
          </div>
        </div>
      )}
    </Modal>
  );
}
