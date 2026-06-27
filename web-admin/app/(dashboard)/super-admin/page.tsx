'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { Btn, Avatar, Badge, StatusBadge, Card, CardHead, Empty, Modal, Field, InputWrap } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons/Icon';
import { formatDate, formatRp } from '@/lib/utils';
import { Pagination } from '@/components/shared/Pagination';

type TabId = 'licenses' | 'teams' | 'users' | 'invoices' | 'audit' | 'eod';

const TONE = {
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
  teal:   { bg: 'var(--teal-soft)',   fg: 'var(--teal)' },
  ok:     { bg: 'var(--ok-soft)',     fg: 'var(--ok)' },
  warn:   { bg: 'var(--warn-soft)',   fg: 'oklch(0.45 0.13 78)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
} as const;

export default function SuperAdminPage() {
  const user = useUser();
  const [tab, setTab] = useState<TabId>('licenses');
  const isSA = !!user?.isSuperAdmin;

  // Metrik platform — diambil dari endpoint list yang sudah ada (meta.total / breakdown).
  const teams = useQuery<{ meta: { total: number } }>({
    queryKey: ['admin-teams-stat'],
    queryFn: async () => (await api.get('/admin/teams?limit=1')).data,
    enabled: isSA,
  });
  const users = useQuery<{ meta: { total: number } }>({
    queryKey: ['admin-users-stat'],
    queryFn: async () => (await api.get('/admin/users?limit=1')).data,
    enabled: isSA,
  });
  const licenses = useQuery<{ data: any[] }>({
    queryKey: ['admin-licenses'],
    queryFn: async () => (await api.get('/admin/licenses')).data,
    enabled: isSA,
  });
  const pendingPay = useQuery<{ data: any[]; meta?: { total: number } }>({
    queryKey: ['admin-license-payments-pending'],
    queryFn: async () => (await api.get('/admin/license-payments?status=PENDING&limit=100')).data,
    enabled: isSA,
  });

  if (!isSA) {
    return (
      <div className="page-body" style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
          <Icon name="shield" size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Akses ditolak</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Halaman ini hanya untuk Super Admin.</div>
        </div>
      </div>
    );
  }

  const lic = licenses.data?.data ?? [];
  const activeLic = lic.filter((l: any) => l.status === 'ACTIVE').length;
  const trialLic  = lic.filter((l: any) => l.status === 'TRIAL').length;
  const pendingCount = pendingPay.data?.meta?.total ?? pendingPay.data?.data?.length ?? 0;

  return (
    <>
      {/* Console-style header — sengaja dibedakan dari dashboard owner (aksen merah/platform) */}
      <div className="page-head sa-head">
        <div>
          <div className="h-eyebrow" style={{ color: 'var(--danger)', letterSpacing: '.1em' }}>PLATFORM CONSOLE</div>
          <h1 className="row tight" style={{ gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="shield" size={18} />
            </span>
            Super Admin
          </h1>
          <div className="subtitle">Kelola lisensi, tim, user, dan operasi seluruh platform Kolekto.</div>
        </div>
        <div className="head-actions">
          <div style={{ padding: '6px 13px', borderRadius: 999, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--danger)', animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
            Mode Super Admin
          </div>
        </div>
      </div>

      {/* Platform metrics */}
      <div className="page-body" style={{ paddingBottom: 0 }}>
        <div className="grid grid-4" style={{ gap: 14 }}>
          <PlatformStat icon="globe"  tone={TONE.accent} label="Total Tim"   value={teams.data?.meta?.total ?? '—'} loading={teams.isLoading} />
          <PlatformStat icon="users"  tone={TONE.teal}   label="Total User"  value={users.data?.meta?.total ?? '—'} loading={users.isLoading} />
          <PlatformStat icon="shield" tone={TONE.ok}     label="Lisensi Aktif" value={activeLic} sub={`${trialLic} trial`} loading={licenses.isLoading} />
          <PlatformStat icon="clock"  tone={pendingCount > 0 ? TONE.danger : TONE.ok} label="Pembayaran Pending" value={pendingCount} sub={pendingCount > 0 ? 'perlu ditinjau' : 'semua beres'} loading={pendingPay.isLoading} />
        </div>
      </div>

      <div className="page-tools">
        {([
          ['licenses', 'Lisensi & Pembayaran'],
          ['teams',    'Tim'],
          ['users',    'Users'],
          ['invoices', 'Invoices'],
          ['audit',    'Audit Log'],
          ['eod',      'EOD & Sistem'],
        ] as [TabId, string][]).map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="page-body">
        {tab === 'licenses' && <LicensesTab />}
        {tab === 'teams'    && <TeamsTab />}
        {tab === 'users'    && <UsersTab />}
        {tab === 'invoices' && <InvoicesGlobalTab />}
        {tab === 'audit'    && <AuditGlobalTab />}
        {tab === 'eod'      && <EodTab />}
      </div>
    </>
  );
}

// ─── Platform stat tile (gaya konsol, beda dari kartu .stat dashboard owner) ──
function PlatformStat({ icon, label, value, sub, tone, loading }: {
  icon: IconName; label: string; value: React.ReactNode; sub?: string;
  tone: { bg: string; fg: string }; loading?: boolean;
}) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: tone.bg, color: tone.fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, opacity: loading ? 0.35 : 1 }}>
          {value}
        </div>
        {sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Licenses tab ─────────────────────────────────────────────────────────────
function LicensesTab() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED'>('all');
  const [extendTarget, setExtendTarget] = useState<any | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [planForm, setPlanForm] = useState<any | 'new' | null>(null);

  const { data, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['admin-licenses'],
    queryFn: async () => (await api.get('/admin/licenses')).data,
  });

  const plans = useQuery<any>({
    queryKey: ['admin-plans'],
    queryFn: async () => (await api.get('/admin/plans')).data,
  });

  const { data: payments } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-license-payments'],
    queryFn: async () => (await api.get('/admin/license-payments?status=PENDING&limit=20')).data,
  });

  const approve = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/license-payments/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-license-payments'] }); push('Pembayaran lisensi disetujui', 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal', 'error'),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => api.post(`/admin/license-payments/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-license-payments'] }); push('Pembayaran ditolak', 'success'); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => api.patch(`/admin/licenses/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-licenses'] }); push('Status lisensi diperbarui', 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal mengubah status lisensi', 'error'),
  });

  const all = data?.data ?? [];
  const planList = Array.isArray(plans.data) ? plans.data : (plans.data?.data ?? []);
  const counts = {
    all: all.length,
    ACTIVE:    all.filter((l: any) => l.status === 'ACTIVE').length,
    TRIAL:     all.filter((l: any) => l.status === 'TRIAL').length,
    EXPIRED:   all.filter((l: any) => l.status === 'EXPIRED').length,
    SUSPENDED: all.filter((l: any) => l.status === 'SUSPENDED').length,
  };
  const filtered = statusFilter === 'all' ? all : all.filter((l: any) => l.status === statusFilter);

  return (
    <div className="col" style={{ gap: 20 }}>
      {/* Paket / plan lisensi */}
      <Card>
        <CardHead
          title="Paket Lisensi"
          sub={`${planList.length} paket`}
          actions={<Btn size="sm" variant="primary" icon="plus" onClick={() => setPlanForm('new')}>Buat paket</Btn>}
        />
        <div className="card-pad">
          {plans.isLoading ? (
            <div className="muted" style={{ fontSize: 13 }}>Memuat paket...</div>
          ) : planList.length === 0 ? (
            <Empty icon="shield" title="Belum ada paket" sub="Buat paket untuk mulai memberikan lisensi." />
          ) : (
            <div className="grid grid-3" style={{ gap: 12 }}>
              {planList.map((p: any) => <PlanCard key={p.id} plan={p} onEdit={() => setPlanForm(p)} />)}
            </div>
          )}
        </div>
      </Card>

      {(payments?.data.length ?? 0) > 0 && (
        <Card>
          <CardHead title="Pembayaran lisensi menunggu" badge={<Badge variant="warn">{payments?.data.length}</Badge>} />
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 18 }}>Owner</th>
                <th>Paket</th>
                <th>Tanggal</th>
                <th className="num">Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payments?.data.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 18 }}>
                    <div className="row tight">
                      <Avatar name={p.owner?.fullName ?? '?'} size="sm" />
                      <div>
                        <div className="cell-strong">{p.owner?.fullName ?? '—'}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{p.owner?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-accent naked">{p.planName ?? '—'}</span></td>
                  <td className="mono muted">{formatDate(p.createdAt)}</td>
                  <td className="num"><span className="amt">Rp {formatRp(p.amount ?? 0)}</span></td>
                  <td>
                    <div className="row tight">
                      <Btn size="sm" variant="ghost" className="btn-danger" icon="x" onClick={() => reject.mutate(p.id)}>Tolak</Btn>
                      <Btn size="sm" variant="primary" icon="check" onClick={() => approve.mutate(p.id)} loading={approve.isPending}>Approve</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <CardHead
          title="Semua lisensi"
          sub={`${all.length} total`}
          actions={<Btn size="sm" variant="primary" icon="plus" onClick={() => setOpenCreate(true)}>Buat lisensi</Btn>}
        />
        <div className="card-pad" style={{ paddingBottom: 4 }}>
          <div className="row tight" style={{ flexWrap: 'wrap', gap: 6 }}>
            {([['all', 'Semua'], ['ACTIVE', 'Aktif'], ['TRIAL', 'Trial'], ['EXPIRED', 'Expired'], ['SUSPENDED', 'Suspended']] as const).map(([id, label]) => (
              <button key={id} className={`chip ${statusFilter === id ? 'active' : ''}`} onClick={() => setStatusFilter(id)}>
                {label} <span className="count">{counts[id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="card-pad"><Empty icon="shield" title="Tidak ada lisensi" sub="Tidak ada lisensi pada filter ini." /></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 18 }}>Owner</th>
                <th>Status</th>
                <th>Paket</th>
                <th>Berakhir</th>
                <th>Auto-renew</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => {
                const days = l.endDate ? Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000) : null;
                return (
                  <tr key={l.id}>
                    <td style={{ paddingLeft: 18 }}>
                      <div className="row tight">
                        <Avatar name={l.owner?.fullName ?? '?'} size="sm" />
                        <div>
                          <div className="cell-strong">{l.owner?.fullName ?? l.ownerId?.slice(0, 8)}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{l.owner?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><LicenseStatusBadge status={l.status} /></td>
                    <td><span className="badge badge-accent naked">{l.plan?.name ?? '—'}</span></td>
                    <td className="mono muted">
                      {l.endDate ? formatDate(l.endDate) : '—'}
                      {days !== null && (
                        <div style={{ fontSize: 10.5, color: days < 0 ? 'var(--danger)' : days <= 7 ? 'var(--warn)' : 'var(--ink-faint)' }}>
                          {days < 0 ? `Telat ${Math.abs(days)} hari` : days === 0 ? 'Hari ini' : `${days} hari lagi`}
                        </div>
                      )}
                    </td>
                    <td>{l.autoRenew ? <Badge variant="ok" naked>auto</Badge> : <span className="muted">—</span>}</td>
                    <td>
                      <div className="row tight" style={{ gap: 6 }}>
                        <select
                          value={l.status}
                          onChange={(e) => updateStatus.mutate({ id: l.id, status: e.target.value })}
                          style={STATUS_SELECT_STYLE}
                          aria-label="Ubah status lisensi"
                        >
                          {LICENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Btn size="sm" variant="ghost" icon="refresh" onClick={() => setExtendTarget(l)}>Perpanjang</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {extendTarget && <ExtendLicenseModal license={extendTarget} onClose={() => setExtendTarget(null)} />}
      {openCreate && <CreateLicenseModal onClose={() => setOpenCreate(false)} />}
      {planForm && <PlanFormModal plan={planForm === 'new' ? null : planForm} onClose={() => setPlanForm(null)} />}
    </div>
  );
}

// ─── Plan card + form ─────────────────────────────────────────────────────────
const BILLING_LABEL: Record<string, string> = { MONTHLY: '/bln', YEARLY: '/thn' };

function PlanCard({ plan, onEdit }: { plan: any; onEdit: () => void }) {
  const features: [string, boolean][] = [
    ['Reminder', plan.allowReminder],
    ['Export', plan.allowExport],
    ['Audit log', plan.allowAuditLog],
    ['Custom branding', plan.allowCustomBranding],
  ];
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, opacity: plan.isActive ? 1 : 0.6 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{plan.name}</div>
          <code style={{ fontSize: 11 }}>{plan.code}</code>
        </div>
        {plan.isActive ? <Badge variant="ok" naked>aktif</Badge> : <Badge variant="mute" naked>nonaktif</Badge>}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
        Rp {formatRp(Number(plan.price))}
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}> {BILLING_LABEL[plan.billingCycle] ?? ''}</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5 }}>Maks {plan.maxTeams} tim · {plan.maxMembers} anggota</div>
      <div className="col tight" style={{ gap: 3 }}>
        {features.map(([label, on]) => (
          <div key={label} className="row tight" style={{ fontSize: 11.5, color: on ? 'var(--ink)' : 'var(--ink-faint)' }}>
            <Icon name={on ? 'check' : 'x'} size={12} style={{ color: on ? 'var(--ok)' : 'var(--ink-faint)' }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <Btn size="sm" variant="ghost" icon="edit" onClick={onEdit} style={{ marginTop: 2 }}>Edit</Btn>
    </div>
  );
}

function PlanFormModal({ plan, onClose }: { plan: any | null; onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const editing = !!plan;
  const [f, setF] = useState({
    name: plan?.name ?? '',
    code: plan?.code ?? '',
    price: plan?.price != null ? Number(plan.price) : 0,
    billingCycle: plan?.billingCycle ?? 'MONTHLY',
    maxTeams: plan?.maxTeams ?? 1,
    maxMembers: plan?.maxMembers ?? 10,
    allowReminder: plan?.allowReminder ?? true,
    allowExport: plan?.allowExport ?? true,
    allowAuditLog: plan?.allowAuditLog ?? true,
    allowCustomBranding: plan?.allowCustomBranding ?? false,
    isActive: plan?.isActive ?? true,
  });

  const save = useMutation({
    mutationFn: async () => (editing ? api.patch(`/admin/plans/${plan.id}`, f) : api.post('/admin/plans', f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); push(editing ? 'Paket diperbarui' : 'Paket dibuat', 'success'); onClose(); },
    onError: (e: any) => push(e?.message ?? 'Gagal menyimpan paket', 'error'),
  });

  const valid = Boolean(f.name.trim() && f.code.trim() && f.price >= 0 && f.maxTeams >= 1 && f.maxMembers >= 1);
  const num = (v: string, min: number) => { const n = Number(v); return Number.isFinite(n) ? n : min; };

  const FEATURES: [keyof typeof f, string][] = [
    ['allowReminder', 'Reminder iuran'],
    ['allowExport', 'Export laporan'],
    ['allowAuditLog', 'Audit log'],
    ['allowCustomBranding', 'Custom branding'],
  ];

  const footer = (
    <>
      <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>Batal</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon="check" onClick={() => save.mutate()} loading={save.isPending} disabled={!valid}>
        {editing ? 'Simpan' : 'Buat paket'}
      </Btn>
    </>
  );

  return (
    <Modal open onClose={onClose} title={editing ? `Edit paket — ${plan.name}` : 'Buat paket'} wide footer={footer}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Nama paket">
            <InputWrap><input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Cth. Basic" /></InputWrap>
          </Field>
          <Field label="Kode">
            <InputWrap><input value={f.code} onChange={(e) => setF((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="Cth. BASIC" style={{ fontFamily: 'var(--font-mono)' }} /></InputWrap>
          </Field>
        </div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Harga (Rp)">
            <InputWrap><input type="number" min={0} value={f.price} onChange={(e) => setF((s) => ({ ...s, price: num(e.target.value, 0) }))} /></InputWrap>
          </Field>
          <Field label="Siklus billing">
            <select value={f.billingCycle} onChange={(e) => setF((s) => ({ ...s, billingCycle: e.target.value }))} style={SELECT_STYLE}>
              <option value="MONTHLY">Bulanan</option>
              <option value="YEARLY">Tahunan</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Maks tim">
            <InputWrap><input type="number" min={1} value={f.maxTeams} onChange={(e) => setF((s) => ({ ...s, maxTeams: num(e.target.value, 1) }))} /></InputWrap>
          </Field>
          <Field label="Maks anggota">
            <InputWrap><input type="number" min={1} value={f.maxMembers} onChange={(e) => setF((s) => ({ ...s, maxMembers: num(e.target.value, 1) }))} /></InputWrap>
          </Field>
        </div>
        <Field label="Fitur">
          <div className="col tight" style={{ gap: 6 }}>
            {FEATURES.map(([key, label]) => (
              <label key={key} className="row tight" style={{ cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={f[key] as boolean} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.checked }))} />
                <span>{label}</span>
              </label>
            ))}
            <label className="row tight" style={{ cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
              <input type="checkbox" checked={f.isActive} onChange={(e) => setF((s) => ({ ...s, isActive: e.target.checked }))} />
              <span><strong>Paket aktif</strong> (bisa dipilih saat buat lisensi)</span>
            </label>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

const LICENSE_STATUSES = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;
const STATUS_SELECT_STYLE: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 12, color: 'var(--ink)',
};

function LicenseStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-ok', TRIAL: 'badge-accent', EXPIRED: 'badge-danger', SUSPENDED: 'badge-warn', CANCELLED: 'badge-mute',
  };
  const label: Record<string, string> = {
    ACTIVE: 'Aktif', TRIAL: 'Trial', EXPIRED: 'Expired', SUSPENDED: 'Suspended', CANCELLED: 'Dibatalkan',
  };
  return <span className={`badge ${map[status] ?? 'badge-mute'}`}>{label[status] ?? status}</span>;
}

// ─── Extend license modal ─────────────────────────────────────────────────────
function ExtendLicenseModal({ license, onClose }: { license: any; onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [cycles, setCycles] = useState(1);

  const extend = useMutation({
    mutationFn: async () => api.post(`/admin/licenses/${license.id}/extend`, { cycles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-licenses'] });
      push(`Lisensi diperpanjang ${cycles} siklus`, 'success');
      onClose();
    },
    onError: (e: any) => push(e?.message ?? 'Gagal memperpanjang lisensi', 'error'),
  });

  const footer = (
    <>
      <Btn variant="ghost" onClick={onClose} disabled={extend.isPending}>Batal</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon="check" onClick={() => extend.mutate()} loading={extend.isPending}>Perpanjang</Btn>
    </>
  );

  return (
    <Modal open onClose={onClose} title="Perpanjang lisensi" footer={footer}>
      <div className="col" style={{ gap: 16 }}>
        <div className="row tight" style={{ gap: 10 }}>
          <Avatar name={license.owner?.fullName ?? '?'} size="md" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{license.owner?.fullName ?? '—'}</div>
            <div className="muted" style={{ fontSize: 12 }}>Paket {license.plan?.name ?? '—'} · berakhir {license.endDate ? formatDate(license.endDate) : '—'}</div>
          </div>
        </div>
        <Field label="Jumlah siklus billing">
          <div className="row tight" style={{ flexWrap: 'wrap', gap: 6 }}>
            {[1, 3, 6, 12].map((c) => (
              <button key={c} type="button" className={`chip ${cycles === c ? 'active' : ''}`} onClick={() => setCycles(c)}>
                {c} siklus
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

// ─── Create license modal ─────────────────────────────────────────────────────
function CreateLicenseModal({ onClose }: { onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();

  const users = useQuery<{ data: any[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users?limit=100')).data,
  });
  const plans = useQuery<any>({
    queryKey: ['admin-plans'],
    queryFn: async () => (await api.get('/admin/plans')).data,
  });

  const today = new Date().toISOString().slice(0, 10);
  const plus = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

  const [form, setForm] = useState({
    ownerId: '', planId: '', status: 'ACTIVE', startDate: today, endDate: plus(365), autoRenew: false,
  });

  const userList = users.data?.data ?? [];
  const planList = Array.isArray(plans.data) ? plans.data : (plans.data?.data ?? []);

  const create = useMutation({
    mutationFn: async () => api.post('/admin/licenses', {
      ownerId: form.ownerId,
      planId: form.planId,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      autoRenew: form.autoRenew,
      ...(form.status === 'TRIAL' ? { trialEndsAt: form.endDate } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-licenses'] });
      push('Lisensi berhasil dibuat', 'success');
      onClose();
    },
    onError: (e: any) => push(e?.message ?? 'Gagal membuat lisensi', 'error'),
  });

  const valid = Boolean(form.ownerId && form.planId && form.startDate && form.endDate && form.endDate >= form.startDate);

  const footer = (
    <>
      <Btn variant="ghost" onClick={onClose} disabled={create.isPending}>Batal</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon="check" onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}>Buat lisensi</Btn>
    </>
  );

  return (
    <Modal open onClose={onClose} title="Buat lisensi" footer={footer}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Owner">
          <select value={form.ownerId} onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))} style={SELECT_STYLE}>
            <option value="">— pilih owner —</option>
            {userList.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
          </select>
        </Field>
        <Field label="Paket">
          <select value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} style={SELECT_STYLE}>
            <option value="">— pilih paket —</option>
            {planList.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` · Rp ${formatRp(Number(p.price))}` : ''}</option>)}
          </select>
        </Field>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={SELECT_STYLE}>
              {LICENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Auto-renew">
            <label className="row tight" style={{ cursor: 'pointer', fontSize: 13, alignItems: 'center', paddingTop: 8 }}>
              <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))} />
              <span>Perpanjang otomatis</span>
            </label>
          </Field>
        </div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Mulai">
            <input type="date" value={form.startDate} max={form.endDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} style={SELECT_STYLE} />
          </Field>
          <Field label="Berakhir">
            <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} style={SELECT_STYLE} />
          </Field>
        </div>
        {(users.isLoading || plans.isLoading) && <div className="muted" style={{ fontSize: 12 }}>Memuat owner &amp; paket…</div>}
      </div>
    </Modal>
  );
}

// ─── Teams tab ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-teams', page, limit, debouncedSearch],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
      if (debouncedSearch) q.set('search', debouncedSearch);
      return (await api.get(`/admin/teams?${q.toString()}`)).data;
    },
  });

  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Card>
        <CardHead 
          title="Semua Tim" 
          sub="Klik baris untuk lihat detail" 
          badge={<Badge variant="mute" naked>{total}</Badge>} 
          actions={
            <div className="row tight" style={{ background: 'var(--surface)', padding: '6px 12px', borderRadius: 999 }}>
              <Icon name="search" size={14} className="muted" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Cari tim..." 
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 140 }} 
              />
            </div>
          }
        />
        {isLoading ? (
          <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="card-pad"><Empty icon="globe" title="Belum ada tim" sub="Tim yang dibuat owner akan muncul di sini." /></div>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18 }}>Nama tim</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((t: any) => (
                  <tr key={t.id} className="clickable" onClick={() => setSelected(t.id)}>
                    <td style={{ paddingLeft: 18 }} className="cell-strong">{t.name}</td>
                    <td className="muted">{t.owner?.fullName ?? '—'}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="mono muted">{formatDate(t.createdAt)}</td>
                    <td><button className="iconbtn" aria-label="Lihat detail"><Icon name="chev" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="card-pad" style={{ borderTop: '1px solid var(--line-soft)' }}>
                <Pagination page={page} totalPages={totalPages} pageSize={limit} total={total} onPage={setPage} onPageSize={(s) => { setLimit(s); setPage(1); }} />
              </div>
            )}
          </>
        )}
      </Card>

      {selected && <TeamDetailModal teamId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

// ─── Team detail modal ────────────────────────────────────────────────────────
function TeamDetailModal({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const { data: team, isLoading } = useQuery<any>({
    queryKey: ['admin-team', teamId],
    queryFn: async () => (await api.get(`/admin/teams/${teamId}`)).data,
  });
  const { data: members } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-team-members', teamId],
    queryFn: async () => (await api.get(`/admin/teams/${teamId}/members?limit=100`)).data,
  });

  const setStatus = useMutation({
    mutationFn: async (status: 'ACTIVE' | 'SUSPENDED') => api.patch(`/admin/teams/${teamId}/status`, { status }),
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ['admin-team', teamId] });
      qc.invalidateQueries({ queryKey: ['admin-teams'] });
      setConfirmSuspend(false);
      push(status === 'ACTIVE' ? 'Tim berhasil diaktifkan' : 'Tim berhasil disuspend', 'success');
    },
    onError: (e: any) => push(e?.message ?? 'Gagal mengubah status tim', 'error'),
  });

  const memberList = members?.data ?? [];
  const isActive = team?.status === 'ACTIVE';

  const footer = team ? (
    isActive ? (
      <Btn variant="danger" icon="shield" onClick={() => setConfirmSuspend(true)}>
        Suspend tim
      </Btn>
    ) : (
      <Btn variant="primary" icon="check" onClick={() => setStatus.mutate('ACTIVE')} loading={setStatus.isPending}>
        Aktifkan tim
      </Btn>
    )
  ) : undefined;

  return (
    <>
    <Modal open onClose={onClose} title="Detail Tim" wide footer={footer}>
      {isLoading || !team ? (
        <div className="muted" style={{ fontSize: 13 }}>Memuat...</div>
      ) : (
        <div className="col" style={{ gap: 20 }}>
          {/* Header */}
          <div className="row tight" style={{ gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {team.name?.[0] ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{team.name}</div>
              <div className="row tight" style={{ gap: 6 }}>
                <StatusBadge status={team.status} />
                <code style={{ fontSize: 11 }}>{team.inviteCode}</code>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-3" style={{ gap: 10 }}>
            <DrawerStat label="Anggota" value={team.totalMembers ?? memberList.length} />
            <DrawerStat label="Invoice" value={team.totalInvoices ?? '—'} />
            <DrawerStat label="Saldo" value={`Rp ${formatRp(team.balance ?? 0)}`} small />
          </div>

          {/* Info */}
          <div className="col tight" style={{ fontSize: 13 }}>
            <DrawerRow label="Owner" value={team.owner?.fullName ?? '—'} sub={team.owner?.email} />
            <DrawerRow label="Dibuat" value={formatDate(team.createdAt)} />
            <DrawerRow label="Jatuh tempo default" value={`Tanggal ${team.defaultInvoiceDueDay ?? '—'}`} />
            {team.description && <DrawerRow label="Deskripsi" value={team.description} />}
          </div>

          {/* Members */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Anggota ({memberList.length})</div>
            {memberList.length === 0 ? (
              <Empty icon="users" title="Belum ada anggota" />
            ) : (
              <div className="col tight">
                {memberList.map((m: any) => (
                  <div key={m.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <div className="row tight" style={{ minWidth: 0 }}>
                      <Avatar name={m.memberName ?? m.user?.fullName ?? '?'} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.memberName ?? m.user?.fullName ?? '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{m.role?.name ?? m.systemRole}</div>
                      </div>
                    </div>
                    <div className="row tight" style={{ flexShrink: 0 }}>
                      <span className="badge badge-mute naked">{m.systemRole}</span>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>

    {confirmSuspend && (
      <Modal
        open
        onClose={() => setConfirmSuspend(false)}
        title="Suspend tim?"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmSuspend(false)} disabled={setStatus.isPending}>Batal</Btn>
            <span className="spacer" />
            <Btn variant="danger" icon="shield" onClick={() => setStatus.mutate('SUSPENDED')} loading={setStatus.isPending}>Ya, suspend</Btn>
          </>
        }
      >
        <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
          Tim <strong>{team?.name}</strong> akan disuspend. Anggota tidak dapat mengakses tim ini sampai diaktifkan kembali.
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Tindakan ini dapat dibatalkan kapan saja dengan mengaktifkan kembali tim.</div>
        </div>
      </Modal>
    )}
    </>
  );
}

function DrawerStat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 12 }}>
      <div className="muted" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: small ? 15 : 20, letterSpacing: '-0.02em', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DrawerRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', gap: 12 }}>
      <span className="muted" style={{ flexShrink: 0 }}>{label}</span>
      <span style={{ textAlign: 'right', minWidth: 0 }}>
        {value}
        {sub && <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>}
      </span>
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-users', page, limit, debouncedSearch],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: limit.toString(), page: page.toString() });
      if (debouncedSearch) q.set('search', debouncedSearch);
      return (await api.get(`/admin/users?${q.toString()}`)).data;
    },
  });

  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); push('Status user diperbarui', 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal', 'error'),
  });

  const [manage, setManage] = useState<any | null>(null);

  return (
    <>
      <Card>
        <CardHead 
          title="Semua User" 
          badge={<Badge variant="mute" naked>{total}</Badge>} 
          actions={
            <div className="row tight" style={{ background: 'var(--surface)', padding: '6px 12px', borderRadius: 999 }}>
              <Icon name="search" size={14} className="muted" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Cari user..." 
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 140 }} 
              />
            </div>
          }
        />
        {isLoading ? (
          <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="card-pad"><Empty icon="users" title="Belum ada user" /></div>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18 }}>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Bergabung</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((u: any) => (
                  <tr key={u.id}>
                    <td style={{ paddingLeft: 18 }}>
                      <div className="row tight">
                        <Avatar name={u.fullName ?? '?'} size="sm" />
                        <div>
                          <div className="cell-strong">{u.fullName}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-mute naked">{u.role}</span></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="mono muted">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="row tight">
                        <Btn size="sm" variant="ghost" icon="settings" onClick={() => setManage(u)}>Kelola</Btn>
                        <Btn size="sm" variant="ghost"
                          onClick={() => toggleStatus.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>
                          {u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="card-pad" style={{ borderTop: '1px solid var(--line-soft)' }}>
                <Pagination page={page} totalPages={totalPages} pageSize={limit} total={total} onPage={setPage} onPageSize={(s) => { setLimit(s); setPage(1); }} />
              </div>
            )}
          </>
        )}
      </Card>

      {manage && <UserManageModal user={manage} onClose={() => setManage(null)} />}
    </>
  );
}

const ROLE_OPTIONS = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'TREASURER', 'MEMBER'] as const;
const SELECT_STYLE: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', flex: 1,
};

// ─── User manage modal (ubah role + reset password) ──────────────────────────
function UserManageModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [role, setRole] = useState<string>(user.role);
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const updateRole = useMutation({
    mutationFn: async () => api.patch(`/admin/users/${user.id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); push(`Role ${user.fullName} diubah ke ${role}`, 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal mengubah role', 'error'),
  });

  const resetPw = useMutation({
    mutationFn: async () => api.patch(`/admin/users/${user.id}/password`, { newPassword }),
    onSuccess: () => { setNewPassword(''); push(`Password ${user.fullName} berhasil direset`, 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal reset password', 'error'),
  });

  return (
    <Modal open onClose={onClose} title="Kelola user" footer={<Btn variant="ghost" onClick={onClose}>Tutup</Btn>}>
      <div className="col" style={{ gap: 18 }}>
        <div className="row tight" style={{ gap: 11 }}>
          <Avatar name={user.fullName ?? '?'} size="md" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.fullName}</div>
            <div className="muted" style={{ fontSize: 12 }}>{user.email}</div>
          </div>
        </div>

        <Field label="Role sistem">
          <div className="row tight" style={{ gap: 8 }}>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={SELECT_STYLE} aria-label="Role">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Btn variant="primary" icon="check" onClick={() => updateRole.mutate()} loading={updateRole.isPending} disabled={role === user.role}>
              Simpan
            </Btn>
          </div>
        </Field>

        <div style={{ height: 1, background: 'var(--line-soft)' }} />

        <Field label="Reset password" help="Minimal 8 karakter. User akan login dengan password baru ini.">
          <div className="row tight" style={{ gap: 8 }}>
            <label className="input" style={{ flex: 1 }}>
              <Icon name="lock" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                placeholder="Password baru"
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" className="iconbtn" onClick={() => setShowPw(!showPw)} style={{ width: 28, height: 28, flexShrink: 0 }} aria-label={showPw ? 'Sembunyikan' : 'Tampilkan'}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={14} />
              </button>
            </label>
            <Btn variant="default" icon="refresh" onClick={() => resetPw.mutate()} loading={resetPw.isPending} disabled={newPassword.length < 8}>
              Reset
            </Btn>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

// ─── EOD tab ──────────────────────────────────────────────────────────────────
const EOD_MODE_LABEL: Record<string, string> = { MANUAL: 'Manual', AUTO: 'Otomatis' };

function fmtDateTime(d: string) {
  return formatDate(d, { hour: '2-digit', minute: '2-digit' });
}

function eodDuration(r: any): string {
  if (!r.startedAt) return '—';
  if (!r.finishedAt) return r.status === 'RUNNING' ? 'berjalan…' : '—';
  const ms = new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
  if (ms < 0) return '—';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function EodStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { SUCCESS: 'badge-ok', RUNNING: 'badge-info', FAILED: 'badge-danger' };
  const label: Record<string, string> = { SUCCESS: 'Sukses', RUNNING: 'Berjalan', FAILED: 'Gagal' };
  return <span className={`badge ${map[status] ?? 'badge-mute'}`}>{label[status] ?? status}</span>;
}

function EodTab() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const { data: history, isLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['eod-history', page, limit],
    queryFn: async () => (await api.get(`/admin/eod/history?limit=${limit}&page=${page}`)).data,
  });

  const total = history?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const run = useMutation({
    mutationFn: async () => api.post('/admin/eod/run'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eod-history'] }); push('EOD berhasil dijalankan', 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal jalankan EOD', 'error'),
  });

  const runs = history?.data ?? [];
  const last = runs[0];
  const running = runs.some((r: any) => r.status === 'RUNNING');

  return (
    <div className="col" style={{ gap: 16 }}>
      <Card>
        <CardHead title="End-of-Day Process" sub="Tandai invoice telat sebagai overdue & proses tagihan" />
        <div className="card-pad col" style={{ gap: 16 }}>
          {last && (
            <div className="row between" style={{ gap: 12, flexWrap: 'wrap', padding: 14, background: 'var(--surface)', borderRadius: 12 }}>
              <div className="row tight" style={{ gap: 11 }}>
                <span style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: last.status === 'SUCCESS' ? 'var(--ok-soft)' : last.status === 'FAILED' ? 'var(--danger-soft)' : 'var(--info-soft)',
                  color: last.status === 'SUCCESS' ? 'var(--ok)' : last.status === 'FAILED' ? 'var(--danger)' : 'var(--info)',
                }}>
                  <Icon name={last.status === 'SUCCESS' ? 'checkCircle' : last.status === 'FAILED' ? 'alert' : 'refresh'} size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Run terakhir · {fmtDateTime(last.startedAt ?? last.createdAt)}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {EOD_MODE_LABEL[last.mode] ?? last.mode} · oleh {last.triggeredBy?.fullName ?? 'Sistem'} · durasi {eodDuration(last)}
                  </div>
                </div>
              </div>
              <div className="row tight" style={{ gap: 16 }}>
                <EodMiniNum label="Diproses" value={last.processedCount ?? 0} />
                <EodMiniNum label="Sukses"   value={last.successCount ?? 0} color="var(--ok)" />
                <EodMiniNum label="Gagal"    value={last.failedCount ?? 0} color={(last.failedCount ?? 0) > 0 ? 'var(--danger)' : undefined} />
              </div>
            </div>
          )}

          {last?.status === 'FAILED' && last.errorMessage && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 10, fontSize: 12.5, color: 'var(--danger)' }}>
              <strong>Error:</strong> {last.errorMessage}
            </div>
          )}

          <div style={{ padding: '12px 16px', background: 'var(--warn-soft)', borderRadius: 12, fontSize: 12.5, color: 'oklch(0.45 0.13 78)' }}>
            <strong>Perhatian:</strong> EOD memproses tagihan dan menandai invoice telat sebagai overdue. Jalankan hanya jika diperlukan.
          </div>

          <div>
            <Btn variant="primary" icon="zap" onClick={() => run.mutate()} loading={run.isPending} disabled={running}>
              {running ? 'EOD sedang berjalan…' : 'Jalankan EOD sekarang'}
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Riwayat EOD" badge={<Badge variant="mute" naked>{history?.meta?.total ?? runs.length}</Badge>} />
        {isLoading ? (
          <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
        ) : runs.length === 0 ? (
          <div className="card-pad"><Empty icon="history" title="Belum ada riwayat EOD" sub="Jalankan EOD untuk melihat riwayatnya di sini." /></div>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18 }}>Waktu</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th className="num">Diproses</th>
                  <th className="num">Sukses</th>
                  <th className="num">Gagal</th>
                  <th>Durasi</th>
                  <th>Pemicu</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((h: any) => (
                  <tr key={h.id}>
                    <td style={{ paddingLeft: 18 }} className="mono">{fmtDateTime(h.startedAt ?? h.createdAt)}</td>
                    <td><Badge variant={h.mode === 'MANUAL' ? 'info' : 'mute'} naked>{EOD_MODE_LABEL[h.mode] ?? h.mode}</Badge></td>
                    <td><EodStatusBadge status={h.status} /></td>
                    <td className="num">{h.processedCount ?? 0}</td>
                    <td className="num" style={{ color: 'var(--ok)' }}>{h.successCount ?? 0}</td>
                    <td className="num" style={{ color: (h.failedCount ?? 0) > 0 ? 'var(--danger)' : 'var(--ink-faint)' }}>{h.failedCount ?? 0}</td>
                    <td className="mono muted">{eodDuration(h)}</td>
                    <td className="muted">{h.triggeredBy?.fullName ?? 'Sistem'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="card-pad" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
                <Pagination page={page} totalPages={totalPages} pageSize={limit} total={total} onPage={setPage} onPageSize={(s) => { setLimit(s); setPage(1); }} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function EodMiniNum({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: color ?? 'var(--ink)' }}>{value}</div>
    </div>
  );
}

// ─── Invoices Global Tab ───────────────────────────────────────────────────────
function InvoicesGlobalTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const { data, isLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-invoices-global', page, limit],
    queryFn: async () => (await api.get(`/admin/invoices?limit=${limit}&page=${page}`)).data,
  });

  const invoices = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Card>
      <CardHead title="Semua Invoice" sub="Seluruh tagihan lintas tim" badge={<Badge variant="mute" naked>{total}</Badge>} />
      {isLoading ? (
        <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
      ) : invoices.length === 0 ? (
        <div className="card-pad"><Empty icon="file" title="Belum ada invoice" /></div>
      ) : (
        <>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 18 }}>Kode</th>
                <th>Tim</th>
                <th>Member</th>
                <th>Periode</th>
                <th>Jatuh Tempo</th>
                <th className="num">Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td style={{ paddingLeft: 18 }} className="mono cell-strong">{inv.invoiceCode}</td>
                  <td className="muted">{inv.team?.name ?? '—'}</td>
                  <td>
                    <div className="row tight">
                      <Avatar name={inv.user?.fullName ?? '?'} size="sm" />
                      <div>
                        <div className="cell-strong">{inv.user?.fullName ?? '—'}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{inv.role?.name ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono muted">{formatDate(inv.periodDate, { month: 'short', year: 'numeric' })}</td>
                  <td className="mono muted">{formatDate(inv.dueDate)}</td>
                  <td className="num"><span className="amt">Rp {formatRp(inv.amount ?? 0)}</span></td>
                  <td><InvoiceStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-pad" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
            <Pagination page={page} totalPages={totalPages} pageSize={limit} total={total} onPage={setPage} onPageSize={(s) => { setLimit(s); setPage(1); }} />
          </div>
        </>
      )}
    </Card>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'badge-ok', UNPAID: 'badge-warn', DRAFT: 'badge-mute', OVERDUE: 'badge-danger', CANCELLED: 'badge-mute', PARTIAL: 'badge-info', EXPIRED: 'badge-danger',
  };
  const label: Record<string, string> = {
    PAID: 'Lunas', UNPAID: 'Belum dibayar', DRAFT: 'Draft', OVERDUE: 'Terlambat', CANCELLED: 'Dibatalkan', PARTIAL: 'Parsial', EXPIRED: 'Kedaluwarsa',
  };
  return <span className={`badge ${map[status] ?? 'badge-mute'}`}>{label[status] ?? status}</span>;
}

// ─── Audit Global Tab ──────────────────────────────────────────────────────────
const KIND_CLASS: Record<string,string> = { CREATE:'create', APPROVE:'approve', REJECT:'reject', UPDATE:'update', DELETE:'reject' };

function AuditGlobalTab() {
  const [kindFilter, setKindFilter]   = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data, isLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-audit-global'],
    queryFn: async () => (await api.get(`/admin/audit-logs?limit=300`)).data,
  });

  const logs = (data?.data ?? []).filter((l: any) => {
    if (q && !JSON.stringify(l).toLowerCase().includes(q.toLowerCase())) return false;
    if (kindFilter !== 'all') {
      const k = l.action.toUpperCase();
      if (kindFilter === 'create' && !k.includes('CREATE') && !k.includes('GENERATE')) return false;
      if (kindFilter === 'approve' && !k.includes('APPROVE')) return false;
      if (kindFilter === 'reject' && !k.includes('REJECT')) return false;
      if (kindFilter === 'update' && !k.includes('UPDATE') && !k.includes('PATCH')) return false;
    }
    return true;
  });

  const totalPages   = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage     = Math.min(page, totalPages);
  const pagedLogs    = logs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const groups: Record<string, any[]> = {};
  pagedLogs.forEach((l: any) => {
    const d = new Date(l.createdAt);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    const lDate = new Date(l.createdAt); lDate.setHours(0,0,0,0);
    const key = lDate >= today ? 'Hari ini' : lDate >= yesterday ? 'Kemarin' : formatDate(l.createdAt, { day: 'numeric', month: 'long' });
    (groups[key] = groups[key] || []).push(l);
  });

  return (
    <div className="col" style={{ gap: 16 }}>
      <Card>
        <CardHead title="Audit Log Platform" sub="Aktivitas lintas tim" />
        <div className="card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)' }}>
          <InputWrap icon="search" style={{ maxWidth: 280 }}>
            <input placeholder="Cari di log..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
          </InputWrap>
          <span className="muted" style={{ fontSize: 12, marginLeft: 12 }}>Jenis:</span>
          {[['all','Semua'],['create','Dibuat'],['approve','Approve'],['reject','Reject'],['update','Update']].map(([k,l]) => (
            <button key={k} className={`chip ${kindFilter === k ? 'active' : ''}`} onClick={() => { setKindFilter(k); setPage(1); }}>{l}</button>
          ))}
        </div>
      </Card>
      
      {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat log...</div>}
      {!isLoading && logs.length === 0 && <Empty icon="history" title="Tidak ada log" sub="Belum ada aktivitas tercatat" />}
      {!isLoading && logs.length > 0 && Object.entries(groups).map(([heading, items]) => (
        <div key={heading} style={{ marginBottom: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{heading}</div>
          <Card>
            <div className="card-pad">
              <div className="timeline">
                {items.map(e => {
                  const kind = KIND_CLASS[e.action.split('_')[0]] ?? 'update';
                  return (
                    <div key={e.id} className={`timeline-item ${kind}`}>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', flex: '0 0 90px', fontFamily: 'var(--font-mono)' }}>
                        {new Date(e.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="row tight">
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{e.actor?.fullName ?? 'Sistem'}</span>
                          {e.team?.name ? (
                            <span className="badge badge-mute naked">Tim: {e.team.name}</span>
                          ) : (
                            <span className="badge badge-accent naked">Platform</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {e.action} · {e.module}
                          {e.targetId && <> · <code>{e.targetId.slice(0,8)}…</code></>}
                        </div>
                        {e.ipAddress && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{e.ipAddress}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      ))}
      {!isLoading && logs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, paddingBottom: 16 }}>
          <Pagination
            page={safePage} totalPages={totalPages} pageSize={pageSize} total={logs.length}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
