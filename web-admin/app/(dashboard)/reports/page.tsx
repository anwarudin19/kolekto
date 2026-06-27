'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useInvoices } from '@/hooks/useInvoices';
import { api } from '@/lib/api';
import { Btn, Card, CardHead, Badge, SegmentedMeter, InputWrap } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatRp } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

type ViewTab = 'collection' | 'cashflow' | 'members';

export default function ReportsPage() {
  const teamId = useActiveTeamId();
  const [period, setPeriod] = useState('current');
  const [view, setView]     = useState<ViewTab>('collection');

  const invoices = useInvoices(teamId, { limit: 100 });
  const invList  = invoices.data?.data ?? [];

  const totalBilled    = invList.reduce((s, i) => s + i.amount, 0);
  const totalCollected = invList.reduce((s, i) => s + i.paidAmount, 0);
  const paidCount      = invList.filter((i) => i.status === 'PAID').length;
  const overdueCount   = invList.filter((i) => i.status === 'OVERDUE').length;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Mock 6-month trend (replace with real API when endpoint available)
  const trendData = [
    { p: 'Des', billed: 720, collected: 720 },
    { p: 'Jan', billed: 760, collected: 745 },
    { p: 'Feb', billed: 740, collected: 740 },
    { p: 'Mar', billed: 800, collected: 800 },
    { p: 'Apr', billed: 755, collected: 700 },
    { p: 'Mei', billed: totalBilled / 1000 || 845, collected: totalCollected / 1000 || 700 },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Laporan &amp; Analitik</div>
          <h1>Laporan iuran</h1>
          <div className="subtitle">
            Insights performa kas dan kepatuhan anggota.
          </div>
        </div>
        <div className="head-actions">
          <InputWrap icon="calendar" style={{ width: 180 }}>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}>
              <option value="current">Bulan ini</option>
              <option value="3mo">3 bulan terakhir</option>
              <option value="6mo">6 bulan terakhir</option>
              <option value="ytd">Year-to-date</option>
            </select>
          </InputWrap>
          <Btn icon="download">Export PDF</Btn>
          <Btn icon="download">CSV</Btn>
        </div>
      </div>

      <div className="page-tools">
        {([
          ['collection', 'Tingkat penagihan'],
          ['cashflow',   'Cashflow & saldo'],
          ['members',    'Kepatuhan anggota'],
        ] as [ViewTab, string][]).map(([k, l]) => (
          <button key={k} className={`chip ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      <div className="page-body col" style={{ gap: 20 }}>
        {/* ── KPI Row ── */}
        <div className="grid grid-4">
          <div className="stat featured">
            <div className="stat-label">Tingkat penagihan</div>
            <div className="stat-value">
              {invoices.isLoading ? '—' : `${collectionRate}`}
              <span style={{ fontSize: 22 }}>%</span>
            </div>
            <div className="stat-delta" style={{ opacity: 0.75 }}>
              Periode berjalan
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Total ditagih</div>
            <div className="stat-value" style={invoices.isLoading ? { opacity: .4 } : undefined}>
              Rp {formatRp(totalBilled)}
            </div>
            <div className="stat-delta muted">{invList.length} invoice</div>
          </div>
          <div className="stat">
            <div className="stat-label">Terkumpul</div>
            <div className="stat-value delta-up" style={invoices.isLoading ? { opacity: .4 } : undefined}>
              Rp {formatRp(totalCollected)}
            </div>
            <div className="stat-delta delta-up">{paidCount} lunas</div>
          </div>
          <div className="stat">
            <div className="stat-label">Overdue</div>
            <div className="stat-value" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--ok)' }}>
              {overdueCount}
            </div>
            <div className="stat-delta" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--ok)' }}>
              {overdueCount > 0 ? `${overdueCount} invoice telat` : 'Tidak ada tunggakan'}
            </div>
          </div>
        </div>

        {/* ── Collection view ── */}
        {view === 'collection' && (
          <div className="grid split-main" style={{ gap: 16 }}>
            <Card>
              <CardHead title="Tren penagihan 6 bulan" />
              <div className="card-pad">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} barSize={14} barGap={4}>
                    <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--line-soft)" />
                    <XAxis dataKey="p" tick={{ fontSize: 10, fill: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: number) => [`Rp ${formatRp(v * 1000)}`, '']}
                    />
                    <Bar dataKey="billed" name="Ditagih" fill="var(--ink-faint)" radius={[3,3,0,0]} />
                    <Bar dataKey="collected" name="Terkumpul" fill="var(--accent)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="row tight" style={{ marginTop: 10, fontSize: 11.5 }}>
                  <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }} /><span className="muted">Terkumpul</span>
                  <span style={{ width: 8, height: 8, background: 'var(--ink-faint)', borderRadius: 2 }} /><span className="muted">Ditagih</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Status per invoice" />
              <div className="card-pad col" style={{ gap: 14 }}>
                <SegmentedMeter segments={[
                  { value: paidCount, color: 'var(--ok)', label: 'Lunas' },
                  { value: invList.filter(i => i.status === 'PARTIAL').length, color: 'var(--warn)', label: 'Sebagian' },
                  { value: invList.filter(i => i.status === 'UNPAID').length, color: 'var(--ink-faint)', label: 'Belum' },
                  { value: overdueCount, color: 'var(--danger)', label: 'Telat' },
                ]} />
                <div className="col tight">
                  {[
                    { label: 'Lunas',    count: paidCount, color: 'var(--ok)' },
                    { label: 'Sebagian', count: invList.filter(i => i.status === 'PARTIAL').length, color: 'var(--warn)' },
                    { label: 'Belum',    count: invList.filter(i => i.status === 'UNPAID').length, color: 'var(--ink-faint)' },
                    { label: 'Telat',    count: overdueCount, color: 'var(--danger)' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <div className="row tight">
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{label}</span>
                      </div>
                      <div className="row tight">
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{count}</span>
                        <span className="muted" style={{ fontSize: 11 }}>
                          ({invList.length > 0 ? Math.round((count / invList.length) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Cashflow view ── */}
        {view === 'cashflow' && (
          <Card>
            <CardHead title="Cashflow & saldo" badge={<Badge variant="mute" naked>6 bulan</Badge>} />
            <div className="card-pad">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--line-soft)" />
                  <XAxis dataKey="p" tick={{ fontSize: 10, fill: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`Rp ${formatRp(v * 1000)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="collected" name="Pemasukan" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)' }} />
                  <Line type="monotone" dataKey="billed" name="Ditagih" stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* ── Members compliance view ── */}
        {view === 'members' && (
          <Card>
            <CardHead title="Kepatuhan per anggota" sub="Berdasarkan invoice aktif periode ini" />
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>Anggota</th>
                    <th>Status periode ini</th>
                    <th className="num">Tagihan</th>
                    <th className="num">Terbayar</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {invList.slice(0, 20).map((inv) => {
                    const pct = inv.amount > 0 ? Math.round((inv.paidAmount / inv.amount) * 100) : 0;
                    return (
                      <tr key={inv.id}>
                        <td style={{ paddingLeft: 18 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{inv.member?.memberName ?? '—'}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{inv.role?.name ?? '—'}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            inv.status === 'PAID' ? 'badge-ok' :
                            inv.status === 'PARTIAL' ? 'badge-warn' :
                            inv.status === 'OVERDUE' ? 'badge-danger' : 'badge-mute'
                          }`}>
                            {inv.status === 'PAID' ? 'Lunas' : inv.status === 'PARTIAL' ? 'Sebagian' : inv.status === 'OVERDUE' ? 'Telat' : 'Belum'}
                          </span>
                        </td>
                        <td className="num"><span className="amt">Rp {formatRp(inv.amount)}</span></td>
                        <td className="num">
                          {inv.paidAmount > 0
                            ? <span className="amt" style={{ color: 'var(--ok)' }}>Rp {formatRp(inv.paidAmount)}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-2)', width: 80 }}>
                            <div style={{ width: `${pct}%`, background: pct === 100 ? 'var(--ok)' : pct > 0 ? 'var(--warn)' : 'var(--ink-faint)' }} />
                          </div>
                          <div className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>{pct}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
