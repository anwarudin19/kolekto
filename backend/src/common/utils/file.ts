import { randomUUID } from 'crypto';

export const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();

export const buildStorageKey = (prefix: 'payments' | 'expenses', teamId: string, fileName: string) => {
  const date = new Date();
  const yearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${prefix}/${teamId}/${yearMonth}/${randomUUID()}-${sanitizeFileName(fileName)}`;
};
