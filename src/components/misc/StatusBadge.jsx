import { cn } from '@/lib/utils'

const PROSPECT_STATUS = {
  new:            'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  contacted:      'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  demo_scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  demo_done:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
  trial_started:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  converted:      'bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400',
  dead:           'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
}

const PROSPECT_STATUS_LABELS = {
  new:            'New',
  contacted:      'Contacted',
  demo_scheduled: 'Demo Scheduled',
  demo_done:      'Demo Done',
  trial_started:  'Trial Started',
  converted:      'Converted',
  dead:           'Dead',
}

const SOURCE_COLORS = {
  apollo:        'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  google_maps:   'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400',
  referral:      'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  friend:        'bg-pink-100 text-pink-800 dark:bg-pink-500/10 dark:text-pink-400',
  manual:        'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
  direct_signup: 'bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400',
}

const SOURCE_LABELS = {
  apollo:        'Apollo',
  google_maps:   'Google Maps',
  referral:      'Referral',
  friend:        'Friend',
  manual:        'Manual',
  direct_signup: 'Direct Signup',
}

const FEEDBACK_TYPE = {
  bug:        'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
  feedback:   'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  suggestion: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
}

const FEEDBACK_SEVERITY = {
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  high:   'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
}

const FEEDBACK_STATUS = {
  open:        'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  resolved:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  dismissed:   'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
}

const PLAN_BADGE = {
  trial:    'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  ignite:   'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  velocity: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  quantum:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
}

function Badge({ label, colorClass, className }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      colorClass,
      className
    )}>
      {label}
    </span>
  )
}

export function ProspectStatusBadge({ status, className }) {
  const label = PROSPECT_STATUS_LABELS[status] || status
  const colorClass = PROSPECT_STATUS[status] || PROSPECT_STATUS.new
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export function SourceBadge({ source, className }) {
  const label = SOURCE_LABELS[source] || source
  const colorClass = SOURCE_COLORS[source] || SOURCE_COLORS.manual
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export function FeedbackTypeBadge({ type, className }) {
  const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : '—'
  const colorClass = FEEDBACK_TYPE[type] || FEEDBACK_TYPE.feedback
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export function FeedbackSeverityBadge({ severity, className }) {
  if (!severity) return null
  const label = severity.charAt(0).toUpperCase() + severity.slice(1)
  const colorClass = FEEDBACK_SEVERITY[severity] || FEEDBACK_SEVERITY.low
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export function FeedbackStatusBadge({ status, className }) {
  const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', dismissed: 'Dismissed' }
  const label = labels[status] || status
  const colorClass = FEEDBACK_STATUS[status] || FEEDBACK_STATUS.open
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export function PlanBadge({ plan, className }) {
  if (!plan) return null
  const label = plan.charAt(0).toUpperCase() + plan.slice(1)
  const colorClass = PLAN_BADGE[plan] || PLAN_BADGE.trial
  return <Badge label={label} colorClass={colorClass} className={className} />
}

export const PROSPECT_STATUSES = Object.keys(PROSPECT_STATUS_LABELS)
export const PROSPECT_STATUS_LABELS_MAP = PROSPECT_STATUS_LABELS
export const SOURCE_LABELS_MAP = SOURCE_LABELS
export const SOURCES = Object.keys(SOURCE_LABELS)
