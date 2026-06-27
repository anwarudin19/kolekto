'use client';

import { useState } from 'react';
import { useActiveTeamId, useTeams } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useAuth';
import { usePayments, useApprovePayment, useRejectPayment } from '@/hooks/usePayments';
import { useToast } from '@/app/providers';
import {
  Btn, Avatar, StatusBadge, Badge, Card, CardHead, Rp, Modal, Field, Empty,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate } from '@/lib/utils';
import { Pagination } from '@/components/shared/Pagination';
import type { ContributionPayment } from '@/types';

export default function ApprovalsPage() {
  const teamId = useActiveTeamId();
  const { push } = useToast();
  const user = useUser();
  const teams = useTeams();
  const currentTeam = (teams.data?.data ?? []).find((t) => t.id === teamId);
  const role = currentTeam?.userRole || user?.role;
  const canManage = role === 'OWNER' || role === 'ADMIN' || role === 'TREASURER' || role === 'SUPER_ADMIN';
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selected, setSelected]         = useState<ContributionPayment | null>(null);
  const [rejectNotes, setRejectNotes]   = useState('');
  const [rejectOpen, setRejectOpen]     = useState(false);

  const { data, isLoading } = usePayments(teamId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: pageSize,
    page,
  });
  const approve = useApprovePayment(teamId);
  const reject  = useRejectPayment(teamId);

  const payments    = data?.data ?? [];
  const total       = data?.meta?.total ?? 0;
  const totalPages  = Math.max(1, Math.ceil(total / pageSize));

  const handleApprove = async (p: ContributionPayment) => {
    try {
      await approve.mutateAsync({ paymentId: p.id });
      push('Pembayaran disetujui', 'success');
      setSelected(null);
    } catch (e: any) {
      push(e?.message ?? 'Gagal approve', 'error');
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await reject.mutateAsync({ paymentId: selected.id, notes: rejectNotes });
      push('Pembayaran ditolak', 'success');
      setSelected(null);
      setRejectOpen(false);
      setRejectNotes('');
    } catch (e: any) {
      push(e?.message ?? 'Gagal tolak', 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Verifikasi Pembayaran</div>
          <h1>Approval</h1>
          <div className="subtitle">
            {(data?.meta.total ?? 0)} pembayaran
            {statusFilter === 'PENDING' && ` menunggu persetujuan`}
          </div>
        </div>
      </div>

      <div className="page-tools">
        {['PENDING', 'APPROVED', 'REJECTED', 'all'].map((s) => (
          <button
            key={s}
            className={`chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === 'PENDING' ? 'Menunggu' : s === 'APPROVED' ? 'Disetujui' : s === 'REJECTED' ? 'Ditolak' : 'Semua'}
            {s === 'PENDING' && total > 0 && <span className="count">{total}</span>}
          </button>
        ))}
      </div>

      <div className="page-body">
        {isLoading && <div className="muted" style={{ fontSize: 13, padding: '24px 0' }}>Memuat...</div>}

        {!isLoading && payments.length === 0 && (
          <Empty
            icon="inbox"
            title="Tidak ada pembayaran"
            sub={statusFilter === 'PENDING' ? 'Semua pembayaran sudah diverifikasi' : 'Tidak ada data'}
          />
        )}

        {!isLoading && payments.length > 0 && (
          <>
            <div className="col tight" style={{ gap: 10 }}>
              {payments.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  onSelect={setSelected}
                  onApprove={handleApprove}
                  onReject={(p) => { setSelected(p); setRejectOpen(true); }}
                  approving={approve.isPending}
                  canManage={canManage}
                />
              ))}
            </div>
            <Pagination
              page={page} totalPages={totalPages} pageSize={pageSize} total={total}
              onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Tolak pembayaran"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setRejectOpen(false)}>Batal</Btn>
            <Btn variant="danger" icon="x" onClick={handleReject} loading={reject.isPending}>
              Tolak pembayaran
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 16 }}>
          {selected && (
            <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 12 }}>
              <div className="row tight">
                <Avatar name={selected.submittedBy?.fullName ?? '?'} size="sm" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.submittedBy?.fullName ?? '—'}</div>
                  <Rp n={selected.amount} />
                </div>
              </div>
            </div>
          )}
          <Field label="Alasan penolakan (opsional)">
            <label className="input" style={{ height: 'auto', padding: '10px 12px', alignItems: 'flex-start' }}>
              <textarea
                rows={3}
                placeholder="Tulis alasan penolakan..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                style={{ border: 0, outline: 0, background: 'transparent', width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </label>
          </Field>
        </div>
      </Modal>

      {/* Detail modal */}
      {selected && !rejectOpen && (
        <PaymentDetailModal
          payment={selected}
          onClose={() => setSelected(null)}
          onApprove={() => handleApprove(selected)}
          onReject={() => setRejectOpen(true)}
          approving={approve.isPending}
          canManage={canManage}
        />
      )}
    </>
  );
}

// ─── Payment card ─────────────────────────────────────────────────────────────
function PaymentCard({ payment, onSelect, onApprove, onReject, approving, canManage }: {
  payment: ContributionPayment;
  onSelect: (p: ContributionPayment) => void;
  onApprove: (p: ContributionPayment) => void;
  onReject: (p: ContributionPayment) => void;
  approving: boolean;
  canManage: boolean;
}) {
  const isPending = payment.status === 'PENDING';

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div className="row between">
        <div className="row tight" style={{ flex: 1, minWidth: 0 }}>
          <Avatar name={payment.submittedBy?.fullName ?? '?'} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{payment.submittedBy?.fullName ?? '—'}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {formatDate(payment.createdAt)} · via {payment.account?.name ?? '—'}
              {payment.invoice && (
                <> · <code>{payment.invoice.code}</code></>
              )}
            </div>
          </div>
        </div>

        <div className="row tight" data-testid="payment-status">
          <StatusBadge status={payment.status} />
          <Rp n={payment.amount} size={15} />
        </div>
      </div>

      {isPending && (
        <div className="row" style={{ marginTop: 14, gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
          <Btn size="sm" variant="ghost" onClick={() => onSelect(payment)}>
            <Icon name="eye" size={13} /> Lihat bukti
          </Btn>
          <span className="spacer" />
          {canManage && (
            <>
              <Btn size="sm" variant="ghost" className="btn-danger" icon="x" data-testid="reject-payment-button" onClick={() => onReject(payment)}>
                Tolak
              </Btn>
              <Btn size="sm" variant="primary" icon="check" data-testid="approve-payment-button" onClick={() => onApprove(payment)} loading={approving}>
                Approve
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function PaymentDetailModal({ payment, onClose, onApprove, onReject, approving, canManage }: {
  payment: ContributionPayment;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  canManage: boolean;
}) {
  const isPending = payment.status === 'PENDING';

  return (
    <Modal
      open
      onClose={onClose}
      title="Detail Pembayaran"
      footer={
        isPending && canManage ? (
          <>
            <Btn variant="ghost" className="btn-danger" icon="x" data-testid="reject-payment-button" onClick={onReject}>Tolak</Btn>
            <span className="spacer" />
            <Btn variant="primary" icon="check" data-testid="approve-payment-button" onClick={onApprove} loading={approving}>
              Approve pembayaran
            </Btn>
          </>
        ) : (
          <Btn variant="ghost" onClick={onClose}>Tutup</Btn>
        )
      }
    >
      <div className="col" style={{ gap: 20 }}>
        {/* Status */}
        <div className="row tight" data-testid="payment-status">
          <span className="muted" style={{ fontSize: 13 }}>Status:</span>
          <StatusBadge status={payment.status} />
        </div>

        {/* Amount */}
        <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 14 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Jumlah dibayarkan</div>
          <Rp n={payment.amount} size={28} />
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            via {payment.account?.name ?? '—'}
          </div>
        </div>

        {/* Proof */}
        {payment.proofUrl ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Bukti pembayaran</div>
            <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer">
              <div style={{
                width: '100%', aspectRatio: '4/3', background: 'var(--ink)',
                borderRadius: 12, display: 'grid', placeItems: 'center',
                cursor: 'pointer',
              }}>
                <div style={{ color: 'var(--bg)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="external" size={16} /> Lihat bukti
                </div>
              </div>
            </a>
          </div>
        ) : (
          <div style={{
            width: '100%', aspectRatio: '4/3', background: 'var(--surface-2)',
            borderRadius: 12, display: 'grid', placeItems: 'center',
            border: '1px dashed var(--line)', color: 'var(--ink-muted)', fontSize: 12,
          }}>
            Tidak ada bukti
          </div>
        )}

        {/* Info */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Informasi</div>
          <dl className="dl-grid" style={{ fontSize: 13.5, margin: 0 }}>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Pengirim</dt>
            <dd style={{ margin: 0, padding: '6px 0', fontWeight: 600 }}>{payment.submittedBy?.fullName ?? '—'}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Waktu</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{formatDate(payment.createdAt)}</dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Invoice</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>
              {payment.invoice ? <code>{payment.invoice.code}</code> : '—'}
            </dd>
            <dt style={{ color: 'var(--ink-muted)', padding: '6px 0' }}>Akun tujuan</dt>
            <dd style={{ margin: 0, padding: '6px 0' }}>{payment.account?.name ?? '—'}</dd>
          </dl>
        </div>
      </div>
    </Modal>
  );
}
