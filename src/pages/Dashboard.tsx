import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { SupplierStatus, Province } from '@/types/supplier'

// ── Minimal shapes needed for the dashboard ───────────────────────────────────

interface DashboardSupplier {
  id: string
  first_name: string
  last_name: string
  status: SupplierStatus
  province: Province | null
  service_categories: string[]
  created_at: string
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  teal:  { bg: 'bg-teal-50',  icon: 'text-teal-500',  val: 'text-teal-700'  },
  green: { bg: 'bg-green-50', icon: 'text-green-500', val: 'text-green-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', val: 'text-amber-700' },
  red:   { bg: 'bg-red-50',   icon: 'text-red-500',   val: 'text-red-700'   },
} as const

type CardColor = keyof typeof STATUS_COLOR

function StatCard({
  label,
  count,
  color,
  loading,
  icon,
}: {
  label: string
  count: number
  color: CardColor
  loading: boolean
  icon: ReactNode
}) {
  const c = STATUS_COLOR[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {loading ? (
          <div className="mt-2 h-9 w-14 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          <p className={`mt-1 text-4xl font-bold tabular-nums ${c.val}`}>{count}</p>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${c.bg}`}>
        <div className={c.icon}>{icon}</div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconXCircle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState<DashboardSupplier[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [suppliersRes, catsRes] = await Promise.all([
        supabase
          .from('suppliers')
          .select('id, first_name, last_name, status, province, service_categories, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('service_categories')
          .select('slug, name')
          .eq('is_active', true),
      ])

      if (suppliersRes.error) {
        toast.error('Failed to load dashboard data')
      } else {
        setSuppliers(suppliersRes.data as DashboardSupplier[])
      }

      if (catsRes.data) {
        const map: Record<string, string> = {}
        ;(catsRes.data as { slug: string; name: string }[]).forEach((c) => {
          map[c.slug] = c.name
        })
        setCategoryMap(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    total:    suppliers.length,
    active:   suppliers.filter((s) => s.status === 'active').length,
    pending:  suppliers.filter((s) => s.status === 'pending').length,
    inactive: suppliers.filter((s) => s.status === 'inactive').length,
  }), [suppliers])

  const provinceData = useMemo(() => {
    const map: Partial<Record<Province, number>> = {}
    suppliers.forEach((s) => {
      if (s.province) map[s.province] = (map[s.province] ?? 0) + 1
    })
    return Object.entries(map)
      .sort(([, a], [, b]) => (b as number) - (a as number)) as [Province, number][]
  }, [suppliers])

  const maxProvinceCount = provinceData[0]?.[1] ?? 1

  const recentSuppliers = suppliers.slice(0, 5)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          One Stop Wellness · Supplier Tracker overview
        </p>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Suppliers"
          count={counts.total}
          color="teal"
          loading={loading}
          icon={<IconUsers />}
        />
        <StatCard
          label="Active"
          count={counts.active}
          color="green"
          loading={loading}
          icon={<IconCheckCircle />}
        />
        <StatCard
          label="Pending"
          count={counts.pending}
          color="amber"
          loading={loading}
          icon={<IconClock />}
        />
        <StatCard
          label="Inactive"
          count={counts.inactive}
          color="red"
          loading={loading}
          icon={<IconXCircle />}
        />
      </div>

      {/* ── Middle row: Province chart + Recent additions ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Province distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Suppliers by Province</h2>

          {loading ? (
            <div className="space-y-3">
              {[100, 72, 55, 40, 28].map((w) => (
                <div key={w} className="flex items-center gap-3">
                  <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 flex-1 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-3 w-5 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : provinceData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No supplier location data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {provinceData.map(([province, count]) => {
                const pct = Math.round((count / maxProvinceCount) * 100)
                return (
                  <div key={province} className="flex items-center gap-3">
                    {/* Province name */}
                    <span className="text-xs text-gray-600 w-28 shrink-0 truncate text-right leading-tight">
                      {province}
                    </span>

                    {/* Bar track */}
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Count */}
                    <span className="text-xs font-semibold text-gray-700 w-5 text-right tabular-nums">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent additions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Additions</h2>
            <Link
              to="/suppliers"
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSuppliers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No suppliers added yet</p>
              <Link
                to="/suppliers/new"
                className="mt-3 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Add your first supplier →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 -mx-6 px-6">
              {recentSuppliers.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/suppliers/${s.id}`}
                    className="flex items-start justify-between gap-3 py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-teal-700">
                        {s.first_name[0]?.toUpperCase()}
                        {s.last_name[0]?.toUpperCase()}
                      </span>
                    </div>

                    {/* Name + categories */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {s.first_name} {s.last_name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.service_categories.length === 0 ? (
                          <span className="text-xs text-gray-400">No categories</span>
                        ) : (
                          s.service_categories.slice(0, 3).map((slug) => (
                            <span
                              key={slug}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                            >
                              {categoryMap[slug] ?? slug}
                            </span>
                          ))
                        )}
                        {s.service_categories.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            +{s.service_categories.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors shrink-0 mt-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/suppliers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Supplier
          </Link>

          <Link
            to="/suppliers"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            View All Suppliers
          </Link>
        </div>
      </div>
    </div>
  )
}
