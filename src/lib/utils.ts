import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency, getAppCurrency, setAppCurrency } from './currency';

export { formatCurrency, getAppCurrency, setAppCurrency };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number, decimals: number = 0, currencyOverride?: string): string {
  return formatCurrency(amount, currencyOverride, decimals);
}

export function formatXOF(amount: number): string {
  return formatCurrency(amount, 'XOF', 0);
}

export function formatOriginalCurrency(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}

export function getDaysUntil(targetDate: Date | string): number {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function formatDateFr(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getMonthYearKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
