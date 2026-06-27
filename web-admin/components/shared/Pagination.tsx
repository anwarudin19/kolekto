'use client';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export function Pagination({ page, totalPages, pageSize, total, onPage, onPageSize }: {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="row between" style={{ padding: '10px 4px', gap: 12, flexWrap: 'wrap' }}>
      <div className="row tight" style={{ gap: 6 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Baris per halaman:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          style={{
            fontFamily: 'inherit', fontSize: 12.5, border: '1px solid var(--line)',
            borderRadius: 8, padding: '3px 8px', background: 'var(--surface)', color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {from}–{to} dari {total}
        </span>
      </div>

      <div className="row tight" style={{ gap: 4 }}>
        <PageBtn label="‹" onClick={() => onPage(page - 1)} disabled={page <= 1} />
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`gap-${i}`} style={{ padding: '0 4px', color: 'var(--ink-muted)', fontSize: 13 }}>…</span>
          ) : (
            <PageBtn key={`page-${p}`} label={String(p)} onClick={() => onPage(Number(p))} active={p === page} />
          )
        )}
        <PageBtn label="›" onClick={() => onPage(page + 1)} disabled={page >= totalPages} />
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 8px',
        borderRadius: 8, border: '1px solid',
        borderColor: active ? 'var(--accent)' : 'var(--line)',
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? 'var(--accent-ink)' : disabled ? 'var(--ink-faint)' : 'var(--ink)',
        fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .1s',
      }}
    >
      {label}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) pages.push('...');
  add(total);
  return pages;
}
