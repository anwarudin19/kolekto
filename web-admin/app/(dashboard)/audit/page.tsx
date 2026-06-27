'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveTeamId } from '@/hooks/useTeam';
import { api, buildQuery } from '@/lib/api';
import { Btn, Empty, InputWrap } from '@/components/ui';
import { Pagination } from '@/components/shared/Pagination';
import { formatDate } from '@/lib/utils';

type AuditLog = { id: string; action: string; module: string; targetId?: string; metadata?: Record<string,unknown>; ipAddress?: string; createdAt: string; actor?: { fullName: string; email: string } };

const KIND_CLASS: Record<string,string> = { CREATE:'create', APPROVE:'approve', REJECT:'reject', UPDATE:'update', DELETE:'reject' };

export default function AuditPage() {
  const teamId = useActiveTeamId();
  const [actorFilter, setActorFilter] = useState('all');
  const [kindFilter, setKindFilter]   = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data, isLoading } = useQuery<{ data: AuditLog[]; meta: { total: number } }>({
    queryKey: ['audit', teamId, actorFilter, kindFilter],
    queryFn: async () => {
      const res = await api.get(`/admin/audit-logs${buildQuery({ teamId: teamId ?? undefined, limit: 60 })}`);
      return res.data;
    },
    enabled: !!teamId,
  });

  const logs = (data?.data ?? []).filter(l => {
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

  // Group by date
  const groups: Record<string, AuditLog[]> = {};
  pagedLogs.forEach(l => {
    const d = new Date(l.createdAt);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    const lDate = new Date(l.createdAt); lDate.setHours(0,0,0,0);
    const key = lDate >= today ? 'Hari ini' : lDate >= yesterday ? 'Kemarin' : formatDate(l.createdAt, { day: 'numeric', month: 'long' });
    (groups[key] = groups[key] || []).push(l);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Audit Trail</div>
          <h1>Audit log</h1>
          <div className="subtitle">Seluruh aktivitas bisnis penting tercatat — tidak bisa dihapus.</div>
        </div>
        <div className="head-actions">
          <Btn icon="download">Export CSV</Btn>
        </div>
      </div>

      <div className="page-tools">
        <InputWrap icon="search" style={{ maxWidth: 280 }}>
          <input placeholder="Cari di log..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        </InputWrap>
        <span className="muted" style={{ fontSize: 12 }}>Jenis:</span>
        {[['all','Semua'],['create','Dibuat'],['approve','Approve'],['reject','Reject'],['update','Update']].map(([k,l]) => (
          <button key={k} className={`chip ${kindFilter === k ? 'active' : ''}`} onClick={() => { setKindFilter(k); setPage(1); }}>{l}</button>
        ))}
      </div>

      <div className="page-body">
        {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat log...</div>}
        {!isLoading && logs.length === 0 && <Empty icon="history" title="Tidak ada log" sub="Belum ada aktivitas tercatat" />}
        {!isLoading && logs.length > 0 && Object.entries(groups).map(([heading, items]) => (
          <div key={heading} style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{heading}</div>
            <div className="card card-pad" style={{ maxWidth: 820 }}>
              <div className="timeline">
                {items.map(e => {
                  const kind = KIND_CLASS[e.action.split('_')[0]] ?? 'update';
                  return (
                    <div key={e.id} className={`timeline-item ${kind}`}>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', flex: '0 0 90px', fontFamily: 'var(--font-mono)' }}>
                        {new Date(e.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.actor?.fullName ?? 'Sistem'}</div>
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
          </div>
        ))}
        {!isLoading && logs.length > 0 && (
          <Pagination
            page={safePage} totalPages={totalPages} pageSize={pageSize} total={logs.length}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </>
  );
}
