import {
  IndianRupee, Zap, Gauge, Sparkles, Users,
} from 'lucide-react'
import { StatBar, StatCell } from '@/components/misc/StatBar'
import { useClients, PLANS } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'

const PLAN_PRICES = { ignite: 1999, velocity: 4999, quantum: 12999 }

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

const TIER_META = [
  { plan: 'ignite',   label: 'Ignite',   price: PLAN_PRICES.ignite,   icon: Zap,      color: 'text-orange-500 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-500/10' },
  { plan: 'velocity', label: 'Velocity', price: PLAN_PRICES.velocity, icon: Gauge,    color: 'text-purple-500 dark:text-purple-400',  iconBg: 'bg-purple-100 dark:bg-purple-500/10'  },
  { plan: 'quantum',  label: 'Quantum',  price: PLAN_PRICES.quantum,  icon: Sparkles, color: 'text-pink-500 dark:text-pink-400',     iconBg: 'bg-pink-100 dark:bg-pink-500/10'     },
]

export default function RevenuePage() {
  const { profile } = useAuth()
  const { data: clients = [], isLoading } = useClients({ superadminId: profile?.id })

  const paidClients = clients.filter((c) => PLAN_PRICES[c.plan_name])
  const mrr = paidClients.reduce((sum, c) => sum + (PLAN_PRICES[c.plan_name] || 0), 0)

  const tierStats = TIER_META.map((t) => {
    const count = clients.filter((c) => c.plan_name === t.plan).length
    return { ...t, count, revenue: count * t.price }
  })

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground font-light">Monthly recurring revenue across all paid plans</p>
      </div>

      {/* Top-level MRR / paying clients */}
      <StatBar>
        <StatCell
          label="Monthly Recurring Revenue"
          value={formatINR(mrr)}
          valueClass="text-emerald-600 dark:text-emerald-400"
          sub={`${paidClients.length} paid client${paidClients.length !== 1 ? 's' : ''}`}
          icon={<IndianRupee className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-500/10"
        />
        <StatCell
          label="Paying Clients"
          value={paidClients.length}
          sub="on a paid plan"
          icon={<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-500/10"
        />
        <StatCell
          label="Avg Revenue Per Client"
          value={paidClients.length > 0 ? formatINR(Math.round(mrr / paidClients.length)) : '—'}
          sub="across paid plans"
          icon={<Users className="h-3 w-3 text-muted-foreground" />}
          iconBg="bg-muted/80"
        />
      </StatBar>

      {/* Per-tier breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Plan</h2>
        <StatBar>
          {tierStats.map((t) => (
            <StatCell
              key={t.plan}
              label={t.label}
              value={formatINR(t.revenue)}
              sub={`${t.count} client${t.count !== 1 ? 's' : ''} · ${formatINR(t.price)}/mo`}
              icon={<t.icon className={`h-3 w-3 ${t.color}`} />}
              iconBg={t.iconBg}
            />
          ))}
        </StatBar>
      </div>

    </div>
  )
}
