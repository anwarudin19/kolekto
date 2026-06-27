import Image from 'next/image';
import Link from 'next/link';
import { pub } from '@/lib/pub';

export function Brand({ small }: { small?: boolean }) {
  const size = small ? 24 : 32;
  return (
    <Link href="/dashboard" className="brand" style={{ textDecoration: 'none', padding: small ? 0 : undefined }}>
      <Image
        src={pub('/icon-kolekto.png')}
        alt="Kolekto"
        width={size}
        height={size}
        className="brand-icon"
        style={{ width: size, height: size }}
      />
      {!small && (
        <Image
          src={pub('/nama-kolekto.png')}
          alt="Kolekto"
          width={72}
          height={18}
          className="brand-wordmark"
        />
      )}
    </Link>
  );
}
