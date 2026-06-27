import { pub } from '@/lib/pub';

interface FullScreenLoaderProps {
  show: boolean;
  label?: string;
}

export function FullScreenLoader({ show, label = 'Memproses...' }: FullScreenLoaderProps) {
  if (!show) return null;

  return (
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
          {label}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}} />
    </div>
  );
}
