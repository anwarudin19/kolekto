'use client';

import { useState, useRef } from 'react';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions, useCreateExpense } from '@/hooks/useTransactions';
import { useToast } from '@/app/providers';
import {
  Btn, Badge, Card, Modal, Field, InputWrap, Empty, StatusBadge,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate, formatRp } from '@/lib/utils';
import { Pagination } from '@/components/shared/Pagination';
import type { Transaction } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  CONTRIBUTION: 'Iuran', DONATION: 'Donasi',
  MANUAL_INCOME: 'Manual', MANUAL_EXPENSE: 'Manual',
};

export default function TransactionsPage() {
  const teamId  = useActiveTeamId();
  const { push } = useToast();
  const accounts    = useAccounts(teamId);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [openExpense, setOpenExpense] = useState(false);
  const createExpense = useCreateExpense(teamId);

  const { data, isLoading } = useTransactions(teamId, {
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 50,
  });

  const txns      = data?.data ?? [];
  const total     = data?.meta.total ?? 0;
  const totalAmount = data?.meta.totalAmount;
  const totalPages  = Math.max(1, Math.ceil(txns.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pagedTxns   = txns.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Expense form state
  const [expForm, setExpForm] = useState({ accountId: '', amount: '', description: '', date: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExpense = async () => {
    try {
      const fd = new FormData();
      fd.append('accountId', expForm.accountId);
      fd.append('amount', expForm.amount);
      fd.append('description', expForm.description);
      if (expForm.date) fd.append('date', expForm.date);
      const files = fileRef.current?.files;
      if (files) for (const f of Array.from(files)) fd.append('proof', f);
      await createExpense.mutateAsync(fd);
      push('Pengeluaran berhasil dicatat', 'success');
      setOpenExpense(false);
      setExpForm({ accountId: '', amount: '', description: '', date: '' });
    } catch (e: any) { push(e?.message ?? 'Gagal catat pengeluaran', 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Riwayat Transaksi</div>
          <h1>Transaksi</h1>
          <div className="subtitle">
            {total} transaksi
            {totalAmount != null && <> · total <span className="amt">Rp {formatRp(totalAmount)}</span></>}
          </div>
        </div>
        <div className="head-actions">
          <Btn icon="download">Export CSV</Btn>
          <Btn icon="minus" variant="primary" onClick={() => setOpenExpense(true)}>
            Catat pengeluaran
          </Btn>
        </div>
      </div>

      <div className="page-tools">
        {['all', 'INCOME', 'EXPENSE'].map((t) => (
          <button key={t} className={`chip ${typeFilter === t ? 'active' : ''}`}
            onClick={() => { setTypeFilter(t); setPage(1); }}>
            {t === 'all' ? 'Semua' : t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      <div className="page-body">
        {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat...</div>}

        {!isLoading && txns.length === 0 && (
          <Empty icon="receipt" title="Tidak ada transaksi" sub="Belum ada riwayat mutasi pada tim ini" />
        )}

        {!isLoading && txns.length > 0 && (
          <>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Akun</th>
                    <th>Sumber</th>
                    <th>Kategori</th>
                    <th>Tipe</th>
                    <th className="num">Nominal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTxns.map((t) => (
                    <TxnTableRow key={t.id} txn={t} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={safePage} totalPages={totalPages} pageSize={pageSize} total={txns.length}
              onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Expense modal */}
      <Modal open={openExpense} onClose={() => setOpenExpense(false)} title="Catat pengeluaran"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenExpense(false)}>Batal</Btn>
            <Btn variant="primary" icon="check" onClick={handleExpense} loading={createExpense.isPending}>
              Simpan
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <div className="grid grid-2">
            <Field label="Akun kas">
              <InputWrap icon="wallet">
                <select value={expForm.accountId}
                  onChange={(e) => setExpForm((f) => ({ ...f, accountId: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}>
                  <option value="">Pilih akun...</option>
                  {accounts.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </InputWrap>
            </Field>
            <Field label="Tanggal">
              <InputWrap icon="calendar">
                <input type="date" value={expForm.date}
                  onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }} />
              </InputWrap>
            </Field>
          </div>

          <Field label="Nominal">
            <InputWrap>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 500, fontSize: 14, flexShrink: 0 }}>Rp</span>
              <input type="number" placeholder="0" value={expForm.amount}
                onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 15 }} />
            </InputWrap>
          </Field>

          <Field label="Keterangan">
            <InputWrap>
              <input placeholder="Cth. Konsumsi rapat mingguan" value={expForm.description}
                onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
            </InputWrap>
          </Field>

          <Field label="Bukti pengeluaran (opsional)" help="JPG, PNG, atau PDF. Maks. 3 file.">
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '24px 16px',
                background: 'var(--surface-2)',
                border: '1.5px dashed var(--line)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer', color: 'var(--ink-muted)', fontSize: 13,
              }}
            >
              <Icon name="upload" size={18} />
              <span>Klik atau drag untuk unggah</span>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function TxnTableRow({ txn }: { txn: Transaction }) {
  const isIncome = txn.type === 'INCOME';
  return (
    <tr className="clickable">
      <td style={{ paddingLeft: 18 }}>
        <span className="mono muted" style={{ fontSize: 12 }}>{formatDate(txn.createdAt)}</span>
      </td>
      <td className="cell-strong">{txn.description ?? '—'}</td>
      <td>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{txn.account?.name ?? '—'}</span>
      </td>
      <td>
        <span className="badge badge-mute naked" style={{ fontSize: 11 }}>
          {SOURCE_LABELS[txn.source] ?? txn.source}
        </span>
      </td>
      <td>
        {txn.category ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: txn.category.color ?? 'var(--ink-faint)' }} />
            {txn.category.name}
          </span>
        ) : <span className="muted">—</span>}
      </td>
      <td>
        <span className={`badge ${isIncome ? 'badge-ok' : 'badge-danger'} naked`}>
          {isIncome ? '↓ Masuk' : '↑ Keluar'}
        </span>
      </td>
      <td className="num">
        <span style={{ color: isIncome ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {isIncome ? '+' : '−'} <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>Rp</span> {formatRp(txn.amount)}
        </span>
      </td>
      <td>
        <button className="iconbtn"><Icon name="chev" size={14} /></button>
      </td>
    </tr>
  );
}
