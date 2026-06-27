'use client';

import { Icon } from '@/components/icons/Icon';

type Action = 'reminder' | 'duedate' | 'export' | 'cancel';

type Props = {
  count: number;
  onClear: () => void;
  onAction: (action: Action) => void;
};

export function BulkActionsBar({ count, onClear, onAction }: Props) {
  if (count === 0) return null;

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 18, padding: '10px 12px 10px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 60,
        animation: 'slide-up .2s cubic-bezier(.3,.7,.4,1)',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ background: 'var(--accent)', color: 'var(--ink)', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
          {count} dipilih
        </div>
        <div style={{ height: 22, width: 1, background: 'rgba(255,255,255,0.15)' }} />

        {([
          { action: 'reminder', icon: 'bell', label: 'Kirim reminder' },
          { action: 'duedate', icon: 'calendar', label: 'Ubah jatuh tempo' },
          { action: 'export', icon: 'download', label: 'Export' },
        ] as const).map(b => (
          <button key={b.action} onClick={() => onAction(b.action)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 10,
            background: 'transparent', color: 'var(--bg)',
            border: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name={b.icon} size={14} />
            <span className="bulk-label">{b.label}</span>
          </button>
        ))}

        <button onClick={() => onAction('cancel')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 10,
          background: 'transparent', color: 'oklch(0.8 0.15 25)',
          border: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(0.35 0.18 25)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name="x" size={14} /> <span className="bulk-label">Batalkan</span>
        </button>

        <div style={{ height: 22, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <button onClick={onClear} style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'transparent', color: 'var(--bg)',
          border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translate(-50%, 12px); } }
        @media (max-width: 700px) { .bulk-label { display: none; } }
      `}</style>
    </>
  );
}
