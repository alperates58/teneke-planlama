/**
 * Türkçe Biçimlendirme Araçları (TR Locale & Europe/Istanbul)
 */

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('tr-TR').format(val);
}

export function formatAdet(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return `${formatNumber(val)} Adet`;
}

export function formatLevha(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return `${formatNumber(val)} Levha`;
}

export function formatDateTR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // If format is YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}
