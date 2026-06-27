'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useAccounts } from '@/hooks/useAccounts';
import { useGenerateInvoices, useInvoice, useInvoices, useUpdateInvoice } from '@/hooks/useInvoices';
import { useSubmitPayment } from '@/hooks/usePayments';
import { useToast } from '@/app/providers';
import { Btn, Avatar, StatusBadge, Rp, Modal, Field, InputWrap, Empty } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate, periodLabel } from '@/lib/utils';
import { Pagination } from '@/components/shared/Pagination';
import type { Invoice } from '@/types';

const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'UNPAID', label: 'Belum' },
  { value: 'PARTIAL', label: 'Sebagian' },
  { value: 'OVERDUE', label: 'Telat' },
  { value: 'PAID', label: 'Lunas' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

export default function InvoicesPage() {
  const teamId = useActiveTeamId();
  const { push } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [openCreate, setOpenCreate] = useState(false);
  const [createPeriod, setCreatePeriod] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<Invoice['status']>('UNPAID');

  const { data, isLoading } = useInvoices(teamId, { limit: 100 });
  // Backend men-scope list berdasarkan role tim: MEMBER hanya invoice miliknya;
  // OWNER/ADMIN/TREASURER seluruh invoice tim. `meta.canManage` menandai izin kelola.
  const canManage = Boolean((data?.meta as { canManage?: boolean } | undefined)?.canManage);

  const invoiceDetail = useInvoice(selectedId);
  const generateMutation = useGenerateInvoices(teamId);
  const updateMutation = useUpdateInvoice(teamId);

  const invoices = data?.data ?? [];

  const selectedInvoice = useMemo(() => {
    if (!selectedId) return null;
    return invoiceDetail.data ?? invoices.find((inv) => inv.id === selectedId) ?? null;
  }, [selectedId, invoiceDetail.data, invoices]);

  const periodOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const inv of invoices) {
      const key = periodKey(inv.periodDate);
      if (!key) continue;
      map.set(key, periodLabelFromPeriodKey(key));
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [invoices]);

  useEffect(() => {
    if (periodOptions.length === 0) return;
    if (!periodFilter || !periodOptions.some((opt) => opt.value === periodFilter)) {
      setPeriodFilter(periodOptions[0].value);
    }
  }, [periodFilter, periodOptions]);

  const periodScopedInvoices = useMemo(() => {
    if (!periodFilter) return invoices;
    return invoices.filter((inv) => periodKey(inv.periodDate) === periodFilter);
  }, [invoices, periodFilter]);

  const counts = useMemo(() => ({
    all: periodScopedInvoices.length,
    UNPAID: periodScopedInvoices.filter((i) => i.status === 'UNPAID').length,
    PARTIAL: periodScopedInvoices.filter((i) => i.status === 'PARTIAL').length,
    OVERDUE: periodScopedInvoices.filter((i) => i.status === 'OVERDUE').length,
    PAID: periodScopedInvoices.filter((i) => i.status === 'PAID').length,
  }), [periodScopedInvoices]);

  useEffect(() => { setPage(1); }, [statusFilter, query, periodFilter]);

  const filteredInvoices = useMemo(() => {
    return periodScopedInvoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const name = (inv.member?.memberName ?? '').toLowerCase();
      const code = inv.code.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [periodScopedInvoices, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedInvoices = filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalBilled = periodScopedInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalCollected = periodScopedInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
  const outstanding = Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const lateCount = counts.OVERDUE;
  const activePeriodLabel = periodFilter ? periodLabelFromPeriodKey(periodFilter) : '-';

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const allSelected = filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedRows[inv.id]);
  const someSelected = !allSelected && filteredInvoices.some((inv) => selectedRows[inv.id]);

  const toggleSelect = (id: string) => {
    setSelectedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    setSelectedRows((prev) => {
      const next = { ...prev };

      if (allSelected) {
        for (const inv of filteredInvoices) {
          delete next[inv.id];
        }
      } else {
        for (const inv of filteredInvoices) {
          next[inv.id] = true;
        }
      }

      return next;
    });
  };

  const handleGenerate = async (periodKeyValue: string) => {
    try {
      const periodDate = periodDateFromKey(periodKeyValue);
      const result = await generateMutation.mutateAsync({ periodDate });
      const totalGenerated = Number(result?.totalGenerated ?? 0);
      push(`Generate berhasil: ${totalGenerated} invoice dibuat`, 'success');
      return true;
    } catch (e: any) {
      push(e?.message ?? 'Gagal generate invoice', 'error');
      return false;
    }
  };

  const openCreateModal = () => {
    setCreatePeriod(periodFilter || currentPeriodKey());
    setOpenCreate(true);
  };

  const submitCreate = async () => {
    const ok = await handleGenerate(createPeriod || currentPeriodKey());
    if (ok) {
      setOpenCreate(false);
    }
  };

  const openEdit = () => {
    if (!selectedInvoice) return;
    setEditDueDate(toInputDate(selectedInvoice.dueDate));
    setEditStatus(selectedInvoice.status);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selectedInvoice) return;

    try {
      await updateMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        payload: {
          dueDate: editDueDate || undefined,
          status: editStatus,
        },
      });

      push('Invoice berhasil diperbarui', 'success');
      setEditOpen(false);
    } catch (e: any) {
      push(e?.message ?? 'Gagal memperbarui invoice', 'error');
    }
  };

  const markAsPaid = async () => {
    if (!selectedInvoice) return;

    try {
      await updateMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        payload: { status: 'PAID' },
      });
      push('Invoice ditandai lunas', 'success');
    } catch (e: any) {
      push(e?.message ?? 'Gagal update status', 'error');
    }
  };

  const exportCsv = () => {
    if (filteredInvoices.length === 0) {
      push('Tidak ada data untuk diexport', 'error');
      return;
    }

    const header = ['Kode', 'Anggota', 'Jabatan', 'Periode', 'Jatuh Tempo', 'Nominal', 'Terbayar', 'Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.code,
      inv.member?.memberName ?? '-',
      inv.role?.name ?? '-',
      periodLabel(inv.periodDate),
      formatDate(inv.dueDate),
      String(inv.amount),
      String(inv.paidAmount),
      inv.status,
    ]);

    const lines = [header, ...rows].map((cols) => cols.map(escapeCsv).join(','));
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${periodFilter || 'semua'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Invoice</div>
          <h1>Iuran &amp; Tagihan</h1>
          <div className="subtitle">
            {counts.all} invoice · {collectionRate}% terkumpul · periode {activePeriodLabel}
          </div>
        </div>
        <div className="head-actions">
          {canManage && (
            <Btn
              icon="refresh"
              variant="ghost"
              loading={generateMutation.isPending}
              onClick={() => handleGenerate(periodFilter || currentPeriodKey())}
            >
              Generate manual
            </Btn>
          )}
          <Btn icon="download" onClick={exportCsv}>Export</Btn>
          {canManage && (
            <Btn icon="plus" variant="primary" onClick={openCreateModal}>
              Invoice baru
            </Btn>
          )}
        </div>
      </div>

      <div className="page-body col invoice-page" style={{ gap: 18 }}>
        <div className="grid grid-4">
          <div className="stat">
            <div className="stat-label">Total ditagihkan</div>
            <div className="stat-value">Rp {new Intl.NumberFormat('id-ID').format(totalBilled)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Terkumpul</div>
            <div className="stat-value" style={{ color: 'var(--ok)' }}>Rp {new Intl.NumberFormat('id-ID').format(totalCollected)}</div>
            <div className="stat-delta">{collectionRate}% dari total</div>
          </div>
          <div className="stat">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>Rp {new Intl.NumberFormat('id-ID').format(outstanding)}</div>
            <div className="stat-delta">{counts.UNPAID + counts.PARTIAL + counts.OVERDUE} invoice</div>
          </div>
          <div className="stat">
            <div className="stat-label">Telat</div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>{lateCount}</div>
            <div className="stat-delta delta-down">Perlu follow-up</div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <InputWrap icon="search" style={{ maxWidth: 320 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau kode invoice..."
            />
          </InputWrap>

          <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>Status:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`chip ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
              <span className="count">{counts[f.value]}</span>
            </button>
          ))}

          <span className="spacer" />

          <label className="input" style={{ width: 180 }}>
            <Icon name="calendar" size={16} style={{ color: 'var(--ink-muted)' }} />
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat...</div>}

        {!isLoading && filteredInvoices.length === 0 && (
          <Empty
            icon="receipt"
            title="Tidak ada invoice"
            sub="Ubah filter atau generate invoice baru"
            action={canManage ? <Btn icon="plus" variant="primary" onClick={openCreateModal}>Invoice baru</Btn> : undefined}
          />
        )}

        {!isLoading && filteredInvoices.length > 0 && (
          <>
            <InvoicesTable
              invoices={pagedInvoices}
              selectedRows={selectedRows}
              allSelected={allSelected}
              someSelected={someSelected}
              selectedCount={selectedCount}
              onToggleAll={toggleAll}
              onToggleRow={toggleSelect}
              onSelect={setSelectedId}
            />
            <Pagination
              page={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={filteredInvoices.length}
              onPage={setPage}
              onPageSize={(s) => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </div>

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Generate invoice"
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setOpenCreate(false)}>Batal</Btn>
            <Btn variant="primary" icon="plus" onClick={submitCreate} loading={generateMutation.isPending}>
              Generate invoice
            </Btn>
          </>
        )}
      >
        <div className="col" data-testid="create-invoice-form" style={{ gap: 16 }}>
          <Field label="Periode">
            <InputWrap>
              <input
                type="month"
                value={createPeriod}
                onChange={(e) => setCreatePeriod(e.target.value)}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}
              />
            </InputWrap>
          </Field>
          <div className="muted" style={{ fontSize: 12 }}>
            Generate akan membuat invoice untuk semua anggota aktif pada periode ini yang belum memiliki invoice.
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit invoice"
        footer={(
          <>
            <Btn variant="ghost" onClick={() => setEditOpen(false)}>Batal</Btn>
            <Btn variant="primary" icon="check" onClick={submitEdit} loading={updateMutation.isPending}>
              Simpan perubahan
            </Btn>
          </>
        )}
      >
        <div className="col" style={{ gap: 16 }}>
          <Field label="Jatuh tempo">
            <InputWrap>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}
              />
            </InputWrap>
          </Field>

          <Field label="Status">
            <label className="input">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Invoice['status'])}
              >
                <option value="DRAFT">Draft</option>
                <option value="UNPAID">Belum Bayar</option>
                <option value="PARTIAL">Sebagian</option>
                <option value="OVERDUE">Telat</option>
                <option value="PAID">Lunas</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </label>
          </Field>
        </div>
      </Modal>

      {selectedInvoice && !editOpen && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          loading={invoiceDetail.isLoading}
          saving={updateMutation.isPending}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onOpenEdit={openEdit}
          onMarkPaid={markAsPaid}
        />
      )}
    </>
  );
}

function InvoicesTable({
  invoices,
  selectedRows,
  allSelected,
  someSelected,
  selectedCount,
  onToggleAll,
  onToggleRow,
  onSelect,
}: {
  invoices: Invoice[];
  selectedRows: Record<string, boolean>;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ paddingLeft: 18, width: 40 }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={onToggleAll}
                aria-label="Pilih semua"
              />
            </th>
            <th>Kode</th>
            <th>Anggota</th>
            <th>Jabatan</th>
            <th className="num">Nominal</th>
            <th className="num">Terbayar</th>
            <th>Jatuh Tempo</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const isSelected = !!selectedRows[inv.id];
            const roleName = inv.role?.name ?? '—';

            return (
              <tr
                key={inv.id}
                className="clickable"
                style={{ background: isSelected ? 'var(--accent-soft)' : undefined }}
                onClick={() => onSelect(inv.id)}
              >
                <td style={{ paddingLeft: 18 }} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggleRow(inv.id)} aria-label={`Pilih ${inv.code}`} />
                </td>
                <td><code>{inv.code}</code></td>
                <td>
                  <div className="row tight">
                    <Avatar name={inv.member?.memberName ?? '?'} size="sm" />
                    <span className="cell-strong">{inv.member?.memberName ?? '—'}</span>
                  </div>
                </td>
                <td>
                  <span className={`tag ${roleToneClass(roleName)}`}>
                    <span className="tag-dot" />
                    {roleName}
                  </span>
                </td>
                <td className="num"><Rp n={inv.amount} /></td>
                <td className="num">
                  {inv.paidAmount > 0 ? <Rp n={inv.paidAmount} /> : <span className="muted">—</span>}
                </td>
                <td className="mono">{shortDueDate(inv.dueDate)}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <button className="iconbtn" aria-label={`Buka ${inv.code}`}>
                    <Icon name="chev" size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedCount > 0 && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', fontSize: 12.5, color: 'var(--ink-muted)' }}>
          {selectedCount} invoice dipilih
        </div>
      )}
    </div>
  );
}

function InvoiceDetailModal({
  invoice,
  loading,
  saving,
  canManage,
  onClose,
  onOpenEdit,
  onMarkPaid,
}: {
  invoice: Invoice;
  loading: boolean;
  saving: boolean;
  canManage: boolean;
  onClose: () => void;
  onOpenEdit: () => void;
  onMarkPaid: () => void;
}) {
  const teamId = useActiveTeamId();
  const { push } = useToast();
  const accounts = useAccounts(teamId);
  const submitPayment = useSubmitPayment();

  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState<{ accountId: string; amount: string; note: string; proof: File | null }>({ accountId: '', amount: '', note: '', proof: null });

  const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paidAmount));
  const roleName = invoice.role?.name ?? '—';
  const payments = invoice.payments ?? [];
  const payCount = payments.length;
  const hasPendingPayment = payments.some(p => p.status === 'PENDING');

  const overduedays = (() => {
    const due = new Date(invoice.dueDate);
    const now = new Date();
    if (isNaN(due.getTime()) || invoice.status === 'PAID') return 0;
    const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
    return diff > 0 ? diff : 0;
  })();

  const handleSubmitPayment = async () => {
    if (!payForm.accountId || !payForm.amount) {
      push('Akun dan nominal wajib diisi', 'error');
      return;
    }
    try {
      await submitPayment.mutateAsync({
        invoiceId: invoice.id,
        accountId: payForm.accountId,
        amount: Number(payForm.amount),
        note: payForm.note || undefined,
        proof: payForm.proof ?? undefined,
      });
      push(canManage ? 'Pembayaran berhasil dicatat' : 'Konfirmasi pembayaran terkirim', 'success');
      setShowPayForm(false);
      setPayForm({ accountId: '', amount: '', note: '', proof: null });
    } catch (e: any) {
      push(e?.message ?? 'Gagal mencatat pembayaran', 'error');
    }
  };

  const footer = (
    <>
      {canManage && <Btn variant="ghost" icon="edit" onClick={onOpenEdit} loading={saving}>Edit invoice</Btn>}
      <Btn variant="ghost" icon="download" onClick={() => window.print()}>Lihat tagihan</Btn>
      {canManage && <Btn variant="ghost" icon="bell" onClick={() => push('Fitur reminder segera hadir', 'default')}>Reminder</Btn>}
      <span className="spacer" />
      <Btn
        variant="primary"
        icon="check"
        onClick={() => {
          setPayForm(f => ({ ...f, amount: String(remaining) }));
          setShowPayForm(true);
        }}
        disabled={invoice.status === 'PAID' || showPayForm || (!canManage && hasPendingPayment)}
      >
        {!canManage && hasPendingPayment ? 'Menunggu verifikasi' : canManage ? 'Catat pembayaran' : 'Konfirmasi pembayaran'}
      </Btn>
    </>
  );

  return (
    <Modal open onClose={onClose} title="Detail invoice" wide footer={footer}>
      <div className="col" style={{ gap: 16 }}>
        {/* ── Header ── */}
        <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <code style={{ fontSize: 11.5, color: 'var(--ink-muted)', letterSpacing: '.03em' }}>{invoice.code}</code>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2, lineHeight: 1.2 }}>
              Iuran {periodLabel(invoice.periodDate)}
            </div>
          </div>
          <div data-testid="invoice-status"><StatusBadge status={invoice.status} /></div>
        </div>

        {loading && <div className="muted" style={{ fontSize: 12 }}>Memuat detail terbaru...</div>}

          {/* ── Summary card ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--surface)', borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderRight: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
                Total tagihan
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                Rp {new Intl.NumberFormat('id-ID').format(Number(invoice.amount))}
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>
                Sisa
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
                color: remaining > 0 ? 'var(--danger)' : 'var(--ok)',
              }}>
                Rp {new Intl.NumberFormat('id-ID').format(remaining)}
              </div>
            </div>
          </div>

          {/* ── Detail tagihan ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', fontWeight: 600, fontSize: 13.5 }}>
              Detail tagihan
            </div>
            <dl style={{ margin: 0, padding: '4px 0' }}>
              {[
                {
                  label: 'Anggota',
                  value: (
                    <div className="row tight">
                      <Avatar name={invoice.member?.memberName ?? '?'} size="sm" />
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{invoice.member?.memberName ?? '—'}</span>
                    </div>
                  ),
                },
                {
                  label: 'Jabatan',
                  value: (
                    <span className={`tag ${roleToneClass(roleName)}`} style={{ fontSize: 12 }}>
                      <span className="tag-dot" />{roleName}
                    </span>
                  ),
                },
                { label: 'Periode', value: periodLabel(invoice.periodDate) },
                { label: 'Tanggal dibuat', value: formatDate(invoice.createdAt) },
                {
                  label: 'Jatuh tempo',
                  value: (
                    <div className="row tight" style={{ flexWrap: 'wrap', gap: 6 }}>
                      <span>{formatDate(invoice.dueDate)}</span>
                      {overduedays > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 20, background: 'var(--danger-soft)', color: 'var(--danger)',
                        }}>
                          terlewat {overduedays} hari
                        </span>
                      )}
                    </div>
                  ),
                },
              ].map(({ label, value }) => (
                <div key={label} className="row" style={{
                  padding: '9px 16px', borderBottom: '1px solid var(--line-soft)',
                  gap: 12, alignItems: 'center',
                }}>
                  <dt style={{ color: 'var(--ink-muted)', fontSize: 13, minWidth: 110, flexShrink: 0, margin: 0 }}>{label}</dt>
                  <dd style={{ margin: 0, fontSize: 13 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Riwayat pembayaran ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Riwayat pembayaran</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: 'var(--surface-2)', color: 'var(--ink-muted)',
              }}>{payCount}</span>
            </div>
            {payCount === 0 ? (
              <div style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Icon name="inbox" size={28} style={{ color: 'var(--ink-faint)' }} />
                <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Belum ada pembayaran</div>
              </div>
            ) : (
              <div>
                {payments.map((p, idx) => (
                  <div key={p.id} className="row between" style={{
                    padding: '10px 16px',
                    borderBottom: idx < payments.length - 1 ? '1px solid var(--line-soft)' : 0,
                    gap: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{formatDate(p.createdAt)}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{p.account?.name ?? '—'}</div>
                    </div>
                    <div className="row tight">
                      <StatusBadge status={p.status} />
                      <Rp n={Number(p.amount)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Catat pembayaran form (inline) ── */}
          {showPayForm && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>{canManage ? 'Catat pembayaran' : 'Konfirmasi pembayaran'}</div>
              <div className="col" style={{ gap: 10 }}>
                <Field label="Akun penerima">
                  <InputWrap icon="wallet">
                    <select
                      value={payForm.accountId}
                      onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))}
                      style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', fontFamily: 'inherit' }}
                    >
                      <option value="">Pilih akun...</option>
                      {accounts.data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </InputWrap>
                </Field>
                <Field label="Nominal (Rp)">
                  <InputWrap>
                    <input
                      type="number"
                      placeholder={String(remaining)}
                      value={payForm.amount}
                      onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                      style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', fontFamily: 'var(--font-mono)', fontSize: 15 }}
                    />
                  </InputWrap>
                </Field>
                <Field label="Catatan (opsional)">
                  <InputWrap>
                    <input
                      placeholder="Cth. Transfer via BCA"
                      value={payForm.note}
                      onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                    />
                  </InputWrap>
                </Field>
                {/* File upload hidden for Hackathon to simplify testing */}
                <div className="row" style={{ gap: 8, marginTop: 2 }}>
                  <Btn variant="ghost" onClick={() => setShowPayForm(false)}>Batal</Btn>
                  <span className="spacer" />
                  <Btn
                    variant="primary"
                    icon="check"
                    data-testid="submit-payment-button"
                    onClick={handleSubmitPayment}
                    loading={submitPayment.isPending}
                  >
                    {canManage ? 'Simpan pembayaran' : 'Kirim konfirmasi'}
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}

function periodKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function periodDateFromKey(key: string): string | undefined {
  if (!key) return undefined;
  const [yearRaw, monthRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function currentPeriodKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function periodLabelFromPeriodKey(key: string): string {
  const [yearRaw, monthRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!year || !month) return key;

  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortDueDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function roleToneClass(roleName: string): string {
  const n = roleName.toLowerCase();
  if (n.includes('anggota') || n.includes('member')) return 'role-a';
  if (n.includes('pengurus') || n.includes('admin') || n.includes('owner')) return 'role-b';

  const tones = ['role-a', 'role-b', 'role-c', 'role-d', 'role-e'];
  const index = roleName.charCodeAt(0) % tones.length;
  return tones[index];
}

function escapeCsv(value: string): string {
  const safe = String(value ?? '');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

