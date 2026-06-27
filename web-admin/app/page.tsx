'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAuth } from '@/lib/auth';
import { LandingPage } from '@/components/landing/LandingPage';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getStoredAuth()) router.replace('/dashboard');
  }, [router]);

  // Kalau sudah login, sudah redirect — tampilkan landing sementara
  if (typeof window !== 'undefined' && getStoredAuth()) return null;

  return <LandingPage />;
}
