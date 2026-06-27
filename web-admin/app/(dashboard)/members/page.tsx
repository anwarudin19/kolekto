'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveTeamId, useMembers } from '@/hooks/useTeam';
import { api } from '@/lib/api';
import { useToast } from '@/app/providers';
import {
  Btn, Avatar, Badge, StatusBadge, Card, CardHead, Field, InputWrap,
  Modal, Rp, Empty,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate } from '@/lib/utils';
import type { TeamMember, TeamRole } from '@/types';
import { Pagination } from '@/components/shared/Pagination';

export default function MembersPage() {
  const teamId = useActiveTeamId();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [listStyle, setListStyle] = useState<'table' | 'cards'>('table');
  const [openInvite, setOpenInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const { data, isLoading } = useMembers(teamId, {
    search: q || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 50,
  });

  const members = data?.data ?? [];
  const total   = data?.meta.total ?? 0;
  const active  = members.filter((m) => m.status === 'ACTIVE').length;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages    = Math.max(1, Math.ceil(members.length / pageSize));
  const safePage      = Math.min(page, totalPages);
  const pagedMembers  = members.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Manajemen Anggota</div>
          <h1>Anggota</h1>
          <div className="subtitle">{total} terdaftar · {active} aktif</div>
        </div>
        <div className="head-actions">
          <Btn icon="download">Export</Btn>
          <Btn icon="plus" variant="primary" onClick={() => setOpenInvite(true)}>
            Undang anggota
          </Btn>
        </div>
      </div>

      <div className="page-tools">
        <InputWrap icon="search" style={{ maxWidth: 280 }}>
          <input
            placeholder="Cari nama anggota…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </InputWrap>

        <span className="spacer" />

        <span className="muted" style={{ fontSize: 12 }}>Status:</span>
        {['all', 'ACTIVE', 'INACTIVE', 'INVITED'].map((s) => (
          <button
            key={s}
            className={`chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === 'all' ? 'Semua' : s === 'ACTIVE' ? 'Aktif' : s === 'INACTIVE' ? 'Non-aktif' : 'Diundang'}
          </button>
        ))}

        <div style={{ width: 1, background: 'var(--line)', height: 22, margin: '0 4px' }} />

        <button className={`chip ${listStyle === 'table' ? 'active' : ''}`} onClick={() => setListStyle('table')}>
          <Icon name="receipt" size={13} /> Tabel
        </button>
        <button className={`chip ${listStyle === 'cards' ? 'active' : ''}`} onClick={() => setListStyle('cards')}>
          <Icon name="users" size={13} /> Kartu
        </button>
      </div>

      <div className="page-body">
        {isLoading && (
          <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat...</div>
        )}

        {!isLoading && members.length === 0 && (
          <Empty
            icon="users"
            title="Tidak ada anggota"
            sub="Ubah filter atau undang anggota baru"
            action={<Btn icon="plus" variant="primary" onClick={() => setOpenInvite(true)}>Undang anggota</Btn>}
          />
        )}

        {!isLoading && members.length > 0 && (
          <>
            {listStyle === 'table'
              ? <MembersTable members={pagedMembers} onSelect={setSelectedMember} />
              : <MembersCards members={pagedMembers} onSelect={setSelectedMember} />}
            <Pagination
              page={safePage} totalPages={totalPages} pageSize={pageSize} total={members.length}
              onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Invite modal */}
      <Modal
        open={openInvite}
        onClose={() => setOpenInvite(false)}
        title="Undang anggota baru"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenInvite(false)}>Tutup</Btn>
            <Btn variant="primary" icon="copy">Salin link</Btn>
          </>
        }
      >
        <div className="col" data-testid="add-member-form" style={{ gap: 16 }}>
          <Field label="Link undangan">
            <InputWrap icon="link">
              <input readOnly value={`kolekto.id/join/...`} />
            </InputWrap>
          </Field>
          <div className="div" />
          <Field label="Atau kirim ke email" help="Pisahkan dengan koma">
            <label className="input" style={{ height: 'auto', padding: '10px 12px', alignItems: 'flex-start' }}>
              <textarea
                rows={3}
                placeholder="andini@example.com, budi@example.com"
                style={{ border: 0, outline: 0, background: 'transparent', width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </label>
          </Field>
        </div>
      </Modal>

      {/* Member detail + edit modal */}
      {selectedMember && (
        <MemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────
function MembersTable({ members, onSelect }: { members: TeamMember[]; onSelect: (m: TeamMember) => void }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18 }}>Anggota</th>
            <th>Jabatan</th>
            <th>Bergabung</th>
            <th>Status iuran</th>
            <th className="num">Tunggakan</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="clickable" onClick={() => onSelect(m)}>
              <td style={{ paddingLeft: 18 }}>
                <div className="row tight">
                  <Avatar name={m.memberName} size="sm" />
                  <span className="cell-strong">{m.memberName}</span>
                </div>
              </td>
              <td>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--ink-soft)', fontWeight: 500 }}>
                  {m.role?.name ?? m.systemRole}
                </span>
              </td>
              <td className="mono muted">{m.joinedAt ? formatDate(m.joinedAt) : '—'}</td>
              <td>
                {m.paidThisPeriod
                  ? <StatusBadge status="PAID" />
                  : <StatusBadge status="UNPAID" />}
              </td>
              <td className="num">
                {(m.arrears ?? 0) > 0 ? <Rp n={m.arrears!} /> : <span className="muted">—</span>}
              </td>
              <td><StatusBadge status={m.status} /></td>
              <td>
                <button className="iconbtn">
                  <Icon name="chev" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cards view ───────────────────────────────────────────────────────────────
function MembersCards({ members, onSelect }: { members: TeamMember[]; onSelect: (m: TeamMember) => void }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%),1fr))' }}>
      {members.map((m) => (
        <div key={m.id} className="member-card" onClick={() => onSelect(m)}>
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={m.memberName} size="lg" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.memberName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                {m.role?.name ?? m.systemRole}
              </div>
            </div>
            {m.status !== 'ACTIVE' && <StatusBadge status={m.status} />}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}>
            <span>Bergabung <b style={{ color: 'var(--ink)' }}>{m.joinedAt ? formatDate(m.joinedAt, { month: 'short', year: 'numeric' }) : '—'}</b></span>
            <span>·</span>
            <span>
              {m.paidThisPeriod
                ? <><span style={{ color: 'var(--ok)' }}>● </span>Lunas</>
                : <><span style={{ color: (m.arrears ?? 0) > 0 ? 'var(--danger)' : 'var(--ink-muted)' }}>● </span>
                  {(m.arrears ?? 0) > 0 ? <><Rp n={m.arrears!} /></> : 'Belum bayar'}</>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Member detail + edit modal ───────────────────────────────────────────────
const MEMBER_SELECT_STYLE: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', width: '100%',
};
const SYSTEM_ROLES = ['OWNER', 'ADMIN', 'TREASURER', 'MEMBER'] as const;
const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'BANNED'] as const;

function MemberDetailModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const teamId = useActiveTeamId();
  const { push } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    memberName: member.memberName ?? '',
    phoneNumber: member.phoneNumber ?? '',
    systemRole: member.systemRole,
    status: member.status,
    roleId: member.role?.id ?? '',
  });

  const roles = useQuery<TeamRole[]>({
    queryKey: ['roles', teamId],
    queryFn: async () => (await api.get<TeamRole[]>(`/teams/${teamId}/roles`)).data,
    enabled: !!teamId && editing,
  });

  const update = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => api.patch(`/teams/${teamId}/members/${member.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      push('Anggota berhasil diperbarui', 'success');
      onClose();
    },
    onError: (e: any) => push(e?.message ?? 'Gagal memperbarui anggota', 'error'),
  });

  const saveEdit = () => {
    if (!form.memberName.trim()) { push('Nama anggota wajib diisi', 'error'); return; }
    update.mutate({
      memberName: form.memberName.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      systemRole: form.systemRole,
      status: form.status,
      ...(form.roleId ? { roleId: form.roleId } : {}),
    });
  };

  const toggleActive = () => update.mutate({ status: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });

  const footer = editing ? (
    <>
      <Btn variant="ghost" onClick={() => setEditing(false)} disabled={update.isPending}>Batal</Btn>
      <span className="spacer" />
      <Btn variant="primary" icon="check" onClick={saveEdit} loading={update.isPending}>Simpan</Btn>
    </>
  ) : (
    <>
      <Btn variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Btn>
      <span className="spacer" />
      <Btn
        variant="ghost"
        className={member.status === 'ACTIVE' ? 'btn-danger' : ''}
        icon={member.status === 'ACTIVE' ? 'trash' : 'check'}
        onClick={toggleActive}
        loading={update.isPending}
      >
        {member.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
      </Btn>
    </>
  );

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit anggota' : 'Detail anggota'} footer={footer}>
      <div className="row tight" style={{ gap: 12, marginBottom: 16 }}>
        <Avatar name={member.memberName} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{member.memberName}</div>
          <div className="row tight" style={{ gap: 6, marginTop: 2 }}>
            <span className="muted" style={{ fontSize: 12 }}>{member.role?.name ?? member.systemRole}</span>
            <StatusBadge status={member.status} />
          </div>
        </div>
      </div>

      {editing ? (
        <div className="col" style={{ gap: 12 }}>
          <Field label="Nama anggota">
            <InputWrap icon="user"><input value={form.memberName} onChange={(e) => setForm((f) => ({ ...f, memberName: e.target.value }))} /></InputWrap>
          </Field>
          <Field label="No. HP">
            <InputWrap icon="phone"><input value={form.phoneNumber} placeholder="+62..." onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} /></InputWrap>
          </Field>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Field label="Peran sistem">
              <select value={form.systemRole} onChange={(e) => setForm((f) => ({ ...f, systemRole: e.target.value as TeamMember['systemRole'] }))} style={MEMBER_SELECT_STYLE}>
                {SYSTEM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TeamMember['status'] }))} style={MEMBER_SELECT_STYLE}>
                {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Jabatan (iuran)">
            <select value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))} style={MEMBER_SELECT_STYLE}>
              <option value="">— tanpa jabatan —</option>
              {(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Informasi anggota</div>
          <dl className="dl-grid" style={{ fontSize: 13.5, margin: 0 }}>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Email</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{member.user?.email ?? '—'}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>No. HP</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{member.phoneNumber ?? '—'}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Peran sistem</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{member.systemRole}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Bergabung</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{member.joinedAt ? formatDate(member.joinedAt) : '—'}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Tunggakan</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>
              {(member.arrears ?? 0) > 0 ? <Rp n={member.arrears!} /> : <span style={{ color: 'var(--ok)' }}>Lunas</span>}
            </dd>
          </dl>
        </div>
      )}
    </Modal>
  );
}
