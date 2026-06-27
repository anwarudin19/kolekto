'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pub } from '@/lib/pub';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui';
import { formatRp } from '@/lib/utils';

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
      <LandingNav menuOpen={menuOpen} onToggle={() => setMenuOpen(v => !v)} />
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
      <LandingHero />
      <LandingTrust />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingDashShowcase />
      <LandingPricing />
      <LandingTestimonials />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}

const NAV_LINKS = [
  { href: '#fitur',      label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara kerja' },
  { href: '#harga',      label: 'Harga' },
  { href: '#testimoni',  label: 'Testimoni' },
  { href: '#faq',        label: 'FAQ' },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────
function LandingNav({ menuOpen, onToggle }: { menuOpen: boolean; onToggle: () => void }) {
  const router = useRouter();
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--line-soft)',
    }}>
      <div className="l-nav-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 22, objectFit: 'contain' }} />
        </div>

        <nav className="l-nav-links" style={{ display: 'flex', gap: 22, fontSize: 13.5, color: 'var(--ink-soft)', marginLeft: 16 }}>
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href} href={href}
              style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >{label}</a>
          ))}
        </nav>

        <span style={{ flex: 1 }} />

        <button className="l-nav-masuk" onClick={() => router.push('/login')}
          style={{ background: 'transparent', border: 0, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}>
          Masuk
        </button>
        <button onClick={() => router.push('/login')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, flexShrink: 0, background: 'var(--ink)', color: 'var(--bg)', border: 0, fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Mulai gratis <Icon name="chev" size={14} />
        </button>

        <button className="l-nav-burger" onClick={onToggle} aria-label="Menu"
          style={{ background: menuOpen ? 'var(--surface-2)' : 'transparent', border: '1px solid var(--line)', borderRadius: 9, padding: '6px 8px', cursor: 'pointer', color: 'var(--ink)', flexShrink: 0, display: 'none', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}>
          <Icon name={menuOpen ? 'x' : 'menu'} size={18} />
        </button>
      </div>
    </header>
  );
}

// ─── Mobile menu — rendered OUTSIDE <header> to avoid backdrop-filter containment ──
function MobileMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => onClose();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onClose]);

  const go = (path: string) => { router.push(path); onClose(); };

  return (
    <>
      {/* Scrim */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, top: 57, zIndex: 48,
        background: 'rgba(0,0,0,0.35)',
        animation: 'fade-in .15s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 57, left: 0, right: 0, zIndex: 49,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line-soft)',
        boxShadow: '0 16px 48px -12px rgba(0,0,0,.25)',
        animation: 'slide-down .18s ease',
        padding: '8px 16px 20px',
      }}>
        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href}
              onClick={(e) => {
                e.preventDefault();
                onClose();
                const id = href.replace('#', '');
                setTimeout(() => {
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
              }}
              style={{
                display: 'block', padding: '13px 12px', borderRadius: 10,
                fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 0 14px' }} />

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => go('/login')} style={{
            width: '100%', padding: '13px', borderRadius: 12,
            background: 'var(--ink)', color: 'var(--bg)',
            border: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            Mulai gratis <Icon name="chev" size={15} />
          </button>
          <button onClick={() => go('/login')} style={{
            width: '100%', padding: '13px', borderRadius: 12,
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            Masuk
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function LandingHero() {
  const router = useRouter();
  return (
    <section className="l-section" style={{ position: 'relative', overflow: 'hidden', padding: '80px 32px 100px' }}>
      <div style={{ position: 'absolute', right: -100, top: -100, width: 480, height: 480, borderRadius: '50%', background: 'var(--accent)', opacity: 0.08, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -150, top: 100, width: 380, height: 380, borderRadius: '50%', background: 'var(--teal)', opacity: 0.08, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <a href="#fitur" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px 5px 6px', borderRadius: 999,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          fontSize: 12.5, fontWeight: 500, color: 'var(--ink-soft)',
          textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Baru</span>
          Reminder otomatis H-3, H-1, dan overdue <Icon name="chev" size={12} />
        </a>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '24px auto 0', maxWidth: 880 }}>
          Kas tim Anda,{' '}
          <span style={{ color: 'var(--teal)' }}>transparan</span>
          <br />
          dan{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.12 60))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            teraudit otomatis.
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(14px, 2.2vw, 18px)', color: 'var(--ink-soft)', lineHeight: 1.6, margin: '20px auto 0', maxWidth: 600 }}>
          Berhenti catat iuran di spreadsheet atau grup chat. Kolekto generate invoice otomatis,
          terima bukti bayar, dan rekap kas — semua jejaknya tercatat rapi.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/login')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 22px', borderRadius: 14, background: 'var(--ink)', color: 'var(--bg)', border: 0, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Coba gratis 14 hari <Icon name="chev" size={16} />
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 22px', borderRadius: 14, background: 'var(--bg-elev)', color: 'var(--ink)', border: '1px solid var(--line)', fontFamily: 'inherit', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            <Icon name="phone" size={16} /> Lihat demo
          </button>
        </div>

        <div style={{ color: 'var(--ink-muted)', fontSize: 12.5, marginTop: 14 }}>
          Tanpa kartu kredit · Setup &lt; 10 menit · Hingga 100 anggota
        </div>

        <HeroDashMock />
      </div>
    </section>
  );
}

function HeroDashMock() {
  return (
    <div className="l-mock" style={{ marginTop: 56, position: 'relative', maxWidth: 1000, marginInline: 'auto' }}>
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 20, boxShadow: '0 30px 80px -30px rgba(5,50,53,.4)', overflow: 'hidden', textAlign: 'left' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line-soft)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'oklch(0.78 0.16 25)' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'oklch(0.82 0.14 78)' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'oklch(0.78 0.13 145)' }} />
          <span style={{ marginLeft: 14, padding: '3px 10px', borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
            kolekto.id/dashboard
          </span>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20 }}>
          <div style={{ width: 180, padding: 8, borderRight: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
              <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 14, objectFit: 'contain' }} />
            </div>
            {['Dashboard', 'Invoice', 'Approval', 'Anggota', 'Laporan'].map((n, i) => (
              <div key={n} style={{ padding: '7px 10px', borderRadius: 8, background: i === 0 ? 'var(--bg-elev)' : 'transparent', border: i === 0 ? '1px solid var(--line)' : '1px solid transparent', fontSize: 12.5, color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)', marginBottom: 2, fontWeight: i === 0 ? 600 : 500 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: i === 0 ? 'var(--accent)' : 'var(--ink-faint)', marginRight: 8 }} />
                {n}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Tim Meridian · Mei 2026</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>Halo, Andini.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--ink)', color: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--accent)', opacity: 0.4, filter: 'blur(28px)' }} />
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: '.06em', textTransform: 'uppercase', position: 'relative' }}>Saldo kas</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em', position: 'relative' }}>Rp 10.450K</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, position: 'relative' }}><span style={{ color: 'oklch(0.8 0.15 130)' }}>↑ 12%</span> vs April</div>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Tepat waktu</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}>10<span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>/12</span></div>
                <div style={{ fontSize: 10, color: 'var(--ok)', marginTop: 2 }}>83% kepatuhan</div>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Pending</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em' }}>3</div>
                <div style={{ fontSize: 10, color: 'var(--accent-ink)', marginTop: 2 }}>Bukti bayar baru</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Status iuran Mei</div>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2, background: 'var(--surface)' }}>
                <div style={{ width: '67%', background: 'var(--ok)' }} />
                <div style={{ width: '8%',  background: 'var(--accent)' }} />
                <div style={{ width: '17%', background: 'var(--ink-faint)' }} />
                <div style={{ width: '8%',  background: 'var(--danger)' }} />
              </div>
              <div style={{ display: 'flex', marginTop: 8, gap: 16, fontSize: 10.5, color: 'var(--ink-muted)' }}>
                {[['var(--ok)','Lunas 8'],['var(--accent)','Sebagian 1'],['var(--ink-faint)','Belum 2'],['var(--danger)','Telat 1']].map(([c,l])=>(
                  <span key={l}><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: c, marginRight: 4 }} />{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────
function LandingTrust() {
  const orgs = ['BEM FMIPA UI', 'Tim Voli Cendana', 'Komunitas Photo Sleman', 'Paguyuban Wirausaha', 'Divisi Marketing PT Anugerah'];
  return (
    <section className="l-trust" style={{ padding: '40px 32px', borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 20 }}>
          Dipercaya 140+ tim &amp; organisasi
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px 28px', alignItems: 'center', color: 'var(--ink-muted)' }}>
          {orgs.map(o => <div key={o} style={{ fontSize: 14, fontWeight: 600, opacity: 0.6, letterSpacing: '-0.005em' }}>{o}</div>)}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function LandingFeatures() {
  const items = [
    { icon: 'sparkle' as const, title: 'Invoice otomatis',    text: 'Generate tagihan tiap awal periode mengikuti jabatan masing-masing anggota. Due-date otomatis geser bila libur.' },
    { icon: 'inbox'   as const, title: 'Approval workflow',   text: 'Anggota unggah bukti transfer, bendahara approve dengan satu klik. Saldo kas update otomatis.' },
    { icon: 'shield'  as const, title: 'Audit log lengkap',   text: 'Setiap aktivitas tercatat — siapa, kapan, melakukan apa. Tidak bisa dihapus, siap diaudit.' },
    { icon: 'wallet'  as const, title: 'Multi-akun kas',      text: 'Pisahkan rekening bank, kas tunai, dan e-wallet. Saldo dihitung dari akumulasi mutasi.' },
    { icon: 'bell'    as const, title: 'Reminder otomatis',   text: 'H-3, H-1, dan saat overdue — sistem kirim notifikasi sehingga bendahara tidak perlu menagih satu per satu.' },
    { icon: 'reports' as const, title: 'Laporan & analitik',  text: 'Skor kepatuhan per anggota, tren penagihan, dan proyeksi saldo — semua dalam dashboard.' },
  ];
  return (
    <section id="fitur" className="l-section" style={{ padding: '100px 32px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead eyebrow="Fitur lengkap"
          title="Semua yang dibutuhkan untuk kelola kas tim."
          sub="Dari registrasi hingga laporan akhir periode — Kolekto menutupi seluruh siklus iuran." />
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap: 14 }}>
          {items.map(f => (
            <div key={f.title} style={{ padding: '24px 22px', background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--teal-soft)', color: 'var(--teal)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                <Icon name={f.icon} size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.005em' }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginTop: 6 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function LandingHowItWorks() {
  const steps = [
    { num: '01', title: 'Setup tim dalam 10 menit.', body: 'Buat tim, atur jabatan beserta nominal iuran, dan tambahkan akun kas. Undang anggota lewat link.', visual: <StepVisual1 /> },
    { num: '02', title: 'Sistem generate invoice tiap periode.', body: 'Tidak perlu lagi catat manual. Scheduler harian otomatis membuat tagihan dan mengirim reminder.', visual: <StepVisual2 /> },
    { num: '03', title: 'Approve pembayaran, kas update otomatis.', body: 'Anggota kirim bukti, Anda approve, saldo kas naik. Semua jejak tercatat di audit log.', visual: <StepVisual3 /> },
  ];
  return (
    <section id="cara-kerja" className="l-section" style={{ padding: '100px 32px', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead eyebrow="Cara kerja" title="Dari spreadsheet ke autopilot."
          sub="Tiga langkah sederhana untuk menggantikan catatan manual." />
        <div className="l-steps" style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 80 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="l-step" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                  STEP {s.num}
                </div>
                <h3 className="l-step-h3" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, margin: 0 }}>{s.title}</h3>
                <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 14 }}>{s.body}</p>
              </div>
              <div style={{ direction: 'ltr' }}>{s.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepVisual1() {
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[1,2,3,4,5].map(n => (
          <div key={n} style={{ width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', background: n<=2?'var(--accent)':n===3?'var(--ink)':'var(--surface)', color: n<=3?'var(--bg)':'var(--ink-muted)', fontSize: 11, fontWeight: 600 }}>
            {n<=2 ? <Icon name="check" size={12}/> : n}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase' }}>STEP 3 — Akun kas</div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 4 }}>Tambahkan akun kas tim</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {[{ic:'bank' as const,n:'Kas Utama BCA',t:'BANK'},{ic:'cash' as const,n:'Kas Tunai',t:'CASH'},{ic:'phone' as const,n:'DANA Bendahara',t:'EWALLET'}].map((a,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, gap: 10 }}>
            <div className="avatar" style={{ background: 'var(--teal-soft)', color: 'var(--teal)', flexShrink: 0 }}><Icon name={a.ic} size={16}/></div>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.n}</span>
            <span className="badge badge-mute" style={{ flexShrink: 0 }}>{a.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepVisual2() {
  const delays = [0.3, 0.6, 0.9];
  const rows = [
    { code: 'INV-0001', name: 'Andini Pratama',  amt: 50000 },
    { code: 'INV-0002', name: 'Budi Santoso',    amt: 50000 },
    { code: 'INV-0003', name: 'Citra Lestari',   amt: 100000 },
  ];
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="sparkle" size={15}/></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Scheduler</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 11 }}>02:00 WIB · setiap hari</div>
          </div>
        </div>
        <span className="badge badge-ok">Aktif</span>
      </div>
      <div style={{ height: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={r.code} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, gap: 8, animation: `fadeUp .5s ${delays[i]}s forwards`, opacity: 0, minWidth: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: 11, flexShrink: 0 }}>{r.code}</span>
            <span style={{ fontSize: 12.5, flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>Rp {formatRp(r.amt)}</span>
          </div>
        ))}
      </div>
      <div style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>+ 9 invoice lain · 1.4 detik</div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function StepVisual3() {
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          <Avatar name="Gita Andriani" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Gita Andriani</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 11 }}>Menunggu approval · 8 menit lalu</div>
          </div>
        </div>
        <span className="badge badge-warn" style={{ flexShrink: 0 }}>Pending</span>
      </div>
      <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: 11.5 }}>Diajukan</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>Rp 100.000</span>
        </div>
        <div style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 4 }}>via Kas Utama BCA · INV-…0107</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'transparent', border: '1px solid var(--line)', color: 'var(--danger)', fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
          <Icon name="x" size={13} /> Tolak
        </button>
        <span style={{ flex: 1 }} />
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--bg)', fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
          <Icon name="check" size={13} /> Approve
        </button>
      </div>
      <div style={{ marginTop: 12, padding: 10, background: 'var(--ok-soft)', borderRadius: 10, fontSize: 12, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="check" size={14} /> Saldo BCA: <b>Rp 8.640K → 8.740K</b>
      </div>
    </div>
  );
}

// ─── Dashboard showcase ───────────────────────────────────────────────────────
function LandingDashShowcase() {
  return (
    <section className="l-section l-showcase" style={{ padding: '100px 32px', background: 'linear-gradient(180deg, transparent, var(--surface))' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <SectionHead eyebrow="Dashboard yang berbicara" title="Lihat seluruh kas dalam satu pandang."
          sub="Saldo, kepatuhan anggota, dan aktivitas terbaru — tanpa harus buka spreadsheet." />
        <div style={{ marginTop: 48 }}><HeroDashMock /></div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function LandingPricing() {
  const router = useRouter();
  const plans = [
    { name: 'Mini',     price: 25000,  popular: false, features: ['Hingga 20 anggota', '1 tim', '2 akun kas', 'Notifikasi in-app', 'Laporan dasar'],                                                    cta: 'Pilih Mini' },
    { name: 'Standard', price: 75000,  popular: true,  features: ['Hingga 100 anggota', '3 tim', 'Akun kas tak terbatas', 'Approval workflow', 'Audit log lengkap', 'Export PDF/CSV'],                   cta: 'Pilih Standard' },
    { name: 'Pro',      price: 200000, popular: false, features: ['Anggota tak terbatas', 'Tim tak terbatas', 'Multi-bendahara', 'API & webhook', 'Custom branding', 'Priority support'],                cta: 'Hubungi sales' },
  ];
  return (
    <section id="harga" className="l-section" style={{ padding: '100px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead eyebrow="Harga sederhana" title="Bayar sesuai ukuran tim."
          sub="14 hari trial gratis. Tidak ada potongan kartu kredit. Batalkan kapan saja." />
        <div style={{ marginTop: 48, paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 16 }}>
          {plans.map(p => (
            <div key={p.name} style={{ padding: 28, position: 'relative', background: p.popular ? 'var(--ink)' : 'var(--bg-elev)', color: p.popular ? 'var(--bg)' : 'var(--ink)', border: p.popular ? '0' : '1px solid var(--line)', borderRadius: 20, boxShadow: p.popular ? '0 20px 50px -20px rgba(5,50,53,.5)' : 'var(--shadow-sm)' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--ink)', padding: '4px 12px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Paling populer
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{p.name}</div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 13, opacity: 0.7 }}>Rp</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em' }}>{formatRp(p.price)}</span>
                <span style={{ fontSize: 13, opacity: 0.7 }}>/bulan</span>
              </div>
              <div style={{ height: 1, background: p.popular ? 'rgba(255,255,255,0.1)' : 'var(--line-soft)', margin: '18px 0' }} />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <Icon name="check" size={14} style={{ color: p.popular ? 'var(--accent)' : 'var(--ok)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push('/login')} style={{ marginTop: 22, width: '100%', padding: '12px 16px', background: p.popular ? 'var(--accent)' : 'var(--ink)', color: p.popular ? 'var(--ink)' : 'var(--bg)', border: 0, borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function LandingTestimonials() {
  const tts = [
    { quote: 'Dari spreadsheet yang selalu bikin debat saat akhir periode, jadi 3 menit close-the-books tiap bulan. Anggota juga lebih disiplin karena tahu siapa yang telat.', name: 'Rina Arwana', role: 'Bendahara · Komunitas Photo Sleman' },
    { quote: 'Audit log-nya menyelamatkan kami di rapat anggota. Tidak ada lagi gosip \'uang kemana sih\' — semuanya bisa dilihat siapa pun.', name: 'Yusuf Hanif', role: 'Ketua · BEM FMIPA UI' },
    { quote: 'Sebagai owner 3 tim, fitur multi-tim membuat saya bisa pantau semuanya dari satu akun. Trial 14 hari cukup untuk meyakinkan.', name: 'Bagus Widyatama', role: 'Pemilik · Paguyuban Wirausaha Klaten' },
  ];
  return (
    <section id="testimoni" className="l-section" style={{ padding: '100px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHead eyebrow="Suara pengguna" title="Cerita dari bendahara nyata." />
        <div style={{ marginTop: 52, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap: 16 }}>
          {tts.map((t, i) => (
            <div key={i} style={{ padding: 26, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 30, color: 'var(--accent)', lineHeight: 1, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-soft)', flex: 1, margin: 0 }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
                <Avatar name={t.name} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function LandingFAQ() {
  const [open, setOpen] = useState(0);
  const faqs = [
    { q: 'Apakah Kolekto cocok untuk tim kecil seperti komunitas atau divisi kantor?', a: 'Sangat cocok. Paket Mini dimulai dari 20 anggota dengan harga Rp 25.000/bulan. Kami punya banyak pengguna yang berupa komunitas hobi, divisi marketing, hingga organisasi mahasiswa.' },
    { q: 'Bagaimana sistem keamanan data pembayaran anggota?', a: 'Kolekto menggunakan JWT authentication, bcrypt password hash, dan rate limiting. Bukti pembayaran disimpan di MinIO object storage dengan metadata di database — file dan data terpisah.' },
    { q: 'Apakah ada integrasi dengan payment gateway seperti Midtrans atau Xendit?', a: 'Belum di v1. Untuk sekarang, anggota transfer manual lalu upload bukti. Integrasi payment gateway ada di roadmap v1.4.' },
    { q: 'Bisa ekspor data kalau kami ingin pindah platform?', a: 'Ya. Paket Standard ke atas mendukung export CSV dan PDF untuk laporan iuran dan transaksi. Data Anda milik Anda, kapan pun bisa diunduh.' },
    { q: 'Apa yang terjadi setelah masa trial 14 hari habis?', a: 'Akun akan masuk mode read-only — Anda tetap bisa lihat data tapi tidak bisa generate invoice baru. Upload bukti pembayaran lisensi untuk reaktivasi.' },
    { q: 'Apakah ada versi mobile app?', a: 'Saat ini Kolekto adalah web app yang responsif untuk mobile browser. Native app (iOS & Android) ada di roadmap v1.3.' },
  ];
  return (
    <section id="faq" className="l-section" style={{ padding: '100px 32px', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <SectionHead eyebrow="Pertanyaan umum" title="Hal-hal yang sering ditanyakan." />
        <div style={{ marginTop: 44, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: i < faqs.length-1 ? '1px solid var(--line-soft)' : 0 }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em', flex: 1, lineHeight: 1.4 }}>{f.q}</span>
                <Icon name={open === i ? 'minus' : 'plus'} size={16} style={{ color: 'var(--ink-muted)', flexShrink: 0, marginTop: 2 }} />
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function LandingCTA() {
  const router = useRouter();
  return (
    <section className="l-section" style={{ padding: '100px 32px' }}>
      <div className="l-cta-box" style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, var(--teal-deep), var(--teal))', color: 'var(--bg)', borderRadius: 28, padding: '80px 60px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', right: -100, top: -100, width: 400, height: 400, borderRadius: '50%', background: 'var(--accent)', opacity: 0.2, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -100, bottom: -100, width: 320, height: 320, borderRadius: '50%', background: 'oklch(0.55 0.1 200)', opacity: 0.3, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>Siap kelola kas dengan tenang?</div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '14px 0 0', lineHeight: 1.08 }}>
            Mulai trial 14 hari Anda<br />hari ini.
          </h2>
          <p style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', opacity: 0.8, lineHeight: 1.5, maxWidth: 500, marginInline: 'auto', marginTop: 16 }}>
            Tanpa kartu kredit. Tanpa komitmen. Hanya Anda dan kas yang lebih rapi.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login')} style={{ padding: '13px 22px', background: 'var(--accent)', color: 'var(--teal-deep)', border: 0, borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Buat akun gratis <Icon name="chev" size={16} />
            </button>
            <button onClick={() => router.push('/login')} style={{ padding: '13px 22px', background: 'rgba(255,255,255,0.1)', color: 'var(--bg)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>
              Sudah punya akun
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer style={{ padding: '56px 32px 28px', borderTop: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="l-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src={pub('/icon-kolekto.png')} alt="Kolekto" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
              <img src={pub('/nama-kolekto.png')} alt="Kolekto" style={{ height: 22, objectFit: 'contain' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
              Manajemen iuran kas tim yang transparan, teraudit, dan dapat diandalkan organisasi dari skala kecil hingga menengah.
            </p>
          </div>
          {[
            { h: 'Produk',      items: ['Fitur', 'Harga', 'Roadmap', 'Status sistem'] },
            { h: 'Sumber daya', items: ['Dokumentasi', 'API reference', 'Blog', 'Panduan bendahara'] },
            { h: 'Perusahaan',  items: ['Tentang kami', 'Karir', 'Kontak', 'Kebijakan privasi'] },
          ].map(col => (
            <div key={col.h}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 14 }}>{col.h}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.items.map(item => <li key={item}><a href="#" style={{ fontSize: 13, color: 'var(--ink-soft)', textDecoration: 'none' }}>{item}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="l-footer-bot" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 44, paddingTop: 22, borderTop: '1px solid var(--line-soft)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>© 2026 Kolekto Indonesia. Manajemen iuran tim.</span>
          <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Dibuat dengan ☕ di Jakarta.</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 640, marginInline: 'auto' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>{eyebrow}</div>
      <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 12px', lineHeight: 1.15 }}>{title}</h2>
      {sub && <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}>{sub}</p>}
    </div>
  );
}
