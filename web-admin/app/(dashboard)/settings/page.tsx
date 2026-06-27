'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveTeamId, useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getStoredAuth, setStoredAuth } from '@/lib/auth';
import { useToast } from '@/app/providers';
import {
  Btn, Avatar, Card, CardHead, Field, InputWrap, Modal, Badge,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatRp, passwordStrength } from '@/lib/utils';
import type { AuthUser, TeamRole } from '@/types';

type SettingsTab = 'profile' | 'team' | 'roles' | 'security';

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('team');
  const user    = useUser();
  const teamId  = useActiveTeamId();
  const isSuperAdmin = user?.isSuperAdmin ?? user?.role === 'SUPER_ADMIN';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Konfigurasi</div>
          <h1>Pengaturan</h1>
          <div className="subtitle">Kelola profil, tim, dan akses.</div>
        </div>
      </div>

      <div className="page-tools">
        {([
          ['team',     'Profil tim'],
          ['roles',    'Jabatan & iuran'],
          ['profile',  'Profil saya'],
          ['security', 'Keamanan'],
        ] as [SettingsTab, string][]).map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="page-body" style={{ paddingTop: 0 }}>
          <Card className="callout-card">
            <CardHead title="Email Templates" sub="Template transactional Brevo untuk Super Admin" />
            <div className="card-pad row between" style={{ gap: 16 }}>
              <div className="muted" style={{ maxWidth: 620 }}>
                Kelola template reset password, invoice reminder, verifikasi email, dan email sistem lain dari satu panel admin terpusat.
              </div>
              <Link href="/settings/email-templates" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Buka Email Templates
              </Link>
            </div>
          </Card>
        </div>
      )}

      <div className="page-body">
        {tab === 'team'     && <TeamSettings teamId={teamId} />}
        {tab === 'roles'    && <RolesSettings teamId={teamId} />}
        {tab === 'profile'  && <ProfileSettings user={user} />}
        {tab === 'security' && <SecuritySettings />}
      </div>
    </>
  );
}

// ─── Team settings ────────────────────────────────────────────────────────────
function TeamSettings({ teamId }: { teamId: string | null }) {
  const user = useUser();
  const qc = useQueryClient();
  const { push } = useToast();
  const { data: team, isLoading } = useTeam(teamId);
  const [form, setForm] = useState({ name: '', description: '', defaultInvoiceDueDay: 20 });
  const [dirty, setDirty] = useState(false);

  const canEdit = user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || ['OWNER', 'ADMIN'].includes(team?.userRole || '');

  // Sinkronkan form dengan data tim saat dimuat / berganti tim, supaya menyimpan
  // tidak menimpa field yang tidak diubah (mis. nama jadi kosong).
  useEffect(() => {
    if (team) {
      setForm({
        name: team.name ?? '',
        description: team.description ?? '',
        defaultInvoiceDueDay: team.defaultInvoiceDueDay ?? 20,
      });
      setDirty(false);
    }
  }, [team]);

  const update = useMutation({
    mutationFn: async (payload: typeof form) => api.patch(`/teams/${teamId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      push('Profil tim berhasil diperbarui', 'success');
      setDirty(false);
    },
    onError: (e: any) => push(e?.message ?? 'Gagal simpan', 'error'),
  });

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) { push('Nama tim wajib diisi', 'error'); return; }
    update.mutate({ ...form, name });
  };

  if (isLoading) return <div className="muted" style={{ fontSize: 13 }}>Memuat...</div>;

  return (
    <div className="col" style={{ gap: 20, maxWidth: 640 }}>
      <Card>
        <CardHead title="Profil tim" />
        <div className="card-pad col" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'var(--ink)', color: 'var(--bg)',
              display: 'grid', placeItems: 'center',
              fontSize: 24, fontWeight: 700, flexShrink: 0,
            }}>
              {(team?.name?.[0] ?? 'T')}
            </div>
            <div className="col tight" style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{team?.name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Kode undangan: <code>{team?.inviteCode}</code></div>
              <Badge variant="ok" naked>{team?.status ?? 'ACTIVE'}</Badge>
            </div>
          </div>

          <div className="div" />

          <Field label="Nama tim">
            <InputWrap>
              <input
                value={form.name}
                placeholder="Nama tim Anda"
                disabled={!canEdit}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setDirty(true); }}
              />
            </InputWrap>
          </Field>

          <Field label="Deskripsi (opsional)">
            <label className="input" style={{ height: 'auto', padding: '10px 12px', alignItems: 'flex-start', opacity: canEdit ? 1 : 0.7 }}>
              <textarea rows={2}
                value={form.description}
                disabled={!canEdit}
                placeholder="Deskripsi singkat tim..."
                onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setDirty(true); }}
                style={{ border: 0, outline: 0, background: 'transparent', width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </label>
          </Field>

          <Field label="Hari jatuh tempo default" help="Tagihan otomatis jatuh tempo pada hari ke-N setiap bulan">
            <InputWrap icon="calendar">
              <input type="number" min={1} max={28}
                disabled={!canEdit}
                value={form.defaultInvoiceDueDay}
                onChange={(e) => { setForm((f) => ({ ...f, defaultInvoiceDueDay: +e.target.value })); setDirty(true); }}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}
              />
            </InputWrap>
          </Field>

          {canEdit && dirty && (
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Btn variant="primary" icon="check" onClick={handleSave} loading={update.isPending}>
                Simpan perubahan
              </Btn>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHead title="Kode undangan" sub="Bagikan ke anggota baru" />
        <div className="card-pad">
          <div className="row" style={{ gap: 12 }}>
            <div className="input" style={{ flex: 1, background: 'var(--surface)' }}>
              <code style={{ fontSize: 13, background: 'transparent', padding: 0 }}>
                kolekto.id/join/{team?.inviteCode}
              </code>
            </div>
            <Btn icon="copy" onClick={() => {
              navigator.clipboard.writeText(`kolekto.id/join/${team?.inviteCode ?? ''}`);
              push('Link disalin', 'success');
            }}>Salin</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Roles settings ───────────────────────────────────────────────────────────
function RolesSettings({ teamId }: { teamId: string | null }) {
  const user = useUser();
  const { data: team } = useTeam(teamId);
  const canManage = user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || ['OWNER', 'ADMIN', 'TREASURER'].includes(team?.userRole || '');

  const { push } = useToast();
  const { data: roles, isLoading } = useQuery<TeamRole[]>({
    queryKey: ['roles', teamId],
    queryFn: async () => {
      const res = await api.get<TeamRole[]>(`/teams/${teamId}/roles`);
      return res.data;
    },
    enabled: !!teamId,
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: '', feeAmount: '', periodType: 'MONTHLY', invoiceDueDay: '20' });

  const qc = useQueryClient();
  const createRole = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.post(`/teams/${teamId}/roles`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', teamId] });
      push('Jabatan berhasil ditambahkan', 'success');
      setOpenAdd(false);
      setForm({ name: '', feeAmount: '', periodType: 'MONTHLY', invoiceDueDay: '20' });
    },
    onError: (e: any) => push(e?.message ?? 'Gagal tambah jabatan', 'error'),
  });

  const ROLE_COLORS = ['var(--accent)', 'var(--info)', 'oklch(0.62 0.13 280)', 'var(--ok)', 'var(--warn)'];

  return (
    <>
      <div className="col" style={{ gap: 16, maxWidth: 640 }}>
        <div className="row between">
          <div>
            <div className="h3">Jabatan &amp; nominal iuran</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Iuran dihitung mengikuti jabatan tiap anggota.</div>
          </div>
          {canManage && <Btn icon="plus" variant="primary" onClick={() => setOpenAdd(true)}>Tambah jabatan</Btn>}
        </div>

        {isLoading && <div className="muted" style={{ fontSize: 13 }}>Memuat jabatan...</div>}

        {(roles ?? []).map((r, i) => (
          <div key={r.id} className="card card-pad row between">
            <div className="row tight">
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `color-mix(in srgb, ${ROLE_COLORS[i % ROLE_COLORS.length]} 15%, var(--surface))`,
                display: 'grid', placeItems: 'center',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.memberCount ?? 0} anggota · {r.periodType === 'MONTHLY' ? 'Bulanan' : r.periodType}
                  {r.invoiceDueDay ? ` · Jatuh tempo tgl ${r.invoiceDueDay}` : ''}
                </div>
              </div>
            </div>
            <div className="row tight">
              <div style={{ textAlign: 'right' }}>
                <div className="amt" style={{ fontWeight: 700, fontSize: 16 }}>
                  Rp {formatRp(r.feeAmount)}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>per periode</div>
              </div>
              {canManage && <Btn size="sm" variant="ghost" icon="edit">Edit</Btn>}
            </div>
          </div>
        ))}

        {!isLoading && (roles?.length ?? 0) === 0 && (
          <div className="card card-pad" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-muted)' }}>
            <Icon name="users" size={32} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 600 }}>Belum ada jabatan</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Tambahkan jabatan untuk mulai generate invoice</div>
          </div>
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah jabatan"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn>
            <Btn variant="primary" icon="check"
              onClick={() => createRole.mutate({ ...form, feeAmount: +form.feeAmount, invoiceDueDay: +form.invoiceDueDay })}
              loading={createRole.isPending}>
              Tambah
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Nama jabatan">
            <InputWrap>
              <input placeholder="Cth. Anggota Biasa, Pengurus, Ketua..."
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </InputWrap>
          </Field>
          <div className="grid grid-2">
            <Field label="Nominal iuran (Rp)">
              <InputWrap>
                <input type="number" placeholder="0" value={form.feeAmount}
                  onChange={(e) => setForm((f) => ({ ...f, feeAmount: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', fontFamily: 'var(--font-mono)' }} />
              </InputWrap>
            </Field>
            <Field label="Periode">
              <InputWrap>
                <select value={form.periodType} onChange={(e) => setForm((f) => ({ ...f, periodType: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}>
                  <option value="MONTHLY">Bulanan</option>
                  <option value="WEEKLY">Mingguan</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </InputWrap>
            </Field>
          </div>
          <Field label="Hari jatuh tempo" help="Tanggal jatuh tempo invoice (1-28)">
            <InputWrap icon="calendar">
              <input type="number" min={1} max={28} value={form.invoiceDueDay}
                onChange={(e) => setForm((f) => ({ ...f, invoiceDueDay: e.target.value }))}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }} />
            </InputWrap>
          </Field>
        </div>
      </Modal>
    </>
  );
}

// ─── Profile settings ─────────────────────────────────────────────────────────
function ProfileSettings({ user }: { user: ReturnType<typeof useUser> }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', phoneNumber: user?.phoneNumber ?? '' });

  const update = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!payload.fullName.trim()) throw new Error('Nama lengkap wajib diisi');
      const res = await api.patch<AuthUser>('/users/me', payload);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      // Segarkan sesi tersimpan agar nama & no. HP langsung berubah di sidebar/header.
      const auth = getStoredAuth();
      if (auth) {
        const next = { ...auth, user: { ...auth.user, ...updatedUser } };
        setStoredAuth(next);
        qc.setQueryData(['auth', 'session'], next);
      }
      push('Profil berhasil diperbarui', 'success');
    },
    onError: (e: any) => push(e?.message ?? 'Gagal simpan', 'error'),
  });

  return (
    <div className="col" style={{ gap: 16, maxWidth: 480 }}>
      <Card>
        <CardHead title="Profil saya" />
        <div className="card-pad col" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={user?.fullName ?? 'U'} size="xl" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{user?.fullName}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{user?.email}</div>
              <Badge variant="accent" naked>{user?.role}</Badge>
            </div>
          </div>

          <div className="div" />

          <Field label="Nama lengkap">
            <InputWrap icon="user">
              <input value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </InputWrap>
          </Field>
          <Field label="No. HP (opsional)">
            <InputWrap icon="phone">
              <input value={form.phoneNumber ?? ''}
                placeholder="+62..."
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
            </InputWrap>
          </Field>
          <Field label="Email">
            <InputWrap>
              <input value={user?.email ?? ''} readOnly style={{ color: 'var(--ink-muted)' }} />
            </InputWrap>
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="primary" icon="check" onClick={() => update.mutate(form)} loading={update.isPending}>
              Simpan
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Password input dengan toggle show/hide ──────────────────────────────────
function PasswordField({ label, value, onChange, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <InputWrap icon="lock">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="iconbtn"
          onClick={() => setShow((s) => !s)}
          style={{ width: 28, height: 28, flexShrink: 0 }}
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          title={show ? 'Sembunyikan' : 'Tampilkan'}
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={15} />
        </button>
      </InputWrap>
    </Field>
  );
}

// ─── Security settings ────────────────────────────────────────────────────────
function SecuritySettings() {
  const { push } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const changePw = useMutation({
    mutationFn: async () => {
      if (form.newPassword !== form.confirmPassword) throw new Error('Password baru tidak cocok');
      await api.patch('/users/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
    },
    onSuccess: () => {
      push('Password berhasil diubah', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e: any) => push(e?.message ?? 'Gagal ubah password', 'error'),
  });

  const strength      = form.newPassword ? passwordStrength(form.newPassword) : null;
  const tooShort      = form.newPassword.length > 0 && form.newPassword.length < 8;
  const confirmMatch  = form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword;
  const confirmMismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
  const canSubmit = Boolean(form.currentPassword) && form.newPassword.length >= 8 && confirmMatch;

  return (
    <div className="col" style={{ gap: 16, maxWidth: 480 }}>
      <Card>
        <CardHead title="Ubah password" />
        <div className="card-pad col" style={{ gap: 14 }}>
          <PasswordField
            label="Password saat ini"
            value={form.currentPassword}
            autoComplete="current-password"
            onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
          />

          <div>
            <PasswordField
              label="Password baru"
              value={form.newPassword}
              autoComplete="new-password"
              onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
            />
            {form.newPassword && strength && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < strength.level ? strength.color : 'var(--line)', transition: 'background .2s' }} />
                  ))}
                </div>
                <div className="row tight" style={{ fontSize: 11.5, justifyContent: 'space-between' }}>
                  <span style={{ color: strength.color, fontWeight: 600 }}>Kekuatan: {strength.label}</span>
                  {tooShort && <span style={{ color: 'var(--danger)' }}>Minimal 8 karakter</span>}
                </div>
              </div>
            )}
          </div>

          <div>
            <PasswordField
              label="Konfirmasi password baru"
              value={form.confirmPassword}
              autoComplete="new-password"
              onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            />
            {(confirmMatch || confirmMismatch) && (
              <div
                className="row tight"
                style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600, color: confirmMatch ? 'var(--ok)' : 'var(--danger)' }}
              >
                <Icon name={confirmMatch ? 'checkCircle' : 'alert'} size={13} />
                <span>{confirmMatch ? 'Password cocok' : 'Password tidak cocok'}</span>
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="primary" icon="check" onClick={() => changePw.mutate()} loading={changePw.isPending} disabled={!canSubmit}>
              Ubah password
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Sesi aktif" sub="Semua perangkat yang login" />
        <div className="card-pad">
          <div className="row between" style={{ padding: '10px 0' }}>
            <div className="row tight">
              <div className="avatar" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                <Icon name="globe" size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Browser saat ini</div>
                <div className="muted" style={{ fontSize: 11.5 }}>Sesi aktif</div>
              </div>
            </div>
            <Badge variant="ok" naked>Saat ini</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
