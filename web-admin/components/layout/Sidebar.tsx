'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';
import { Avatar, IconBtn } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useUser, useLogout } from '@/hooks/useAuth';
import { useTeams, getStoredTeamId, setStoredTeamId } from '@/hooks/useTeam';
import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { Role, Team, AuthSession } from '@/types';
import { api, normalizeApiError } from '@/lib/api';
import { setStoredAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';

type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  group: 'main' | 'kas';
  roles: Role[];
  badge?: number;
};

const ALL: Role[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'TREASURER', 'MEMBER'];
const MGMT: Role[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN'];
const FIN:  Role[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'TREASURER'];
const SA:   Role[] = ['SUPER_ADMIN'];

const NAV: NavItem[] = [
  { id: 'dashboard',       label: 'Dashboard',        icon: 'dashboard', href: '/dashboard',                group: 'main', roles: ALL },
  { id: 'overview',        label: 'Ringkasan',         icon: 'cash',      href: '/overview',                 group: 'main', roles: FIN },
  { id: 'invoices',        label: 'Invoice',           icon: 'receipt',   href: '/invoices',                 group: 'main', roles: ALL },
  { id: 'approvals',       label: 'Approval',          icon: 'inbox',     href: '/approvals',                group: 'main', roles: FIN },
  { id: 'members',         label: 'Anggota',           icon: 'users',     href: '/members',                  group: 'main', roles: MGMT },
  { id: 'reports',         label: 'Laporan',           icon: 'reports',   href: '/reports',                  group: 'main', roles: FIN },
  { id: 'accounts',        label: 'Akun Kas',          icon: 'wallet',    href: '/accounts',                 group: 'kas',  roles: FIN },
  { id: 'transactions',    label: 'Transaksi',         icon: 'receipt',   href: '/transactions',             group: 'kas',  roles: FIN },
  { id: 'donations',       label: 'Donasi',            icon: 'sparkle',   href: '/donations',                group: 'kas',  roles: FIN },
  { id: 'holidays',        label: 'Hari Libur',        icon: 'calendar',  href: '/holidays',                 group: 'kas',  roles: SA },
  { id: 'audit',           label: 'Audit log',         icon: 'history',   href: '/audit',                    group: 'kas',  roles: MGMT },
  { id: 'notifications',   label: 'Notifikasi',        icon: 'bell',      href: '/notifications',            group: 'kas',  roles: ALL },
  { id: 'license',         label: 'Lisensi',           icon: 'shield',    href: '/license',                  group: 'kas',  roles: ['SUPER_ADMIN', 'OWNER'] },
  { id: 'member-view',     label: 'Tampilan Anggota',  icon: 'phone',     href: '/member-view',              group: 'kas',  roles: MGMT },
  { id: 'settings',        label: 'Pengaturan',        icon: 'settings',  href: '/settings',                 group: 'kas',  roles: MGMT },
  { id: 'email-templates', label: 'Email Templates',   icon: 'mail',      href: '/settings/email-templates', group: 'kas',  roles: SA },
];

// Super Admin fokus platform: hanya menu inspeksi tim (read-only) + menu platform.
// Menu pengelolaan tim (invoice, approval, anggota, kas, transaksi, donasi, dll) disembunyikan.
const SA_VISIBLE = new Set([
  'dashboard', 'overview', 'reports', 'audit',              // inspeksi tim aktif (read-only)
  'holidays', 'notifications', 'email-templates', 'settings', // platform
]);

type Props = { open?: boolean; onClose?: () => void };

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const user = useUser();
  const logout = useLogout();
  const router = useRouter();
  const teams = useTeams();
  const [activeId, setActiveId] = useState<string | null>(() => getStoredTeamId());
  const allTeams = teams.data?.data ?? [];
  const currentTeam = allTeams.find(t => t.id === activeId) ?? allTeams[0] ?? null;

  const role = (currentTeam?.userRole || user?.role) as Role | undefined;
  const isSA = role === 'SUPER_ADMIN';
  const canSee = (n: NavItem) => (isSA ? SA_VISIBLE.has(n.id) : (!role || n.roles.includes(role)));
  const visibleMain = NAV.filter(n => n.group === 'main' && canSee(n));
  const visibleKas  = NAV.filter(n => n.group === 'kas'  && canSee(n));

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.replace('/login');
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Brand />

      {/* Team switcher */}
      <TeamSwitcher
        teams={allTeams}
        currentTeam={currentTeam}
        onSelect={(id) => { setActiveId(id); setStoredTeamId(id); }}
        loading={teams.isLoading}
      />

      {/* Main nav */}
      <div className="nav-group">
        {visibleMain.map((n) => (
          <NavLink key={n.id} item={n} active={pathname === n.href} onClick={onClose} />
        ))}

        {visibleKas.length > 0 && <div className="nav-label">Kas &amp; Sistem</div>}

        {visibleKas.map((n) => (
          <NavLink key={n.id} item={n} active={pathname === n.href} onClick={onClose} />
        ))}

        {isSA && (
          <>
            <div className="nav-label">Platform</div>
            <NavLink
              item={{ id: 'super-admin', label: 'Super Admin', icon: 'zap', href: '/super-admin', group: 'kas', roles: ['SUPER_ADMIN'] }}
              active={pathname === '/super-admin'}
              onClick={onClose}
            />
          </>
        )}
      </div>

      {/* User foot */}
      <div className="sidebar-foot">
        <Avatar name={user?.fullName ?? 'U'} size="sm" color="var(--accent-soft)" style={{ color: 'var(--accent-ink)' }} />
        <div className="user-chip" style={{ flex: 1, minWidth: 0 }}>
          <div>
            <div className="uc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {user?.fullName ?? '—'}
            </div>
            <div className="uc-role">{user?.role ?? ''}</div>
          </div>
        </div>
        <IconBtn
          icon="logout"
          tip="Logout"
          onClick={handleLogout}
          style={{ color: 'var(--danger)' }}
        />
      </div>
    </aside>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ textDecoration: 'none' }}
    >
      <Icon name={item.icon} size={17} className="nav-ic" />
      <span>{item.label}</span>
      {item.badge != null && <span className="nav-badge">{item.badge}</span>}
    </Link>
  );
}

// ─── Team Switcher ────────────────────────────────────────────────────────────
function TeamSwitcher({
  teams, currentTeam, onSelect, loading,
}: { teams: Team[]; currentTeam: Team | null; onSelect: (id: string) => void; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (open) { setSearch(''); setTimeout(() => searchRef.current?.focus(), 60); }
  }, [open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
    qc.invalidateQueries({ queryKey: ['members'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleTeamCreatedOrJoined = (teamId: string) => {
    setShowCreate(false);
    setShowJoin(false);
    qc.invalidateQueries({ queryKey: ['teams'] });
    onSelect(teamId);
  };

  // Skeleton while loading
  if (loading && teams.length === 0) {
    return (
      <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)', height: 48, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 11, width: '70%', background: 'var(--surface-2)', borderRadius: 4, marginBottom: 4 }} />
          <div style={{ height: 9, width: '40%', background: 'var(--surface-2)', borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  // No teams — show Create / Join actions
  if (!loading && teams.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
          Tim
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'var(--ink)', color: 'var(--bg)', border: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}
          >
            <Icon name="plus" size={14} /> Buat Tim
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}
          >
            <Icon name="users" size={14} /> Gabung Tim
          </button>
        </div>
        {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} onSuccess={handleTeamCreatedOrJoined} />}
        {showJoin   && <JoinTeamModal  onClose={() => setShowJoin(false)}   onSuccess={handleTeamCreatedOrJoined} />}
      </div>
    );
  }

  // Has teams — normal switcher dropdown
  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 14 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '8px 10px', borderRadius: 10,
        background: open ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${open ? 'var(--accent-line)' : 'var(--line)'}`,
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        transition: 'all .12s',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {currentTeam?.name?.[0] ?? '?'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTeam?.name ?? 'Pilih tim'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Tim aktif</div>
        </div>
        <Icon name="chevDown" size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .12s' }} />
      </button>

      {open && (() => {
        const q = search.trim().toLowerCase();
        const filtered = q ? teams.filter(t => t.name.toLowerCase().includes(q)) : teams;
        const visible = filtered.slice(0, 5);
        return (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)',
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          borderRadius: 12, boxShadow: 'var(--shadow-lg)',
          zIndex: 50, overflow: 'hidden', animation: 'pop-in .12s ease',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line-soft)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--line)' }}>
              <Icon name="search" size={13} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari tim atau peran"
                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)' }}
              />
            </label>
          </div>

          {/* Header count */}
          <div style={{ padding: '6px 12px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Tim Anda · {filtered.length}
          </div>

          {/* List — max 5, scrollable */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {visible.length === 0 && (
              <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-muted)' }}>Tidak ada tim ditemukan</div>
            )}
            {visible.map(t => (
              <button key={t.id} onClick={() => handleSelect(t.id)} style={{
                width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                background: t.id === currentTeam?.id ? 'var(--accent-soft)' : 'transparent',
                border: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
                onMouseEnter={e => { if (t.id !== currentTeam?.id) e.currentTarget.style.background = 'var(--surface)'; }}
                onMouseLeave={e => { if (t.id !== currentTeam?.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 7, background: t.id === currentTeam?.id ? 'var(--accent)' : 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {t.name?.[0] ?? '?'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.id === currentTeam?.id ? 'var(--accent-ink)' : 'var(--ink)' }}>{t.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{t.status}</div>
                </div>
                {t.id === currentTeam?.id && <Icon name="check" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            ))}
            {filtered.length > 5 && (
              <div style={{ padding: '6px 12px 8px', fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center' }}>
                +{filtered.length - 5} tim lainnya — gunakan pencarian
              </div>
            )}
          </div>

          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 6 }}>
            <button onClick={() => { setOpen(false); setShowCreate(true); }} style={{
              flex: 1, padding: '7px 8px', borderRadius: 8,
              background: 'transparent', border: '1px dashed var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-muted)', fontSize: 12,
            }}>
              <Icon name="plus" size={13} /> Buat Tim
            </button>
            <button onClick={() => { setOpen(false); setShowJoin(true); }} style={{
              flex: 1, padding: '7px 8px', borderRadius: 8,
              background: 'transparent', border: '1px dashed var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-muted)', fontSize: 12,
            }}>
              <Icon name="users" size={13} /> Gabung
            </button>
          </div>
        </div>
        );
      })()}
      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} onSuccess={handleTeamCreatedOrJoined} />}
      {showJoin   && <JoinTeamModal  onClose={() => setShowJoin(false)}   onSuccess={handleTeamCreatedOrJoined} />}
    </div>
  );
}

// ─── Create Team Modal ────────────────────────────────────────────────────────
function CreateTeamModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (teamId: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post<Team>('/teams', { name: name.trim() });
      // Refresh auth session so role reflects OWNER if it changed
      const auth = await api.post<AuthSession>('/auth/refresh');
      return { team: res.data, session: auth.data };
    },
    onSuccess: ({ team, session }) => {
      setStoredAuth(session);
      queryClient.setQueryData(['auth', 'session'], session);
      qc.invalidateQueries({ queryKey: ['teams'] });
      onSuccess(team.id);
    },
    onError: (e) => setError(normalizeApiError(e).message),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-elev)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 24, animation: 'pop-in .15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Buat Tim Baru</div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-muted)', padding: 4 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 18, lineHeight: 1.5 }}>
          Tim adalah ruang untuk mengelola iuran, anggota, dan kas bersama.
        </div>
        <form data-testid="create-team-form" onSubmit={(e) => { e.preventDefault(); setError(''); if (!name.trim()) { setError('Nama tim wajib diisi.'); return; } create.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 5 }}>Nama Tim</label>
            <label className="input">
              <Icon name="sparkle" size={14} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
              <input
                type="text" placeholder="mis. Komunitas Badminton RT 05"
                value={name} onChange={(e) => setName(e.target.value)}
                required maxLength={80} autoFocus style={{ flex: 1 }}
              />
            </label>
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '7px 10px', background: 'var(--danger-soft)', borderRadius: 8 }}>{error}</div>}
          <button type="submit" disabled={create.isPending} style={{ width: '100%', padding: '11px 16px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: create.isPending ? 'not-allowed' : 'pointer', opacity: create.isPending ? 0.7 : 1 }}>
            {create.isPending ? 'Membuat...' : 'Buat Tim →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Join Team Modal ──────────────────────────────────────────────────────────
function JoinTeamModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (teamId: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const join = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ teamId: string }>('/teams/join', { teamCode: code.trim().toUpperCase() });
      return res.data;
    },
    onSuccess: (membership) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      onSuccess(membership.teamId);
    },
    onError: (e) => setError(normalizeApiError(e).message),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-elev)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 24, animation: 'pop-in .15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Gabung Tim</div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-muted)', padding: 4 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 18, lineHeight: 1.5 }}>
          Masukkan kode undangan atau kode tim yang diberikan oleh admin tim.
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setError(''); if (!code.trim()) { setError('Kode undangan wajib diisi.'); return; } join.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: 5 }}>Kode Undangan</label>
            <label className="input">
              <Icon name="lock" size={14} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
              <input
                type="text" placeholder="mis. KLK-ABCD1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required autoFocus style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '.06em' }}
              />
            </label>
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '7px 10px', background: 'var(--danger-soft)', borderRadius: 8 }}>{error}</div>}
          <button type="submit" disabled={join.isPending} style={{ width: '100%', padding: '11px 16px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: join.isPending ? 'not-allowed' : 'pointer', opacity: join.isPending ? 0.7 : 1 }}>
            {join.isPending ? 'Bergabung...' : 'Gabung Tim →'}
          </button>
        </form>
      </div>
    </div>
  );
}
