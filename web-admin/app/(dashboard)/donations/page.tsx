'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useAccounts } from '@/hooks/useAccounts';
import { api, buildQuery } from '@/lib/api';
import { useToast } from '@/app/providers';
import { Btn, Avatar, Card, CardHead, Rp, Modal, Field, InputWrap, Empty } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate, formatRp } from '@/lib/utils';
import { ExportModal } from '@/components/shared/ExportModal';
import { Pagination } from '@/components/shared/Pagination';

type Donation = {
  id: string; teamId: string; userId?: string; accountId: string;
  amount: number; isAnonymous: boolean; note?: string; createdAt: string;
  donorName?: string;
  account?: { name: string; type: string };
  user?: { fullName: string };
};

export default function DonationsPage() {
  const teamId  = useActiveTeamId();
  const qc      = useQueryClient();
  const { push } = useToast();
  const accounts = useAccounts(teamId);

  const [openAdd, setOpenAdd]       = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [form, setForm] = useState({ accountId: '', amount: '', isAnonymous: false, donorName: '', note: '' });

  const { data, isLoading } = useQuery<{ data: Donation[]; meta: { total: number } }>({
    queryKey: ['donations', teamId],
    queryFn: async () => {
      const res = await api.get(`/teams/${teamId}/donations${buildQuery({ limit: 50 })}`);
      return res.data;
    },
    enabled: !!teamId,
  });

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post(`/teams/${teamId}/donations`, payload);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donations', teamId] }); push('Donasi tercatat', 'success'); setOpenAdd(false); },
    onError: (e: any) => push(e?.message ?? 'Gagal catat donasi', 'error'),
  });

  const donations = data?.data ?? [];
  const total = donations.reduce((s, d) => s + Number(d.amount), 0);
  const monthTotal = donations.filter(d => new Date(d.createdAt).getMonth() === new Date().getMonth()).reduce((s, d) => s + Number(d.amount), 0);
  const anonCount = donations.filter(d => d.isAnonymous).length;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages   = Math.max(1, Math.ceil(donations.length / pageSize));
  const safePage     = Math.min(page, totalPages);
  const pagedDonations = donations.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Donasi Sukarela</div>
          <h1>Donasi</h1>
          <div className="subtitle">Catat pemasukan sukarela di luar iuran rutin — dengan nama atau anonim.</div>
        </div>
        <div className="head-actions">
          <Btn icon="download" onClick={() => setOpenExport(true)}>Export</Btn>
          <Btn icon="plus" variant="primary" onClick={() => setOpenAdd(true)}>Catat donasi</Btn>
        </div>
      </div>

      <div className="page-body col" style={{ gap: 18 }}>
        <div className="grid grid-4">
          <div className="stat featured">
            <div className="stat-label">Total donasi (all-time)</div>
            <div className="stat-value">Rp {formatRp(total)}</div>
            <div className="stat-delta" style={{ opacity: 0.7 }}>Dari {donations.length} donasi</div>
          </div>
          <div className="stat">
            <div className="stat-label">Bulan ini</div>
            <div className="stat-value">Rp {formatRp(monthTotal)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Donatur anonim</div>
            <div className="stat-value">{anonCount}<span style={{ fontSize: 16, color: 'var(--ink-muted)', marginLeft: 4 }}>/{donations.length}</span></div>
          </div>
          <div className="stat">
            <div className="stat-label">Rata-rata</div>
            <div className="stat-value">Rp {formatRp(donations.length ? Math.round(total / donations.length) : 0)}</div>
            <div className="stat-delta">per donasi</div>
          </div>
        </div>

        <Card>
          <CardHead title="Riwayat donasi" sub="Semua donasi masuk sebagai INCOME di akun yang dipilih." />
          {isLoading ? (
            <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat...</div>
          ) : donations.length === 0 ? (
            <div className="card-pad"><Empty icon="sparkle" title="Belum ada donasi" sub="Catat donasi pertama tim Anda" /></div>
          ) : (
            <>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>Tanggal</th>
                    <th>Donatur</th>
                    <th>Akun penerima</th>
                    <th>Catatan</th>
                    <th className="num">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDonations.map(d => (
                    <tr key={d.id} className="clickable">
                      <td style={{ paddingLeft: 18 }}><span className="mono muted">{formatDate(d.createdAt)}</span></td>
                      <td>
                        {d.isAnonymous ? (
                          <div className="row tight">
                            <div className="avatar sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                              <Icon name="user" size={12} />
                            </div>
                            <span style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>Anonim</span>
                          </div>
                        ) : (
                          <div className="row tight">
                            <Avatar name={d.donorName ?? d.user?.fullName ?? '?'} size="sm" />
                            <span className="cell-strong">{d.donorName ?? d.user?.fullName ?? '—'}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 13 }}>{d.account?.name ?? '—'}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 13, fontStyle: d.note ? 'normal' : 'italic' }}>
                        {d.note || '—'}
                      </td>
                      <td className="num">
                        <span style={{ color: 'var(--ok)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          +<span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>Rp</span> {formatRp(d.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 4px' }}>
              <Pagination
                page={safePage} totalPages={totalPages} pageSize={pageSize} total={donations.length}
                onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
            </>
          )}
        </Card>

        <div className="card card-pad" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <Icon name="alert" size={18} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent-ink)', fontSize: 14 }}>Tentang donasi</div>
              <div style={{ fontSize: 13, color: 'var(--accent-ink)', marginTop: 4, opacity: 0.85, lineHeight: 1.55 }}>
                Donasi bersifat sukarela dan tidak dihitung sebagai iuran rutin. Catat sebagai anonim jika donatur tidak ingin namanya tampil di laporan.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Catat donasi baru"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn>
            <span className="spacer" />
            <Btn variant="primary" icon="check"
              onClick={() => create.mutate({ accountId: form.accountId, amount: +form.amount, isAnonymous: form.isAnonymous, note: form.note, donorName: form.isAnonymous ? undefined : form.donorName })}
              loading={create.isPending}>
              Simpan donasi
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Donatur" help="Kosongkan nama atau pilih anonim jika donatur tidak ingin namanya tampil.">
            <label className="row tight" style={{ cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
              <span style={{ fontSize: 13 }}>Anonim (sembunyikan nama)</span>
            </label>
            {!form.isAnonymous && (
              <InputWrap icon="user">
                <input placeholder="Nama donatur..." value={form.donorName} onChange={e => setForm(f => ({ ...f, donorName: e.target.value }))} />
              </InputWrap>
            )}
          </Field>
          <div className="grid grid-2">
            <Field label="Akun penerima">
              <InputWrap icon="wallet">
                <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}>
                  <option value="">Pilih akun...</option>
                  {accounts.data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </InputWrap>
            </Field>
            <Field label="Nominal (Rp)">
              <InputWrap>
                <input type="number" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', fontFamily: 'var(--font-mono)', fontSize: 15 }} />
              </InputWrap>
            </Field>
          </div>
          <Field label="Catatan (opsional)">
            <InputWrap>
              <input placeholder="Cth. Untuk konsumsi rapat" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </InputWrap>
          </Field>
        </div>
      </Modal>

      <ExportModal open={openExport} onClose={() => setOpenExport(false)} defaultKind="donasi" />
    </>
  );
}
