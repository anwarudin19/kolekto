'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/app/providers';
import { Btn, Badge, Card, Empty } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons/Icon';
import { formatDate } from '@/lib/utils';

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
};

const TYPE_ICON: Record<string, { icon: IconName; color: string }> = {
  PAYMENT_SUBMITTED:  { icon: 'inbox',    color: 'var(--warn)' },
  PAYMENT_APPROVED:   { icon: 'check',    color: 'var(--ok)' },
  PAYMENT_REJECTED:   { icon: 'x',        color: 'var(--danger)' },
  INVOICE_GENERATED:  { icon: 'receipt',  color: 'var(--info)' },
  INVOICE_OVERDUE:    { icon: 'alert',    color: 'var(--danger)' },
  INVOICE_REMINDER:   { icon: 'bell',     color: 'var(--accent)' },
  MEMBER_JOINED:      { icon: 'users',    color: 'var(--ok)' },
  SYSTEM:             { icon: 'zap',      color: 'var(--ink-muted)' },
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery<{ data: Notif[]; meta: { total: number } }>({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params = filter === 'unread' ? '?isRead=false&limit=50' : '?limit=50';
      const res = await api.get(`/notifications${params}`);
      return res.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      push('Semua notifikasi ditandai dibaca', 'success');
    },
  });

  const notifs   = data?.data ?? [];
  const total    = data?.meta.total ?? 0;
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Pusat Notifikasi</div>
          <h1>Notifikasi</h1>
          <div className="subtitle">
            {unreadCount > 0
              ? `${unreadCount} belum dibaca dari ${total} notifikasi`
              : `${total} notifikasi`}
          </div>
        </div>
        <div className="head-actions">
          {unreadCount > 0 && (
            <Btn icon="check" variant="ghost" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
              Tandai semua dibaca
            </Btn>
          )}
        </div>
      </div>

      <div className="page-tools">
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Semua <span className="count">{total}</span>
        </button>
        <button className={`chip ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Belum dibaca
          {unreadCount > 0 && <span className="count">{unreadCount}</span>}
        </button>
      </div>

      <div className="page-body">
        {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat notifikasi...</div>}

        {!isLoading && notifs.length === 0 && (
          <Empty
            icon="bell"
            title={filter === 'unread' ? 'Semua sudah dibaca' : 'Tidak ada notifikasi'}
            sub="Anda akan mendapat notifikasi saat ada aktivitas baru"
          />
        )}

        {!isLoading && notifs.length > 0 && (
          <div className="col tight" style={{ gap: 2 }}>
            {notifs.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                onRead={() => !n.isRead && markRead.mutate(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function NotifItem({ notif, onRead }: { notif: Notif; onRead: () => void }) {
  const iconInfo = TYPE_ICON[notif.type] ?? TYPE_ICON.SYSTEM;

  return (
    <div
      onClick={onRead}
      style={{
        display: 'flex', gap: 14, padding: '14px 16px',
        background: notif.isRead ? 'var(--bg-elev)' : 'color-mix(in srgb, var(--accent-soft) 60%, var(--bg-elev))',
        border: '1px solid var(--line)',
        borderRadius: 14, cursor: notif.isRead ? 'default' : 'pointer',
        marginBottom: 2,
        transition: 'background .15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `color-mix(in srgb, ${iconInfo.color} 12%, var(--surface))`,
        display: 'grid', placeItems: 'center',
        color: iconInfo.color,
      }}>
        <Icon name={iconInfo.icon} size={17} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: 13.5 }}>{notif.title}</span>
          {!notif.isRead && (
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} />
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{notif.message}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {formatDate(notif.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
