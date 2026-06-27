import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function formatDate(date: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function periodLabel(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export type PasswordStrength = { label: string; color: string; level: number };

/** Skor kekuatan password 1–4 berdasarkan panjang, campuran huruf, angka, dan simbol. */
export function passwordStrength(p: string): PasswordStrength {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map: PasswordStrength[] = [
    { label: 'Lemah',       color: 'var(--danger)', level: 1 },
    { label: 'Cukup',       color: 'var(--warn)',   level: 2 },
    { label: 'Baik',        color: 'var(--accent)', level: 3 },
    { label: 'Sangat kuat', color: 'var(--ok)',     level: 4 },
  ];
  return map[Math.max(0, s - 1)];
}
