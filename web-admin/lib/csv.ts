// Utilitas pembuatan & unduhan CSV di sisi client.

/** Escape satu nilai untuk CSV (RFC 4180): bungkus dengan kutip ganda bila perlu. */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Bangun string CSV dari header + baris. Disisipkan BOM agar Excel membaca UTF-8 dengan benar. */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return '﻿' + lines.join('\r\n');
}

/** Picu unduhan file CSV di browser. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
