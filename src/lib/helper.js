import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'

export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt)
}

export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export function formatRelative(date) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function isExpiringSoon(date, days = 3) {
  if (!date) return false
  const d = new Date(date)
  return !isPast(d) && differenceInDays(d, new Date()) <= days
}

export function daysUntil(date) {
  if (!date) return null
  return differenceInDays(new Date(date), new Date())
}
