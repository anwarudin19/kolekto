'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveTeamId } from '@/hooks/useTeam';
import { api } from '@/lib/api';
import { Icon, type IconName } from '@/components/icons/Icon';

type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
  user?: { fullName: string } | null;
};

function actionIcon(action: string, entityType: string): { icon: IconName; color: string } {
  const a = action.toLowerCase();
  const e = entityType.toLowerCase();
  if (a === 'create' && e.includes('donation'))  return { icon: 'sparkle', color: 'var(--teal)' };
  if (a === 'create' && e.includes('payment'))   return { icon: 'inbox',   color: 'var(--accent)' };
  if (a === 'approve')                            return { icon: 'check',   color: 'var(--ok)' };
  if (a === 'reject')                             return { icon: 'x',      color: 'var(--danger)' };
  if (a === 'create' && e.includes('expense'))   return { icon: 'arrUp',   color: 'var(--danger)' };
  if (a === 'create' && e.includes('invoice'))   return { icon: 'receipt', color: 'var(--accent)' };
  if (a === 'create')                             return { icon: 'plus',    color: 'var(--ok)' };
  if (a === 'update')                             return { icon: 'edit',    color: 'var(--warn)' };
  if (a === 'delete')                             return { icon: 'trash',   color: 'var(--danger)' };
  return { icon: 'history', color: 'var(--ink-muted)' };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)  return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export function ActivityTicker({ embedded = false }: { embedded?: boolean }) {
  const teamId = useActiveTeamId();

  const { data, isLoading } = useQuery<{ data: ActivityLog[] }>({
    queryKey: ['activity-logs', teamId],
    queryFn: async () => {
      const res = await api.get(`/teams/${teamId}/audit-logs?limit=8`);
      return res.data;
    },
    enabled: !!teamId,
    refetchInterval: 30_000,
  });

  const logs = data?.data ?? [];

  const rows = isLoading ? (
    <div className="muted" style={{ fontSize: 13, padding: '12px 4px' }}>Memuat aktivitas...</div>
  ) : logs.length === 0 ? (
    <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '16px 4px' }}>Belum ada aktivitas</div>
  ) : (
    logs.map((log, idx) => {
      const { icon, color } = actionIcon(log.action, log.entityType);
      return (
        <div key={log.id} className="row" style={{
          padding: '12px 4px',
          borderBottom: idx < logs.length - 1 ? '1px solid var(--line-soft)' : 0,
          gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
            color, display: 'grid', placeItems: 'center',
          }}>
            <Icon name={icon} size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {log.description}
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 11.5, marginTop: 1 }}>
              {log.user?.fullName ?? 'Sistem'} · {timeAgo(log.createdAt)}
            </div>
          </div>
        </div>
      );
    })
  );

  if (embedded) return <div className="col tight" style={{ gap: 0 }}>{rows}</div>;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head">
        <h3>Aktivitas langsung</h3>
        <span className="row tight" style={{ marginLeft: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ok)', animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ok)' }}>Live</span>
        </span>
      </div>
      <div className="card-pad col tight" style={{ paddingTop: 6 }}>{rows}</div>
    </div>
  );
}
