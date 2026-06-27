'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { Btn, Badge, Card, CardHead, Modal, Field, InputWrap, FullScreenLoader } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate, formatRp } from '@/lib/utils';

type License = {
  id: string; status: 'TRIAL'|'ACTIVE'|'EXPIRED'|'SUSPENDED';
  trialEndsAt?: string; currentPeriodEnd?: string;
  plan?: { name: string; price: number; maxMembers: number; maxTeams: number; features: string[] };
};

type LicensePayment = { id: string; amount: number; status: string; createdAt: string };

const PLANS = [
  { name: 'Mini',     price: 25000,  features: ['Hingga 20 anggota','1 tim','2 akun kas','Notifikasi in-app','Laporan dasar'] },
  { name: 'Standard', price: 75000,  features: ['Hingga 100 anggota','3 tim','Akun kas tak terbatas','Approval workflow','Audit log lengkap','Export PDF/CSV'], popular: true },
  { name: 'Pro',      price: 200000, features: ['Anggota tak terbatas','Tim tak terbatas','Multi-bendahara','API & webhook','Custom branding','Priority support'] },
];

export default function LicensePage() {
  const user = useUser();
  const { push } = useToast();
  const [openUpload, setOpenUpload] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [form, setForm] = useState({ amount: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);

  const { data: license } = useQuery<License>({
    queryKey: ['license'],
    queryFn: async () => {
      const res = await api.get('/owner/license/current');
      return res.data;
    },
    enabled: user?.role === 'OWNER',
  });

  const { data: payments } = useQuery<{ data: LicensePayment[] }>({
    queryKey: ['license-payments'],
    queryFn: async () => {
      const res = await api.get('/admin/license-payments?limit=10');
      return res.data;
    },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const submit = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await api.post('/owner/license/payment-confirmation', fd);
      return res.data;
    },
    onSuccess: () => {
      push('Bukti pembayaran berhasil dikirim', 'success');
      setOpenUpload(false);
      setFile(null);
      setForm({ amount: '', notes: '' });
    },
    onError: (e: any) => push(e?.message ?? 'Gagal kirim', 'error'),
  });

  const statusVariant = (s?: string) => {
    if (s === 'ACTIVE') return 'ok';
    if (s === 'TRIAL') return 'accent';
    if (s === 'EXPIRED') return 'danger';
    return 'mute';
  };

  const daysLeft = license?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(license.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <>
      <FullScreenLoader show={submit.isPending} label="Mengunggah bukti..." />
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Lisensi &amp; Tagihan</div>
          <h1>Lisensi</h1>
          <div className="subtitle">Kelola langganan dan status akun Kolekto Anda.</div>
        </div>
        <div className="head-actions">
          {license?.status === 'TRIAL' && (
            <Btn icon="zap" variant="primary" onClick={() => setOpenUpload(true)}>Upgrade sekarang</Btn>
          )}
        </div>
      </div>

      <div className="page-body col" style={{ gap: 20 }}>
        {/* Status card */}
        <Card>
          <div className="card-pad">
            <div className="row" style={{ gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Status lisensi</div>
                <div className="row tight" style={{ marginBottom: 10 }}>
                  <Badge variant={statusVariant(license?.status) as any}>
                    {license?.status === 'TRIAL' ? 'Trial aktif' :
                     license?.status === 'ACTIVE' ? 'Aktif' :
                     license?.status === 'EXPIRED' ? 'Kedaluwarsa' : license?.status ?? 'Memuat...'}
                  </Badge>
                  {license?.plan && <span style={{ fontSize: 13.5, fontWeight: 600 }}>Paket {license.plan.name}</span>}
                </div>
                {license?.status === 'TRIAL' && daysLeft !== null && (
                  <div style={{ padding: '12px 16px', background: daysLeft < 5 ? 'var(--danger-soft)' : 'var(--warn-soft)', borderRadius: 12, fontSize: 13.5 }}>
                    <div style={{ fontWeight: 700, color: daysLeft < 5 ? 'var(--danger)' : 'oklch(0.45 0.13 78)' }}>
                      {daysLeft === 0 ? 'Trial berakhir hari ini!' : `Trial berakhir dalam ${daysLeft} hari`}
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.85 }}>
                      Upload bukti pembayaran lisensi untuk lanjut menggunakan Kolekto.
                    </div>
                  </div>
                )}
                {license?.currentPeriodEnd && license.status === 'ACTIVE' && (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Aktif hingga {formatDate(license.currentPeriodEnd)}
                  </div>
                )}
              </div>
              {license?.plan && (
                <div style={{ padding: '14px 20px', background: 'var(--surface)', borderRadius: 14, minWidth: 200 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Paket aktif</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    Rp {formatRp(license.plan.price)}
                    <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>/bln</span>
                  </div>
                  <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(license.plan.features || []).slice(0,3).map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                        <Icon name="check" size={13} style={{ color: 'var(--ok)', flexShrink: 0 }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <div>
          <div className="h3" style={{ marginBottom: 14 }}>Pilih paket</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: 14 }}>
            {PLANS.map(p => (
              <div key={p.name} onClick={() => setSelectedPlan(p.name)} style={{
                padding: 24, borderRadius: 18, cursor: 'pointer',
                background: p.popular ? 'var(--ink)' : 'var(--bg-elev)',
                color: p.popular ? 'var(--bg)' : 'var(--ink)',
                border: selectedPlan === p.name ? '2px solid var(--accent)' : p.popular ? '0' : '1px solid var(--line)',
                boxShadow: p.popular ? '0 20px 50px -20px rgba(5,50,53,.5)' : 'var(--shadow-sm)',
                position: 'relative',
              }}>
                {p.popular && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--ink)', padding: '3px 12px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Paling populer</div>}
                <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Rp</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700 }}>{formatRp(p.price)}</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>/bln</span>
                </div>
                <div style={{ height: 1, background: p.popular ? 'rgba(255,255,255,.1)' : 'var(--line-soft)', margin: '16px 0' }} />
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                      <Icon name="check" size={13} style={{ color: p.popular ? 'var(--accent)' : 'var(--ok)', flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => { setSelectedPlan(p.name); setOpenUpload(true); }} style={{
                  marginTop: 20, width: '100%', padding: '11px 16px',
                  background: p.popular ? 'var(--accent)' : 'var(--ink)',
                  color: p.popular ? 'var(--ink)' : 'var(--bg)',
                  border: 0, borderRadius: 10, fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                }}>
                  Pilih {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment history */}
        {payments && payments.data.length > 0 && (
          <Card>
            <CardHead title="Riwayat pembayaran lisensi" />
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18 }}>Tanggal</th>
                  <th>Status</th>
                  <th className="num">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.map(p => (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 18 }}><span className="mono muted">{formatDate(p.createdAt)}</span></td>
                    <td><span className={`badge ${p.status === 'APPROVED' ? 'badge-ok' : p.status === 'REJECTED' ? 'badge-danger' : 'badge-warn'}`}>{p.status === 'APPROVED' ? 'Disetujui' : p.status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}</span></td>
                    <td className="num"><span className="amt">Rp {formatRp(p.amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Upload bukti modal */}
      <Modal open={openUpload} onClose={() => { setOpenUpload(false); setFile(null); setForm({amount:'', notes:''}); }} title={`Upload bukti pembayaran — ${selectedPlan}`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => { setOpenUpload(false); setFile(null); setForm({amount:'', notes:''}); }}>Batal</Btn>
            <Btn variant="primary" icon="upload" loading={submit.isPending}
              onClick={() => {
                if (!file) {
                  push('Harap unggah bukti transfer terlebih dahulu', 'error');
                  return;
                }
                if (!form.amount) {
                  push('Harap isi nominal transfer', 'error');
                  return;
                }
                const fd = new FormData();
                fd.append('amount', form.amount);
                if (form.notes) fd.append('note', form.notes);
                if (file) fd.append('file', file);
                submit.mutate(fd);
              }}>
              Kirim bukti
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 12, fontSize: 13.5 }}>
            <div className="row between">
              <span className="muted">Paket</span>
              <span style={{ fontWeight: 600 }}>{selectedPlan}</span>
            </div>
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="muted">Nominal</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                Rp {formatRp(PLANS.find(p => p.name === selectedPlan)?.price ?? 0)}/bulan
              </span>
            </div>
          </div>
          <Field label="Nominal dibayarkan (Rp)">
            <InputWrap>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', fontFamily: 'var(--font-mono)', fontSize: 15 }} />
            </InputWrap>
          </Field>
          <Field label="Bukti transfer" help="JPG, PNG, atau PDF">
            <label style={{ display: 'block' }}>
              <div style={{ padding: '20px 16px', background: 'var(--surface-2)', border: '1.5px dashed var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: file ? 'var(--ink)' : 'var(--ink-muted)', fontSize: 13 }}>
                <Icon name={file ? 'checkCircle' : 'upload'} size={18} /> 
                {file ? file.name : 'Klik untuk upload bukti'}
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          <Field label="Catatan (opsional)">
            <InputWrap>
              <input placeholder="Catatan tambahan..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </InputWrap>
          </Field>
        </div>
      </Modal>
    </>
  );
}


