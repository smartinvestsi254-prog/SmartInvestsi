/**
 * Date & formatting helpers shared across apps.
 */

export function formatDate(date: Date | string | number): string {
  const d = toDate(date);
  return d.toISOString();
}

export function formatDateShort(date: Date | string | number): string {
  const d = toDate(date);
  return d.toISOString().slice(0, 10);
}

export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumber(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function toDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isExpired(date: Date | string | number, now = new Date()): boolean {
  return toDate(date).getTime() <= now.getTime();
}

export function timeAgo(date: Date | string | number): string {
  const seconds = Math.floor((Date.now() - toDate(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

