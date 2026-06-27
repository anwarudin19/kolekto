'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveTeamId } from '@/hooks/useTeam';
import { usePendingPayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useUser } from '@/hooks/useAuth';
import {
  Btn, Avatar, Badge, StatusBadge, Rp, Card, CardHead, SegmentedMeter,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { ActivityTicker } from '@/components/shared/ActivityTicker';
import { formatDate, formatRp } from '@/lib/utils';
import type { DashboardStats, ContributionPayment, Invoice, Account } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useDashboard(teamId: string | null) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', teamId],
    queryFn: async () => {
      const res = await api.get<DashboardStats>(`/admin/dashboard?teamId=${teamId}`);
      return res.data;
    },
    enabled: !!teamId,
  });
}

function useAccounts(teamId: string | null) {
  return useQuery<Account[]>({
    queryKey: ['accounts', teamId],
    queryFn: async () => {
      const res = await api.get<Account[]>(`/teams/${teamId}/accounts`);
      return res.data;
    },
    enabled: !!teamId,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user    = useUser();
  const teamId  = useActiveTeamId();
  const stats   = useDashboard(teamId);
  const pending = usePendingPayments(teamId);
  const invoices = useInvoices(teamId, { status: 'OVERDUE,PARTIAL', limit: 5 });
  const accounts = useAccounts(teamId);

  const s = stats.data;
  const paidCount    = s?.paidInvoices    ?? 0;
  const partialCount = s?.partialInvoices ?? 0;
  const unpaidCount  = s?.unpaidInvoices  ?? 0;
  const overdueCount = s?.overdueInvoices ?? 0;
  const totalInv     = paidCount + partialCount + unpaidCount + overdueCount;
  const pct          = totalInv > 0 ? Math.round((paidCount / totalInv) * 100) : 0;

  const firstName = user?.fullName?.split(' ')[0] ?? 'Anda';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">
            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </div>
          <h1>Halo, {firstName}.</h1>
          <div className="subtitle">
            {(s?.pendingApprovals ?? 0) > 0
              ? `${s!.pendingApprovals} pembayaran menunggu approval.`
              : 'Semua berjalan lancar hari ini.'}
          </div>
        </div>
        <div className="head-actions">
          <Btn icon="download" variant="default">Export</Btn>
          <Btn icon="plus" variant="primary" onClick={() => {}}>Invoice baru</Btn>
        </div>
      </div>

      <div className="page-body col" style={{ gap: 20 }}>
        {/* ── Stats ── */}
        <div className="grid grid-4">
          <StatCard
            featured
            label="Total saldo kas"
            value={`Rp ${formatRp(s?.totalBalance ?? 0)}`}
            loading={stats.isLoading}
          />
          <StatCard
            label="Pemasukan bulan ini"
            value={`Rp ${formatRp(s?.totalIncome ?? 0)}`}
            delta={<span className="delta-up">↑ Pemasukan terkini</span>}
            loading={stats.isLoading}
          />
          <StatCard
            label="Pengeluaran bulan ini"
            value={`Rp ${formatRp(s?.totalExpense ?? 0)}`}
            delta={<span className="delta-down">Pengeluaran bulan ini</span>}
            loading={stats.isLoading}
          />
          <StatCard
            label="Anggota aktif"
            value={
              <span>
                {s?.activeMembers ?? '—'}
                <span style={{ fontSize: 16, color: 'var(--ink-muted)', marginLeft: 4 }}>
                  /{s?.totalMembers ?? '—'}
                </span>
              </span>
            }
            delta={<span className="delta-up">Anggota terdaftar</span>}
            loading={stats.isLoading}
          />
        </div>

        {/* ── Mid row ── */}
        <div className="grid dash-mid" style={{ gap: 16 }}>
          {/* Iuran status */}
          <Card>
            <CardHead
              title={`Status iuran — ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
              badge={totalInv > 0 ? <Badge variant="mute" naked>{totalInv} invoice</Badge> : undefined}
              actions={<Btn size="sm" variant="ghost" iconRight="chev" onClick={() => {}}>Lihat semua</Btn>}
            />
            <div className="card-pad col" style={{ gap: 18 }}>
              <div>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{pct}% lunas</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{paidCount} dari {totalInv}</span>
                </div>
                <SegmentedMeter segments={[
                  { value: paidCount,    color: 'var(--ok)',       label: 'Lunas' },
                  { value: partialCount, color: 'var(--warn)',     label: 'Sebagian' },
                  { value: unpaidCount,  color: 'var(--ink-faint)', label: 'Belum' },
                  { value: overdueCount, color: 'var(--danger)',   label: 'Telat' },
                ]} />
              </div>

              <div className="grid grid-4" style={{ gap: 12 }}>
                <MiniStat label="Lunas"    count={paidCount}    color="var(--ok)" />
                <MiniStat label="Sebagian" count={partialCount} color="var(--warn)" />
                <MiniStat label="Belum"    count={unpaidCount}  color="var(--ink-faint)" />
                <MiniStat label="Telat"    count={overdueCount} color="var(--danger)" />
              </div>

              {/* Tunggakan list */}
              {(invoices.data?.data.length ?? 0) > 0 && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Anggota dengan tunggakan</div>
                  <div className="col tight">
                    {invoices.data?.data.map((inv) => (
                      <InvoiceRow key={inv.id} inv={inv} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="col" style={{ gap: 16 }}>
            {/* Cashflow chart */}
            <Card>
              <CardHead
                title="Cashflow 6 bulan"
                badge={<Badge variant="mute" naked>tren</Badge>}
              />
              <div className="card-pad">
                <CashflowChart data={s?.monthlyTrend} loading={stats.isLoading} />
              </div>
            </Card>

            {/* Pending approvals */}
            <Card>
              <CardHead
                title="Menunggu approval"
                badge={<Badge variant="warn">{pending.data?.meta.total ?? 0}</Badge>}
                actions={
                  <Btn size="sm" variant="ghost" iconRight="chev" onClick={() => {}}>Buka</Btn>
                }
              />
              <div className="card-pad" style={{ paddingTop: 4 }}>
                <div className="col tight">
                  {pending.data?.data.slice(0, 3).map((p) => (
                    <PendingRow key={p.id} payment={p} />
                  ))}
                  {!pending.isLoading && (pending.data?.data.length ?? 0) === 0 && (
                    <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                      Tidak ada pembayaran menunggu
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid dash-bot" style={{ gap: 16 }}>
          {/* Akun kas */}
          <Card>
            <CardHead
              title="Akun kas"
              actions={<Btn size="sm" variant="ghost" iconRight="chev" onClick={() => {}}>Detail</Btn>}
            />
            <div className="card-pad col tight">
              {accounts.isLoading && (
                <div className="muted" style={{ fontSize: 13 }}>Memuat...</div>
              )}
              {accounts.data?.map((a) => (
                <div key={a.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row tight">
                    <div className="avatar" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                      <Icon name={a.type === 'BANK' ? 'bank' : a.type === 'EWALLET' ? 'phone' : 'cash'} size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{a.type} · {a.accountNumber ?? '—'}</div>
                    </div>
                  </div>
                  <Rp n={a.balance ?? 0} />
                </div>
              ))}
              {!accounts.isLoading && (accounts.data?.length ?? 0) === 0 && (
                <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                  Belum ada akun kas
                </div>
              )}
            </div>
          </Card>

          {/* Live activity */}
          <Card>
            <CardHead
              title="Aktivitas terbaru"
              badge={
                <span className="row tight" style={{ marginLeft: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 999, background: 'var(--ok)',
                    animation: 'pulse-dot 1.4s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ok)' }}>
                    Live
                  </span>
                </span>
              }
            />
            <div className="card-pad">
              <ActivityTicker embedded />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, delta, featured, loading }: {
  label: string; value: React.ReactNode; delta?: React.ReactNode;
  featured?: boolean; loading?: boolean;
}) {
  return (
    <div className={`stat ${featured ? 'featured' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={loading ? { opacity: .4 } : undefined}>{value}</div>
      {delta && <div className="stat-delta">{delta}</div>}
    </div>
  );
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 12 }}>
      <div className="row tight" style={{ marginBottom: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
        <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{count}</div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  return (
    <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', gap: 8 }}>
      <div className="row tight" style={{ minWidth: 0, flex: 1 }}>
        <Avatar name={inv.member?.memberName ?? '?'} size="sm" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.member?.memberName ?? '—'}</div>
          <div className="muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <code>{inv.code}</code> · {formatDate(inv.dueDate, { day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>
      <div className="row tight" style={{ flexShrink: 0 }}>
        <StatusBadge status={inv.status} />
        <Rp n={Number(inv.amount) - Number(inv.paidAmount)} />
      </div>
    </div>
  );
}

function PendingRow({ payment }: { payment: ContributionPayment }) {
  return (
    <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)', gap: 8 }}>
      <div className="row tight" style={{ minWidth: 0, flex: 1 }}>
        <Avatar name={payment.submittedBy?.fullName ?? '?'} size="sm" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payment.submittedBy?.fullName ?? '—'}</div>
          <div className="muted" style={{ fontSize: 11 }}>{formatDate(payment.createdAt)}</div>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}><Rp n={Number(payment.amount)} /></div>
    </div>
  );
}

function CashflowChart({ data, loading }: { data?: { label: string; pemasukan: number; pengeluaran: number }[]; loading?: boolean }) {
  if (loading || !data) {
    return <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="muted" />;
  }

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} barSize={12} barGap={4}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--line-soft)" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value: number) => [`Rp ${new Intl.NumberFormat('id-ID').format(value)}`, undefined]}
        />
        <Bar dataKey="pemasukan"   name="Pemasukan"   fill="var(--accent)"    radius={[3, 3, 0, 0]} />
        <Bar dataKey="pengeluaran" name="Pengeluaran"  fill="var(--ink-faint)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

