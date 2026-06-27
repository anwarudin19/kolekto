'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

type Props = {
  open: boolean;
  onStay: () => Promise<void> | void;
  onLogout: () => void;
  seconds?: number;
};

export function SessionTimeoutModal({ open, onStay, onLogout, seconds = 60 }: Props) {
  const [left, setLeft] = useState(seconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onLogoutRef = useRef(onLogout);
  const didExpireRef = useRef(false);

  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  const handleStay = useCallback(async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onStay();
    } catch {
      setError('Gagal memperbarui sesi. Silakan keluar dan masuk kembali.');
    } finally {
      setBusy(false);
    }
  }, [busy, onStay]);

  useEffect(() => {
    if (!open) return;
    didExpireRef.current = false;
    setLeft(seconds);
    setError(null);
    const timer = window.setInterval(() => {
      setLeft((current) => {
        if (current <= 0) return 0;
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, seconds]);

  useEffect(() => {
    if (!open || left > 0 || didExpireRef.current) return;
    didExpireRef.current = true;
    onLogoutRef.current();
  }, [open, left]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void handleStay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleStay]);

  if (!open) return null;

  const pct = (left / seconds) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(5, 50, 53, 0.55)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        animation: 'kolekto-fade-in .15s ease',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 22,
          padding: 0,
          maxWidth: 440,
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          animation: 'kolekto-pop-in .15s cubic-bezier(.3,.7,.4,1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '28px 28px 22px',
            textAlign: 'center',
            position: 'relative',
            background: 'linear-gradient(180deg, var(--accent-soft), transparent)',
          }}
        >
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 14px' }}>
            <svg viewBox="0 0 100 100" width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={left <= 10 ? 'var(--danger)' : 'var(--accent)'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke .2s' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: left <= 10 ? 'var(--danger)' : 'var(--ink)',
              }}
            >
              {mm}:{ss}
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--warn-soft)',
              color: 'oklch(0.45 0.13 78)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: 'currentColor',
                animation: 'kolekto-pulse 1.4s ease-in-out infinite',
              }}
            />
            Sesi akan berakhir
          </div>

          <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 6px' }}>
            Masih di sini?
          </h3>

          <p
            style={{
              fontSize: 14,
              color: 'var(--ink-soft)',
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 360,
              marginInline: 'auto',
            }}
          >
            Demi keamanan, Anda akan otomatis logout dalam <b style={{ color: 'var(--ink)' }}>{left} detik</b> karena tidak ada aktivitas.
          </p>

          {error && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--danger)', lineHeight: 1.45 }}>
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '18px 22px 22px',
            borderTop: '1px solid var(--line-soft)',
          }}
        >
          <button
            onClick={onLogout}
            disabled={busy}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: 'transparent',
              color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            Logout sekarang
          </button>
          <button
            onClick={() => void handleStay()}
            disabled={busy}
            style={{
              flex: 2,
              padding: '12px 14px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 0,
              borderRadius: 12,
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: 14,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.85 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check size={14} />
            {busy ? 'Memperbarui...' : 'Tetap login'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes kolekto-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes kolekto-pop-in {
          from { transform: scale(0.98); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes kolekto-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.6); }
        }
      `}</style>
    </div>
  );
}
