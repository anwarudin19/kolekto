'use client';

import { Badge, Rp } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';

export default function MemberViewPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Simulasi Tampilan</div>
          <h1>Tampilan Anggota</h1>
          <div className="subtitle">Begini tampilan yang dilihat anggota tim di perangkat mobile mereka.</div>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              Preview — Anggota melihat ini
            </div>
          </div>

          {/* Phone frame */}
          <div className="phone">
            <div className="phone-screen">
              {/* Status bar */}
              <div style={{ height: 44, flexShrink: 0 }} />

              {/* Header */}
              <div style={{ padding: '0 20px 16px', background: 'linear-gradient(180deg, var(--teal-deep), var(--teal))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Tim Meridian</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 20, marginTop: 2 }}>Halo, Budi.</div>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--accent)', color: 'var(--teal-deep)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>BS</div>
                </div>

                {/* Tagihan aktif card */}
                <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,.15)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600 }}>TAGIHAN AKTIF</div>
                      <div style={{ color: 'white', fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, marginTop: 4 }}>Rp 50.000</div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11.5, marginTop: 2 }}>Jatuh tempo 10 Jun 2026</div>
                    </div>
                    <span className="badge badge-warn">Belum Bayar</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
                    <div style={{ width: '33%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>
                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
                  {[
                    { icon: 'upload', label: 'Upload Bukti' },
                    { icon: 'receipt', label: 'Tagihan Saya' },
                    { icon: 'history', label: 'Riwayat' },
                  ].map(a => (
                    <div key={a.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal-soft)', color: 'var(--teal)', display: 'grid', placeItems: 'center', margin: '0 auto 8px' }}>
                        <Icon name={a.icon as any} size={18} />
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{a.label}</div>
                    </div>
                  ))}
                </div>

                {/* Riwayat */}
                <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Riwayat iuran</span>
                    <span className="badge badge-mute naked">6 bulan</span>
                  </div>
                  {[
                    { p: 'Mei 2026', amt: 50000, status: 'UNPAID' },
                    { p: 'Apr 2026', amt: 50000, status: 'PAID' },
                    { p: 'Mar 2026', amt: 50000, status: 'PAID' },
                    { p: 'Feb 2026', amt: 50000, status: 'PAID' },
                  ].map(r => (
                    <div key={r.p} style={{ padding: '11px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span>Iuran {r.p}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rp 50.000</span>
                        <span className={`badge ${r.status === 'PAID' ? 'badge-ok' : 'badge-warn'}`}>
                          {r.status === 'PAID' ? 'Lunas' : 'Belum'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom nav */}
              <div style={{ height: 64, background: 'var(--bg-elev)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', flexShrink: 0 }}>
                {[
                  { icon: 'dashboard', label: 'Beranda', active: true },
                  { icon: 'receipt', label: 'Tagihan' },
                  { icon: 'upload', label: 'Bayar' },
                  { icon: 'user', label: 'Profil' },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', borderRadius: 10, background: n.active ? 'var(--accent-soft)' : 'transparent' }}>
                    <Icon name={n.icon as any} size={20} style={{ color: n.active ? 'var(--accent)' : 'var(--ink-muted)' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: n.active ? 'var(--accent-ink)' : 'var(--ink-muted)' }}>{n.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ink-muted)' }}>
            Tampilan ini adalah simulasi — mobile app sedang dalam pengembangan.
          </div>
        </div>
      </div>
    </>
  );
}
