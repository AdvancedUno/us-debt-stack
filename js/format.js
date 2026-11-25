// Stack It: number and date formatting (Intl only, no DOM).

const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const numberFormats = new Map();
const num = (n, digits = 0) => {
  if (!numberFormats.has(digits)) {
    numberFormats.set(digits, new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return numberFormats.get(digits).format(n);
};
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "$40,727,354,330" */
export const formatUSD = (n) => usdWhole.format(n);

/** "$40.7T", "$1.6M", "$100" */
export const formatUSDCompact = (n) => usdCompact.format(n);

/** Plain number with grouping: formatNumber(339917.6) -> "339,918" */
export const formatNumber = (n, digits = 0) => num(n, digits);

/** Human-friendly height: mm, cm, m, then km. */
export function formatHeight(m) {
  const abs = Math.abs(m);
  if (abs < 0.01) return `${num(m * 1000, abs < 0.001 ? 2 : 1)} mm`;
  if (abs < 1) return `${num(m * 100, 1)} cm`;
  if (abs < 10) return `${num(m, 2)} m`;
  if (abs < 10_000) return `${num(m, 0)} m`;
  return `${num(m / 1000, 0)} km`;
}

/** "2026-11-23" -> "Nov 23, 2026" */
export const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

/** 0.1157 -> "11.6%" */
export const formatPercent = (fraction, digits = 1) => `${num(fraction * 100, digits)}%`;
