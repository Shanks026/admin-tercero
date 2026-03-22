import {
  IndianRupee, Zap, Gauge, Sparkles, Users,
} from 'lucide-react'
import { KpiCard } from '@/components/misc/KpiCard'
import { useClients, isChurnRisk, PLANS } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'

const PLAN_PRICES = { ignite: 2999, velocity: 8999, quantum: 17999 }

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

const TIER_META = [
  { plan: 'ignite',   label: 'Ignite',   price: PLAN_PRICES.ignite,   icon: Zap,      color: 'text-orange-500 dark:text-orange-400' },
  { plan: 'velocity', label: 'Velocity', price: PLAN_PRICES.velocity, icon: Gauge,    color: 'text-blue-500 dark:text-blue-400'   },
  { plan: 'quantum',  label: 'Quantum',  price: PLAN_PRICES.quantum,  icon: Sparkles, color: 'text-violet-500 dark:text-violet-400' },
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
        <h1 className="text-3xl font-light tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground font-light">Monthly recurring revenue across all paid plans</p>
      </div>

      {/* Top-level MRR / paying clients */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Monthly Recurring Revenue"
          value={formatINR(mrr)}
          sub={`${paidClients.length} paid client${paidClients.length !== 1 ? 's' : ''}`}
          icon={<IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Paying Clients"
          value={paidClients.length}
          sub="on a paid plan"
          icon={<Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        />
        <KpiCard
          title="Avg Revenue Per Client"
          value={paidClients.length > 0 ? formatINR(Math.round(mrr / paidClients.length)) : '—'}
          sub="across paid plans"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Per-tier breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tierStats.map((t) => (
            <KpiCard
              key={t.plan}
              title={t.label}
              value={formatINR(t.revenue)}
              sub={`${t.count} client${t.count !== 1 ? 's' : ''} · ${formatINR(t.price)}/mo`}
              icon={<t.icon className={`h-4 w-4 ${t.color}`} />}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
