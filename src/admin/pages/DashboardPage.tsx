import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { fetchPortfolioStats } from '../api/adminPortfolio'
import { AdminCard, AdminPageHeader } from '../components/AdminLayout'
import type { PortfolioStats } from '../types'

function StatCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string
  value: number
  accent: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <AdminCard className="p-6 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30 ${accent}`}
        />
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate font-semibold">{label}</p>
        <p className="mt-3 font-display text-4xl font-bold text-navy">{value}</p>
      </AdminCard>
    </motion.div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPortfolioStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Overview of your portfolio content"
        action={
          <Link
            to="/admin/tours/new"
            className="inline-flex items-center rounded-full bg-cyan px-6 py-3 text-sm font-bold text-navy shadow-lg shadow-cyan/20 hover:bg-cyan-bright transition-colors"
          >
            + Add tour
          </Link>
        }
      />

      {error && (
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        <StatCard label="Total items" value={stats?.total ?? 0} accent="bg-cyan" delay={0} />
        <StatCard label="Videos" value={stats?.videos ?? 0} accent="bg-cyan-bright" delay={0.05} />
        <StatCard
          label="Virtual tours"
          value={stats?.virtualTours ?? 0}
          accent="bg-navy"
          delay={0.1}
        />
        <StatCard
          label="Published"
          value={stats?.published ?? 0}
          accent="bg-emerald-400"
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="mt-8"
      >
        <AdminCard className="p-8 text-center">
          <p className="text-slate text-sm max-w-md mx-auto">
            {stats?.total === 0
              ? 'Your portfolio is empty. Add your first video or virtual tour to make it live on the website.'
              : 'Manage tours from the Portfolio section. Changes appear on the live site immediately.'}
          </p>
          <Link
            to="/admin/tours"
            className="inline-block mt-6 text-sm font-bold text-cyan hover:text-cyan-bright transition-colors"
          >
            Go to portfolio →
          </Link>
        </AdminCard>
      </motion.div>
    </>
  )
}
