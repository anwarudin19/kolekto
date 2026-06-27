'use client';

import { useState } from 'react';
import { useActiveTeamId } from '@/hooks/useTeam';
import { useAccountBalances, useAccounts, useCreateAccount } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/app/providers';
import {
  Btn, IconBtn, Card, CardHead, Rp, Modal, Field, InputWrap, Empty,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate, formatRp } from '@/lib/utils';
import type { Account, Transaction } from '@/types';

const ACCOUNT_COLORS: Record<string, string> = {
  BANK: 'var(--ink)', CASH: 'var(--accent)', EWALLET: 'var(--info)',
};

export default function AccountsPage() {
  const teamId  = useActiveTeamId();
  const { push } = useToast();
  const accounts   = useAccounts(teamId);
  const allTxn     = useTransactions(teamId, { limit: 100 });
  const createAcct = useCreateAccount(teamId);

  const [acctFilter, setAcctFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openAdd, setOpenAdd]       = useState(false);
  const [form, setForm] = useState({ name: '', type: 'BANK', bankName: '', accountNumber: '' });

  const accountRows = accounts.data ?? [];
  const balanceQueries = useAccountBalances(teamId, accountRows);
  const acctList = accountRows.map((account, index) => ({
    ...account,
    balance: account.balance ?? balanceQueries[index]?.data?.balance ?? 0,
  }));
  const txnList  = (allTxn.data?.data ?? []).filter((t) => {
    if (acctFilter !== 'all' && t.accountId !== acctFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  const totalBalance = acctList.reduce((s, a) => s + (a.balance ?? 0), 0);

  const handleCreate = async () => {
    try {
      await createAcct.mutateAsync(form);
      push('Akun kas berhasil ditambahkan', 'success');
      setOpenAdd(false);
      setForm({ name: '', type: 'BANK', bankName: '', accountNumber: '' });
    } catch (e: any) { push(e?.message ?? 'Gagal tambah akun', 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Kas &amp; Transaksi</div>
          <h1>Akun kas</h1>
          <div className="subtitle">
            {acctList.length} akun · saldo total <span className="amt">Rp {formatRp(totalBalance)}</span>
          </div>
        </div>
        <div className="head-actions">
          <Btn icon="download">Export</Btn>
          <Btn icon="plus" variant="primary" onClick={() => setOpenAdd(true)}>Tambah akun</Btn>
        </div>
      </div>

      <div className="page-body col" style={{ gap: 18 }}>
        {accounts.isLoading && <div className="muted" style={{ fontSize: 13 }}>Memuat akun...</div>}

        {!accounts.isLoading && acctList.length === 0 && (
          <Empty icon="wallet" title="Belum ada akun kas"
            sub="Tambahkan rekening bank, kas tunai, atau e-wallet"
            action={<Btn icon="plus" variant="primary" onClick={() => setOpenAdd(true)}>Tambah akun</Btn>}
          />
        )}

        {acctList.length > 0 && (
          <>
            <div className="grid grid-3">
              {acctList.map((a) => (
                <AccountCard key={a.id} account={a}
                  transactions={allTxn.data?.data ?? []}
                  active={acctFilter === a.id}
                  onToggle={() => setAcctFilter(acctFilter === a.id ? 'all' : a.id)}
                />
              ))}
            </div>

            <Card>
              <CardHead
                title={acctFilter !== 'all'
                  ? `Mutasi · ${acctList.find((a) => a.id === acctFilter)?.name ?? ''}`
                  : 'Mutasi semua akun'}
                actions={
                  <div className="row tight">
                    {(['all', 'INCOME', 'EXPENSE'] as const).map((t) => (
                      <button key={t} className={`chip ${typeFilter === t ? 'active' : ''}`}
                        onClick={() => setTypeFilter(t)}
                        style={{ fontSize: 11.5, padding: '4px 10px' }}>
                        {t === 'all' ? 'Semua' : t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                      </button>
                    ))}
                  </div>
                }
              />
              {allTxn.isLoading ? (
                <div className="card-pad muted" style={{ fontSize: 13 }}>Memuat transaksi...</div>
              ) : txnList.length === 0 ? (
                <div className="card-pad">
                  <Empty icon="receipt" title="Tidak ada transaksi" sub="Belum ada mutasi" />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 18 }}>Tanggal</th>
                        <th>Keterangan</th>
                        <th>Akun</th>
                        <th>Tipe</th>
                        <th className="num">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txnList.map((t) => (
                        <TxnRow key={t.id} txn={t} accounts={acctList} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah akun kas"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn>
            <Btn variant="primary" icon="check" onClick={handleCreate} loading={createAcct.isPending}>
              Tambah
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Nama akun">
            <InputWrap>
              <input placeholder="Cth. Kas Utama BCA" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </InputWrap>
          </Field>
          <Field label="Tipe akun">
            <InputWrap icon="wallet">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }}>
                <option value="BANK">Bank</option>
                <option value="CASH">Kas tunai</option>
                <option value="EWALLET">E-Wallet</option>
              </select>
            </InputWrap>
          </Field>
          {form.type === 'BANK' && (
            <div className="grid grid-2">
              <Field label="Nama bank">
                <InputWrap icon="bank">
                  <input placeholder="BCA, BRI, Mandiri..." value={form.bankName}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
                </InputWrap>
              </Field>
              <Field label="Nomor rekening">
                <InputWrap>
                  <input placeholder="1234567890" value={form.accountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
                </InputWrap>
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function AccountCard({ account, transactions, active, onToggle }: {
  account: Account; transactions: Transaction[]; active: boolean; onToggle: () => void;
}) {
  const txns   = transactions.filter((t) => t.accountId === account.id);
  const inAmt  = txns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const outAmt = txns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', borderColor: active ? 'var(--accent)' : 'var(--line)', transition: 'border-color .15s' }}>
      <div className="card-pad col" style={{ gap: 14 }}>
        <div className="row between">
          <div className="row tight">
            <div className="avatar" style={{ background: ACCOUNT_COLORS[account.type] ?? 'var(--ink)', color: 'var(--bg)' }}>
              <Icon name={account.type === 'BANK' ? 'bank' : account.type === 'EWALLET' ? 'phone' : 'cash'} size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{account.name}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{account.type}{account.accountNumber ? ` · ${account.accountNumber}` : ''}</div>
            </div>
          </div>
          <IconBtn icon="settings" tip="Atur akun" />
        </div>
        <div>
          <div className="eyebrow" style={{ fontSize: 11, marginBottom: 2 }}>Saldo</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>
            Rp {formatRp(account.balance ?? 0)}
          </div>
        </div>
        <div className="row" style={{ gap: 12, fontSize: 11.5 }}>
          <div>
            <div className="muted">↓ Masuk</div>
            <div style={{ color: 'var(--ok)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>Rp {formatRp(inAmt)}</div>
          </div>
          <div>
            <div className="muted">↑ Keluar</div>
            <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>Rp {formatRp(outAmt)}</div>
          </div>
          <span className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={onToggle}>
            {active ? 'Tutup' : 'Filter'} <Icon name="chev" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TxnRow({ txn, accounts }: { txn: Transaction; accounts: Account[] }) {
  const acct     = accounts.find((a) => a.id === txn.accountId);
  const isIncome = txn.type === 'INCOME';
  return (
    <tr>
      <td style={{ paddingLeft: 18 }}><span className="mono muted">{formatDate(txn.createdAt)}</span></td>
      <td className="cell-strong">{txn.description ?? '—'}</td>
      <td>
        {acct && (
          <div className="row tight">
            <Icon name={acct.type === 'BANK' ? 'bank' : acct.type === 'EWALLET' ? 'phone' : 'cash'} size={13} style={{ color: 'var(--ink-muted)' }} />
            <span style={{ fontSize: 13 }}>{acct.name}</span>
          </div>
        )}
      </td>
      <td>
        <span className={`badge ${isIncome ? 'badge-ok' : 'badge-danger'} naked`}>
          {isIncome ? '↓ Pemasukan' : '↑ Pengeluaran'}
        </span>
      </td>
      <td className="num">
        <span style={{ color: isIncome ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {isIncome ? '+' : '−'} <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>Rp</span> {formatRp(txn.amount)}
        </span>
      </td>
    </tr>
  );
}
