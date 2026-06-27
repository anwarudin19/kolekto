'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, normalizeApiError } from '@/lib/api';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useToast } from '@/app/providers';
import {
  Btn, Badge, Rp, Card, CardHead, Empty, SegmentedMeter,
} from '@/components/ui';
import { Icon, type IconName } from '@/components/icons/Icon';
import { formatRp, formatDate } from '@/lib/utils';
import { buildCsv, downloadCsv } from '@/lib/csv';
import type { DashboardStats, Account } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ─── Period filter ──────────────────────────────────────────────────────────────
type PeriodId = 'month' | '30d' | '3m' | 'ytd' | 'all' | 'custom';

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'month',  label: 'Bulan ini' },
  { id: '30d',    label: '30 hari' },
  { id: '3m',     label: '3 bulan' },
  { id: 'ytd',    label: 'Tahun ini' },
  { id: 'all',    label: 'Semua' },
  { id: 'custom', label: 'Kustom' },
];

type DateRange = { start: Date | null; end: Date | null };

function todayIso(): string { return new Date().toISOString().slice(0, 10); }
function isoMinusDays(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function startOfDay(iso: string): Date { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d; }
function endOfDay(iso: string): Date { const d = new Date(iso); d.setHours(23, 59, 59, 999); return d; }

/** Rentang [start, end] inklusif untuk periode. `null` = sisi itu tak dibatasi. */
function periodRange(id: PeriodId, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  switch (id) {
    case 'month':  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
    case '30d':    { const d = new Date(now); d.setDate(d.getDate() - 30); return { start: d, end: null }; }
    case '3m':     { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { start: d, end: null }; }
    case 'ytd':    return { start: new Date(now.getFullYear(), 0, 1), end: null };
    case 'all':    return { start: null, end: null };
    case 'custom': return {
      start: customFrom ? startOfDay(customFrom) : null,
      end:   customTo   ? endOfDay(customTo)     : null,
    };
  }
}

// ─── Transaksi ────────────────────────────────────────────────────────────────
// Bentuk transaksi mentah dari API (backend mengembalikan relasi `creator`).
type TxnApiRow = {
  id: string;
  createdAt: string;
  type: 'INCOME' | 'EXPENSE';
  source?: string | null;
  amount: number | string;
  description?: string | null;
  accountId?: string | null;
  account?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  creator?: { fullName?: string | null } | null;
};

const TXN_TYPE_LABEL: Record<string, string> = { INCOME: 'Pemasukan', EXPENSE: 'Pengeluaran' };

/** Ambil semua transaksi tim dengan menelusuri seluruh halaman (limit backend = 100/halaman). */
async function fetchAllTransactions(teamId: string): Promise<TxnApiRow[]> {
  const limit = 100;
  const all: TxnApiRow[] = [];
  let page = 1;
  // Batas aman supaya tidak terjadi loop tak hingga bila meta tak konsisten.
  for (let guard = 0; guard < 1000; guard++) {
    const res = await api.get<{ data: TxnApiRow[]; meta: { totalPages: number } }>(
      `/teams/${teamId}/transactions?limit=${limit}&page=${page}`,
    );
    all.push(...res.data.data);
    if (page >= (res.data.meta.totalPages ?? 1)) break;
    page += 1;
  }
  return all;
}

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

function useAllTransactions(teamId: string | null) {
  return useQuery<TxnApiRow[]>({
    queryKey: ['transactions-all', teamId],
    queryFn: () => fetchAllTransactions(teamId as string),
    enabled: !!teamId,
  });
}

const ACCOUNT_ICON: Record<string, IconName> = { BANK: 'bank', EWALLET: 'phone', CASH: 'cash' };
const METER_COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--teal)', 'var(--ink-faint)'];
const DATE_INPUT_STYLE: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--bg-elev)', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const teamId   = useActiveTeamId();
  const stats    = useDashboard(teamId);
  const accounts = useAccounts(teamId);
  const txns     = useAllTransactions(teamId);

  const { push } = useToast();
  const [period, setPeriod]   = useState<PeriodId>('month');
  const [customFrom, setCustomFrom] = useState(isoMinusDays(30));
  const [customTo, setCustomTo]     = useState(todayIso());
  const [type, setType]       = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [account, setAccount] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  const periodLabel = period === 'custom'
    ? (customFrom && customTo
        ? `${formatDate(customFrom, { day: 'numeric', month: 'short' })} – ${formatDate(customTo, { day: 'numeric', month: 'short' })}`
        : 'Kustom')
    : PERIODS.find((p) => p.id === period)!.label;

  // ── Filter berlapis: periode + akun → stat & saldo; + tipe → daftar & export ──
  const { start, end } = periodRange(period, customFrom, customTo);
  const allTxns = txns.data ?? [];
  const scopeTxns = allTxns.filter((t) => {
    const d = new Date(t.createdAt);
    const inPeriod  = (!start || d >= start) && (!end || d <= end);
    const inAccount = account === 'all' || t.accountId === account;
    return inPeriod && inAccount;
  });
  const filtered = type === 'all' ? scopeTxns : scopeTxns.filter((t) => t.type === type);

  const income  = scopeTxns.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = scopeTxns.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
  const net     = income - expense;

  const s             = stats.data;
  const monthLbl      = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const accountList     = accounts.data ?? [];
  const totalAccounts   = accountList.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const selectedAccount = account === 'all' ? null : accountList.find((a) => a.id === account) ?? null;

  function handleExport() {
    if (!teamId || exporting) return;
    if (txns.isLoading) { push('Data transaksi masih dimuat, coba lagi sebentar', 'error'); return; }
    if (period === 'custom' && customFrom && customTo && customFrom > customTo) {
      push('Rentang tanggal tidak valid: "dari" melebihi "sampai"', 'error'); return;
    }
    if (filtered.length === 0) { push(`Tidak ada transaksi pada periode "${periodLabel}"`, 'error'); return; }
    setExporting(true);
    try {
      const headers = ['Tanggal', 'Tipe', 'Sumber', 'Kategori', 'Akun', 'Deskripsi', 'Jumlah', 'Dibuat oleh'];
      const body = filtered.map((t) => [
        formatDate(t.createdAt, { hour: '2-digit', minute: '2-digit' }),
        TXN_TYPE_LABEL[t.type] ?? t.type,
        t.source ?? '',
        t.category?.name ?? '',
        t.account?.name ?? '',
        t.description ?? '',
        Number(t.amount),
        t.creator?.fullName ?? '',
      ]);
      const filename = `kolekto-transaksi-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, buildCsv(headers, body));
      push(`${filtered.length} transaksi (${periodLabel}) diekspor ke ${filename}`, 'success');
    } catch (e) {
      push(normalizeApiError(e).message || 'Gagal mengekspor transaksi', 'error');
    } finally {
      setExporting(false);
    }
  }

  const statLoading = txns.isLoading;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">{monthLbl}</div>
          <h1>Ringkasan Keuangan</h1>
          <div className="subtitle">Pemasukan, pengeluaran, dan saldo kas tim dalam satu tampilan.</div>
        </div>
        <div className="head-actions">
          <Btn icon="refresh" variant="default" onClick={() => { stats.refetch(); accounts.refetch(); txns.refetch(); }}>
            Segarkan
          </Btn>
          <Btn
            icon={exporting ? 'refresh' : 'download'}
            variant="primary"
            disabled={!teamId || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Mengekspor…' : 'Export CSV'}
          </Btn>
        </div>
      </div>

      <div className="page-body col" style={{ gap: 20 }}>
        {/* ── Period filter ── */}
        <div className="row tight" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            <Icon name="filter" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            Periode
          </span>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`chip ${period === p.id ? 'active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <span className="row tight" style={{ gap: 6, marginLeft: 4, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={customFrom}
                max={customTo || todayIso()}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={DATE_INPUT_STYLE}
                aria-label="Tanggal mulai"
              />
              <span className="muted" style={{ fontSize: 12 }}>s/d</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={todayIso()}
                onChange={(e) => setCustomTo(e.target.value)}
                style={DATE_INPUT_STYLE}
                aria-label="Tanggal akhir"
              />
            </span>
          )}
        </div>

        {/* ── Filter tipe & akun ── */}
        <div className="row tight" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            <Icon name="sort" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            Tipe
          </span>
          {([['all', 'Semua'], ['INCOME', 'Pemasukan'], ['EXPENSE', 'Pengeluaran']] as const).map(([id, label]) => (
            <button key={id} className={`chip ${type === id ? 'active' : ''}`} onClick={() => setType(id)}>{label}</button>
          ))}

          <span className="muted" style={{ fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
            <Icon name="wallet" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            Akun
          </span>
          <select value={account} onChange={(e) => setAccount(e.target.value)} style={DATE_INPUT_STYLE} aria-label="Filter akun kas">
            <option value="all">Semua akun</option>
            {accountList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-4">
          <StatCard
            featured
            label={selectedAccount ? `Saldo ${selectedAccount.name}` : 'Total saldo kas'}
            value={`Rp ${formatRp(selectedAccount ? (selectedAccount.balance ?? 0) : (s?.totalBalance ?? 0))}`}
            delta={<span className="muted" style={{ fontSize: 11.5 }}>{selectedAccount ? selectedAccount.type : 'Saldo kumulatif'}</span>}
            loading={stats.isLoading}
          />
          <StatCard
            label={`Pemasukan · ${periodLabel}`}
            value={`Rp ${formatRp(income)}`}
            delta={<span className="delta-up">↑ Masuk</span>}
            loading={statLoading}
          />
          <StatCard
            label={`Pengeluaran · ${periodLabel}`}
            value={`Rp ${formatRp(expense)}`}
            delta={<span className="delta-down">↓ Keluar</span>}
            loading={statLoading}
          />
          <StatCard
            label={`Arus kas bersih · ${periodLabel}`}
            value={`Rp ${formatRp(net)}`}
            delta={
              <span className={net >= 0 ? 'delta-up' : 'delta-down'}>
                {net >= 0 ? 'Surplus' : 'Defisit'}
              </span>
            }
            loading={statLoading}
          />
        </div>

        {/* ── Mid row: cashflow chart + saldo per akun ── */}
        <div className="grid dash-mid" style={{ gap: 16 }}>
          {/* Cashflow chart */}
          <Card>
            <CardHead
              title="Tren arus kas 6 bulan"
              badge={<Badge variant="mute" naked>pemasukan vs pengeluaran</Badge>}
            />
            <div className="card-pad">
              <CashflowChart data={s?.monthlyTrend} loading={stats.isLoading} />
            </div>
          </Card>

          {/* Saldo per akun */}
          <Card>
            <CardHead
              title="Saldo per akun kas"
              badge={accountList.length > 0 ? <Badge variant="mute" naked>{accountList.length} akun</Badge> : undefined}
            />
            <div className="card-pad col" style={{ gap: 16 }}>
              {accountList.length > 0 && (
                <SegmentedMeter
                  segments={accountList.map((a, i) => ({
                    value: a.balance ?? 0,
                    color: METER_COLORS[i % METER_COLORS.length],
                    label: a.name,
                  }))}
                />
              )}
              <div className="col tight">
                {accounts.isLoading && <div className="muted" style={{ fontSize: 13 }}>Memuat...</div>}
                {accountList.map((a) => {
                  const share = totalAccounts > 0 ? Math.round(((a.balance ?? 0) / totalAccounts) * 100) : 0;
                  return (
                    <div key={a.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <div className="row tight">
                        <div className="avatar" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                          <Icon name={ACCOUNT_ICON[a.type] ?? 'cash'} size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{a.type} · {share}% dari total</div>
                        </div>
                      </div>
                      <Rp n={a.balance ?? 0} />
                    </div>
                  );
                })}
                {!accounts.isLoading && accountList.length === 0 && (
                  <Empty icon="wallet" title="Belum ada akun kas" sub="Tambahkan akun kas untuk mulai mencatat saldo." />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Bottom: recent transactions (sesuai periode) ── */}
        <Card>
          <CardHead
            title="Transaksi terbaru"
            sub={periodLabel}
            badge={<Badge variant="mute" naked>{filtered.length} transaksi</Badge>}
          />
          <div className="card-pad col tight">
            {txns.isLoading && <div className="muted" style={{ fontSize: 13 }}>Memuat...</div>}
            {filtered.slice(0, 8).map((t) => <TxnRow key={t.id} txn={t} />)}
            {!txns.isLoading && filtered.length > 8 && (
              <div className="muted" style={{ fontSize: 12, textAlign: 'center', paddingTop: 10 }}>
                +{filtered.length - 8} transaksi lainnya pada periode ini — gunakan Export CSV untuk daftar lengkap
              </div>
            )}
            {!txns.isLoading && filtered.length === 0 && (
              <Empty icon="receipt" title="Belum ada transaksi" sub={`Tidak ada transaksi pada periode "${periodLabel}".`} />
            )}
          </div>
        </Card>
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

function TxnRow({ txn }: { txn: TxnApiRow }) {
  const isIncome = txn.type === 'INCOME';
  return (
    <div className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)', gap: 10 }}>
      <div className="row tight" style={{ minWidth: 0, flex: 1 }}>
        <div
          className="avatar"
          style={{
            background: isIncome ? 'var(--ok-soft, var(--surface))' : 'var(--danger-soft)',
            color: isIncome ? 'var(--ok)' : 'var(--danger)',
          }}
        >
          <Icon name={isIncome ? 'arrUp' : 'minus'} size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {txn.description || (isIncome ? 'Pemasukan' : 'Pengeluaran')}
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {txn.account?.name ?? '—'}
            {txn.category?.name ? ` · ${txn.category.name}` : ''} · {formatDate(txn.createdAt)}
          </div>
        </div>
      </div>
      <div
        className="amt"
        style={{ flexShrink: 0, color: isIncome ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}
      >
        {isIncome ? '+' : '−'} Rp {formatRp(Number(txn.amount))}
      </div>
    </div>
  );
}

function CashflowChart({ data, loading }: {
  data?: { label: string; pemasukan: number; pengeluaran: number }[]; loading?: boolean;
}) {
  if (loading || !data) {
    return <div style={{ height: 200 }} className="muted" />;
  }
  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: 'grid', placeItems: 'center' }}>
        <Empty icon="reports" title="Belum ada data arus kas" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={14} barGap={4}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--line-soft)" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value: number, name) => [`Rp ${new Intl.NumberFormat('id-ID').format(value)}`, name]}
        />
        <Bar dataKey="pemasukan"   name="Pemasukan"   fill="var(--accent)"    radius={[3, 3, 0, 0]} />
        <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--ink-faint)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
