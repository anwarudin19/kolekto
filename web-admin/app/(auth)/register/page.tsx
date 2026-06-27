'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pub } from '@/lib/pub';
import { useMutation } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { setStoredAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import type { AuthSession } from '@/types';
import { passwordStrength } from '@/lib/utils';
import { Icon } from '@/components/icons/Icon';

export default function RegisterPage() {
  const router = useRouter();
  const [data, setData] = useState({ fullName: '', email: '', password: '', agree: true });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const strength = data.password ? passwordStrength(data.password) : null;

  const register = useMutation({
    mutationFn: async (payload: { fullName: string; email: string; password: string }) => {
      const res = await publicApi.post<AuthSession>('/auth/register', payload);
      return res.data;
    },
    onSuccess: (session) => {
      setStoredAuth(session);
      queryClient.setQueryData(['auth', 'session'], session);
      router.replace('/dashboard');
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const msg    = e?.response?.data?.message;
      if (status === 409) {
        setError('Email sudah terdaftar. Silakan masuk atau gunakan email lain.');
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Gagal mendaftar. Silakan coba lagi.');
      }
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    register.mutate({ fullName: data.fullName, email: data.email, password: data.password });
  };

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
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Daftar akun baru.</h1>
            <div style={{ color: 'var(--ink-muted)', fontSize: 14, marginTop: 6 }}>
              14 hari trial gratis · tanpa kartu kredit ·{' '}
              <Link href="/login" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>masuk</Link>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
              <div className="field">
                <label className="field-label">Nama lengkap</label>
                <label className="input">
                  <Icon name="user" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                  <input placeholder="Andini Pratama" value={data.fullName} onChange={e => setData(d => ({ ...d, fullName: e.target.value }))} required />
                </label>
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <label className="input">
                  <Icon name="user" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                  <input type="email" placeholder="anda@email.com" value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} required autoComplete="email" />
                </label>
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <label className="field-help">{strength ? `Kekuatan: ${strength.label}` : 'Min. 8 karakter, kombinasi huruf + angka'}</label>
                <label className="input">
                  <Icon name="shield" size={15} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                  <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={data.password} onChange={e => setData(d => ({ ...d, password: e.target.value }))} required autoComplete="new-password" />
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
                {data.password && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: strength && i < strength.level ? strength.color : 'var(--line)', transition: 'background .2s' }} />
                    ))}
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5 }}>
                <input type="checkbox" checked={data.agree} onChange={e => setData(d => ({ ...d, agree: e.target.checked }))} />
                <span>Saya setuju dengan <a href="#" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Syarat Layanan</a> dan <a href="#" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Kebijakan Privasi</a>.</span>
              </label>

              {error && <div style={{ fontSize: 12.5, color: 'var(--danger)', padding: '8px 12px', background: 'var(--danger-soft)', borderRadius: 8 }}>{error}</div>}

              <button type="submit" disabled={!data.agree || register.isPending} style={{
                marginTop: 4, width: '100%', padding: '13px 18px',
                background: 'var(--ink)', color: 'var(--bg)', border: 0, borderRadius: 12,
                fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: !data.agree ? 0.5 : 1,
              }}>
                {register.isPending ? 'Membuat akun...' : 'Buat akun · Mulai trial →'}
              </button>
            </form>
          </div>
        </div>

        <div style={{ color: 'var(--ink-muted)', fontSize: 11.5, marginTop: 32, textAlign: 'center' }}>
          © 2026 Kolekto · Manajemen Iuran Tim
        </div>
      </div>

      {/* Right — brand panel, hidden on mobile */}
      <div className="auth-brand-panel">
        <div style={{ position: 'absolute', right: -120, top: -120, width: 480, height: 480, borderRadius: '50%', background: 'var(--accent)', opacity: 0.15, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', maxWidth: 540 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>Gratis 14 hari</div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, margin: 0 }}>
            Mulai kelola kas tim<br/><span style={{ color: 'var(--accent)' }}>dalam 10 menit.</span>
          </h1>
          <div style={{ fontSize: 16, opacity: 0.75, marginTop: 18, lineHeight: 1.55 }}>
            Setup tim, undang anggota, dan generate invoice pertama Anda — semua sebelum kopi Anda dingin.
          </div>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Tanpa kartu kredit — bayar setelah puas','Setup &lt; 10 menit, undang via link','Batalkan kapan saja, data bisa diunduh'].map((t,i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(205,154,44,.2)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="check" size={12} />
                </div>
                <span style={{ fontSize: 14, opacity: 0.9 }} dangerouslySetInnerHTML={{ __html: t }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
