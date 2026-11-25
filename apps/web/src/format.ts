// F&V (by Factronics) — formatos por locale (Intl). Gate F1.2.
import { formatLocale } from "./supported-locales";

/** Valores de ejemplo fijos: no son datos técnicos, solo demostración de formato. */
export const SAMPLE_NUMBER = 1234.5;
export const SAMPLE_PERCENT = 0.25;
export const SAMPLE_DATE = new Date(Date.UTC(2026, 10, 25, 12, 0, 0));

export function formatNumber(value: number, tag: string): string {
  return new Intl.NumberFormat(formatLocale(tag), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

export function formatInteger(value: number, tag: string): string {
  return new Intl.NumberFormat(formatLocale(tag), {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(fraction: number, tag: string): string {
  return new Intl.NumberFormat(formatLocale(tag), {
    style: "percent",
    maximumFractionDigits: 0
  }).format(fraction);
}

export function formatDate(date: Date, tag: string): string {
  return new Intl.DateTimeFormat(formatLocale(tag), {
    dateStyle: "long",
    timeZone: "UTC"
  }).format(date);
}
