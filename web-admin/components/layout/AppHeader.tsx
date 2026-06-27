'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons/Icon';
import { IconBtn } from '@/components/ui';

type Notif = { id: string; title: string; message: string; isRead: boolean; type: string; createdAt: string };

const TYPE_COLOR: Record<string, string> = {
  PAYMENT_SUBMITTED: 'var(--warn)',
  PAYMENT_APPROVED:  'var(--ok)',
  PAYMENT_REJECTED:  'var(--danger)',
  INVOICE_OVERDUE:   'var(--danger)',
  MEMBER_JOINED:     'var(--ok)',
};

function NotificationsBell({ onOpenPage }: { onOpenPage: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc  = useQueryClient();

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const { data } = useQuery<{ data: Notif[]; meta: { total: number } }>({
    queryKey: ['notifications', 'bell'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=6&isRead=false');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setOpen(false); },
  });

  const notifs   = data?.data ?? [];
  const unread   = data?.meta.total ?? 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="iconbtn" onClick={() => setOpen(!open)} style={{ position: 'relative' }}>
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            width: 8, height: 8, borderRadius: 999,
            background: 'var(--danger)', border: '2px solid var(--bg)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 10px)',
          width: 360, background: 'var(--bg-elev)',
          border: '1px solid var(--line)', borderRadius: 16,
          boxShadow: 'var(--shadow-lg)', zIndex: 80,
          animation: 'pop-in .12s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Notifikasi</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11.5, color: 'var(--accent-ink)', fontWeight: 600, fontFamily: 'inherit' }}>
                  Tandai semua
                </button>
              )}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 600 }}>
                {unread} baru
              </span>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
                <Icon name="check" size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                Semua sudah dibaca
              </div>
            ) : notifs.map((n, i) => (
              <div key={n.id} onClick={() => { markRead.mutate(n.id); }}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: i < notifs.length - 1 ? '1px solid var(--line-soft)' : 0,
                  background: !n.isRead ? 'color-mix(in srgb, var(--accent-soft) 40%, var(--bg-elev))' : 'transparent',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = !n.isRead ? 'color-mix(in srgb, var(--accent-soft) 40%, var(--bg-elev))' : 'transparent')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: `color-mix(in srgb, ${TYPE_COLOR[n.type] ?? 'var(--ink-muted)'} 12%, var(--surface))`,
                  color: TYPE_COLOR[n.type] ?? 'var(--ink-muted)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="bell" size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: !n.isRead ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {n.title}
                    {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {n.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}>
            <button onClick={() => { setOpen(false); onOpenPage(); }} style={{
              background: 'none', border: 0, cursor: 'pointer',
              fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 600, fontFamily: 'inherit',
            }}>
              Lihat semua notifikasi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = { onMenuToggle: () => void };

export function AppHeader({ onMenuToggle }: Props) {
  const router = useRouter();

  return (
    <div className="app-header">
      <button className="mobile-hamburger" onClick={onMenuToggle} aria-label="Buka menu">
        <Icon name="menu" size={18} />
      </button>

      <div className="app-header-search">
        <Icon name="search" size={15} style={{ color: 'var(--ink-muted)' }} />
        <input type="text" placeholder="Cari invoice, anggota, atau transaksi…" />
        <span className="kbd">⌘K</span>
      </div>

      <span className="spacer" />

      <button className="app-header-quick" onClick={() => router.push('/approvals')}>
        <Icon name="inbox" size={13} />
        <span>Approval</span>
      </button>

      <NotificationsBell onOpenPage={() => router.push('/notifications')} />
      <IconBtn icon="settings" tip="Pengaturan" onClick={() => router.push('/settings')} />
    </div>
  );
}
