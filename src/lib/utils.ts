import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDecimal(value: string): number | null {
  const normalized = value.replace(',', '.').replace(/[^0-9.-]/g, '')
  if (!normalized.trim()) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatPercent(value: number | null, locale = 'de-DE') {
  if (value === null || !Number.isFinite(value)) return '–'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatToday() {
  return new Intl.DateTimeFormat('de-DE').format(new Date())
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
