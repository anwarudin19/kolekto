'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { publicApi, normalizeApiError } from '@/lib/api';
import { pub } from '@/lib/pub';
import { Icon } from '@/components/icons/Icon';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const send = useMutation({
    mutationFn: async () => {
      await publicApi.post('/auth/forgot-password', { email });
    },
    onSuccess: () => setSent(true),
    onError: (e) => setError(normalizeApiError(e).message),
  });

  return (
    <div className="auth-layout">
      {/* Left */}
      <div className="auth-form-panel">
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
            <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 26, objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0, background: 'none', border: 0, color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              <Icon name="chev" size={14} style={{ transform: 'rotate(180deg)' }} /> Kembali ke login
            </button>

            {!sent ? (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Reset password.</h1>
                <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 6 }}>
                  Masukkan email akun Anda — kami akan kirimkan link reset.
                </div>

                <form onSubmit={e => { e.preventDefault(); setError(''); send.mutate(); }} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Email</label>
                    <label className="input">
                      <Icon name="user" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                      <input type="email" placeholder="anda@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                    </label>
                  </div>
                  {error && <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 8 }}>{error}</div>}
                  <button type="submit" disabled={send.isPending} style={{ width: '100%', padding: '13px 18px', background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    {send.isPending ? 'Mengirim...' : 'Kirim link reset'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ok-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                  <Icon name="check" size={28} style={{ color: 'var(--ok)' }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Cek email Anda.</h1>
                <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.55, maxWidth: 320, marginInline: 'auto' }}>
                  Kami baru saja mengirim link reset ke <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Link berlaku 1 jam.
                </div>
                <button onClick={() => { setSent(false); setEmail(''); }} style={{ marginTop: 18, padding: '8px 16px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-soft)' }}>
                  Tidak menerima? Kirim ulang
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ color: 'var(--ink-muted)', fontSize: 11.5, marginTop: 32, textAlign: 'center' }}>
          © 2026 Kolekto · Manajemen Iuran Tim
        </div>
      </div>

      {/* Right */}
      <div className="auth-brand-panel" style={{
      }}>
        <div style={{ position: 'absolute', right: -120, top: -120, width: 480, height: 480, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', maxWidth: 540 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>Keamanan akun</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, margin: 0 }}>
            Akun Anda<br/>dilindungi penuh.
          </h1>
          <div style={{ fontSize: 15, opacity: 0.75, marginTop: 18, lineHeight: 1.55 }}>
            Link reset password hanya berlaku 1 jam dan satu kali pakai. Jika Anda tidak meminta reset, abaikan email tersebut — akun Anda aman.
          </div>
        </div>
      </div>
    </div>
  );
}
