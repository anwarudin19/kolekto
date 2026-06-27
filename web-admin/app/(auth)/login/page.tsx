'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@/hooks/useAuth';
import { normalizeApiError } from '@/lib/api';
import { pub } from '@/lib/pub';
import { Icon } from '@/components/icons/Icon';

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const login        = useLogin();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isLoading = login.isPending || isRedirecting;

  useEffect(() => {
    const flash = searchParams.get('flash');
    if (flash === 'forbidden') setError('Akses ditolak. Akun Anda tidak memiliki izin untuk masuk ke panel ini.');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ email, password });
      setIsRedirecting(true);
      router.replace('/dashboard');
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  };

  return (
    <div className="auth-layout">
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--bg)', opacity: 0.85,
            backdropFilter: 'blur(8px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src={pub('/icon-kolekto.png')} 
              alt="Loading" 
              style={{
                width: 52, height: 52,
                objectFit: 'contain',
                animation: 'spin 1s linear infinite',
                marginBottom: 16
              }} 
            />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {isRedirecting ? 'Menyiapkan ruang kerja...' : 'Memeriksa kredensial...'}
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html:`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes spin { to { transform: rotate(360deg) } }
          `}} />
        </div>
      )}

      {/* ── Left — Form panel ── */}
      <div className="auth-form-panel" style={{
        overflowY: 'auto',
      }}>
        {/* Back to Home */}
        <div style={{ marginBottom: 32 }}>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 6, 
              color: 'var(--ink-muted)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', transition: 'color .15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-muted)')}
          >
            <Icon name="arrow-left" size={14} />
            Kembali ke Home
          </Link>
        </div>

        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
            <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 26, objectFit: 'contain' }} />
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              Selamat datang kembali.
            </h1>
            <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 6 }}>
              Belum punya akun?{' '}
              <Link href="/register" style={{ color: 'var(--accent-ink)', fontWeight: 600, textDecoration: 'underline' }}>
                Daftar gratis
              </Link>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Email</label>
                <label className="input">
                  <Icon name="user" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                  <input
                    type="email"
                    placeholder="anda@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Password</label>
                <label className="input">
                  <Icon name="shield" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => setShowPw(!showPw)}
                    style={{ width: 28, height: 28, flexShrink: 0 }}
                    aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                    title={showPw ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={14} />
                  </button>
                </label>
              </div>

              {/* Remember + forgot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked />
                  <span>Ingat saya 14 hari</span>
                </label>
                <Link href="/forgot-password" style={{ color: 'var(--accent-ink)', fontWeight: 500 }}>
                  Lupa password?
                </Link>
              </div>

              {error && (
                <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 8 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                data-testid="login-button"
                style={{
                  marginTop: 8, width: '100%', padding: '13px 18px',
                  background: 'var(--ink)', color: 'var(--bg)',
                  border: 0, borderRadius: 12,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all .12s',
                }}
              >
                {isLoading ? 'Memproses...' : 'Masuk →'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ position: 'relative', margin: '28px 0', textAlign: 'center' }}>
              <div style={{ height: 1, background: 'var(--line)' }} />
              <span style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--bg-elev)', padding: '0 14px',
                fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '.08em', textTransform: 'uppercase',
              }}>Demo Accounts (Hackathon)</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button"
                onClick={() => {
                  setEmail('admin@demo.com');
                  setPassword('password123');
                }}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--bg-elev)', color: 'var(--ink)',
                  border: '1px solid var(--line)', borderRadius: 10,
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Use Admin
              </button>
              <button 
                type="button"
                onClick={() => {
                  setEmail('budi@demo.com');
                  setPassword('password123');
                }}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--bg-elev)', color: 'var(--ink)',
                  border: '1px solid var(--line)', borderRadius: 10,
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Use Member
              </button>
            </div>
          </div>
        </div>

        <div style={{ color: 'var(--ink-muted)', fontSize: 11.5, marginTop: 32, textAlign: 'center' }}>
          © 2026 Kolekto
        </div>
      </div>

      {/* ── Right — Brand panel ── */}
      <div className="auth-brand-panel" style={{
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', right: -120, top: -120, width: 480, height: 480, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -80, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'oklch(0.55 0.1 200)', opacity: 0.4, filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', maxWidth: 540 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
            Manajemen iuran tim
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, margin: 0 }}>
            Kas tim Anda,<br />
            <span style={{ color: 'var(--accent)' }}>transparan</span> dan teraudit.
          </h1>
          <div style={{ fontSize: 16, opacity: 0.75, marginTop: 18, lineHeight: 1.55 }}>
            Stop catat manual di spreadsheet. Generate invoice otomatis, terima bukti bayar, dan rekap kas — semua di satu tempat.
          </div>

          {/* Feature list */}
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { icon: 'sparkle' as const, label: 'Invoice otomatis tiap periode' },
              { icon: 'check'   as const, label: 'Approval workflow yang jelas' },
              { icon: 'shield'  as const, label: 'Audit log seluruh aktivitas' },
              { icon: 'wallet'  as const, label: 'Multi-akun: bank, tunai, e-wallet' },
            ].map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  background: 'rgba(205,154,44,0.2)', color: 'var(--accent)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={f.icon} size={13} />
                </div>
                <span style={{ fontSize: 13.5, opacity: 0.9 }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            marginTop: 48, padding: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.85, fontStyle: 'italic' }}>
              "Dari spreadsheet yang selalu bikin debat saat akhir periode, jadi 3 menit close-the-books tiap bulan."
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'var(--accent)', color: 'var(--teal-deep)',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 12,
              }}>RA</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Rina Arwana</div>
                <div style={{ fontSize: 11.5, opacity: 0.6 }}>Bendahara · Komunitas Photo Sleman</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.2-5 3.2-8.2z"/>
      <path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H1.9v2.9C3.6 20.4 7.5 23 12 23z"/>
      <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7H1.9c-.7 1.5-1 3.2-1 5s.4 3.5 1 5l3.9-3z"/>
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.5 4.2 1.6l3.2-3.2C17.6 2 14.9 1 12 1 7.5 1 3.6 3.6 1.9 7l3.9 3c.9-2.7 3.3-4.6 6.2-4.6z"/>
    </svg>
  );
}

