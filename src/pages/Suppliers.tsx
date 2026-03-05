import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Supplier, ServiceCategory, SupplierStatus, Province } from '@/types/supplier'
import { SA_PROVINCES } from '@/types/supplier'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SupplierStatus }) {
  const cls: Record<SupplierStatus, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    inactive: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({}) // slug → name
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | ''>('')
  const [provinceFilter, setProvinceFilter] = useState<Province | ''>('')

  useEffect(() => {
    async function load() {
      const [suppliersRes, catsRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase
          .from('service_categories')
          .select('id, name, slug, is_active')
          .eq('is_active', true),
      ])

      if (suppliersRes.error) {
        toast.error('Failed to load suppliers')
      } else {
        setSuppliers(suppliersRes.data as Supplier[])
      }

      if (catsRes.data) {
        const map: Record<string, string> = {}
        ;(catsRes.data as ServiceCategory[]).forEach((c) => {
          map[c.slug] = c.name
        })
        setCategoryMap(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return suppliers.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false
      if (provinceFilter && s.province !== provinceFilter) return false
      if (q) {
        const hay = `${s.first_name} ${s.last_name} ${s.email} ${s.cell_number}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [suppliers, search, statusFilter, provinceFilter])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'} total
          </p>
        </div>
        <Link
          to="/suppliers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search name, email or cell…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Province filter */}
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value as Province | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
        >
          <option value="">All provinces</option>
          {SA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto w-10 h-10 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-500">No suppliers found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Categories
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Province
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Cell
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">
                        {supplier.first_name} {supplier.last_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{supplier.email}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {supplier.service_categories.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <>
                            {supplier.service_categories.slice(0, 3).map((slug) => (
                              <span
                                key={slug}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                              >
                                {categoryMap[slug] ?? slug}
                              </span>
                            ))}
                            {supplier.service_categories.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                +{supplier.service_categories.length - 3}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-gray-600">{supplier.province ?? '—'}</td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={supplier.status} />
                    </td>

                    <td className="px-4 py-3.5 text-gray-600 font-mono text-xs tabular-nums">
                      {supplier.cell_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
