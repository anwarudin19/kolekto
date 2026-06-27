'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { publicApi, normalizeApiError } from '@/lib/api';
import { pub } from '@/lib/pub';
import { Icon } from '@/components/icons/Icon';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientError, setClientError] = useState('');
  const [done, setDone] = useState(false);

  const reset = useMutation({
    mutationFn: async () => {
      await publicApi.post('/auth/reset-password', { token, newPassword });
    },
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    },
    onError: (e) => setClientError(normalizeApiError(e).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    if (newPassword !== confirmPassword) {
      setClientError('Konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setClientError('Password minimal 6 karakter.');
      return;
    }
    reset.mutate();
  };

  const error = clientError || (reset.error ? normalizeApiError(reset.error).message : '');

  return (
    <div className="auth-layout">
      {/* ── Left — Form panel ── */}
      <div className="auth-form-panel">
        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
            <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 26, objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <button
              onClick={() => router.push('/login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0, background: 'none', border: 0, color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
            >
              <Icon name="chev" size={14} style={{ transform: 'rotate(180deg)' }} /> Kembali ke login
            </button>

            {!token && !done && (
              <div style={{ padding: '16px 20px', background: 'var(--warn-soft)', borderRadius: 12, fontSize: 13.5, color: 'var(--warn)', lineHeight: 1.55 }}>
                Link tidak valid. Gunakan link dari email reset password Anda.
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => router.push('/forgot-password')}
                    style={{ background: 'none', border: 0, padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Minta link baru →
                  </button>
                </div>
              </div>
            )}

            {token && !done && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Buat password baru.</h1>
                <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 6, marginBottom: 28 }}>
                  Masukkan password baru untuk akun Anda.
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Password baru */}
                  <div className="field">
                    <label className="field-label">Password Baru</label>
                    <label className="input">
                      <Icon name="lock" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                      <input
                        type={showNew ? 'text' : 'password'}
                        placeholder="Min. 6 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((p) => !p)}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <Icon name={showNew ? 'eye-off' : 'eye'} size={15} />
                      </button>
                    </label>
                  </div>

                  {/* Konfirmasi password */}
                  <div className="field">
                    <label className="field-label">Konfirmasi Password</label>
                    <label className="input">
                      <Icon name="lock" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Ulangi password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <Icon name={showConfirm ? 'eye-off' : 'eye'} size={15} />
                      </button>
                    </label>
                  </div>

                  {error && (
                    <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 8 }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reset.isPending}
                    style={{ width: '100%', padding: '13px 18px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: reset.isPending ? 0.7 : 1 }}
                  >
                    {reset.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
                  </button>
                </form>
              </>
            )}

            {done && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ok-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                  <Icon name="check" size={28} style={{ color: 'var(--ok)' }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Password berhasil direset.</h1>
                <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.55, maxWidth: 320, marginInline: 'auto' }}>
                  Anda akan diarahkan ke halaman login dalam beberapa detik.
                </div>
                <button
                  onClick={() => router.replace('/login')}
                  style={{ marginTop: 18, padding: '11px 20px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }}
                >
                  Login Sekarang →
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ color: 'var(--ink-muted)', fontSize: 11.5, marginTop: 32, textAlign: 'center' }}>
          © 2026 Kolekto · Manajemen Iuran Tim
        </div>
      </div>

      {/* ── Right — Branding panel ── */}
      <div className="auth-brand-panel" style={{
      }}>
        <div style={{ position: 'absolute', right: -120, top: -120, width: 480, height: 480, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', maxWidth: 540 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>Keamanan akun</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, margin: 0 }}>
            Buat password<br />yang kuat.
          </h1>
          <div style={{ fontSize: 15, opacity: 0.75, marginTop: 18, lineHeight: 1.55 }}>
            Gunakan kombinasi huruf besar, kecil, angka, dan simbol. Password Anda dienkripsi — bahkan kami tidak bisa membacanya.
          </div>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Link reset hanya berlaku 1 jam', 'Satu kali pakai & otomatis kedaluwarsa', 'Password dienkripsi dengan bcrypt'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, opacity: 0.85 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="check" size={11} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Memuat...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
