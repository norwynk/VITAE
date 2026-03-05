import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Supplier, ServiceCategory, SupplierStatus } from '@/types/supplier'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SupplierStatus }) {
  const cls: Record<SupplierStatus, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    inactive: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

function BooleanRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
          value ? 'bg-teal-600' : 'bg-gray-200'
        }`}
      >
        {value && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  supplier,
  onConfirm,
  onCancel,
  deleting,
}: {
  supplier: Supplier
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete supplier?</h3>
            <p className="text-sm text-gray-500 mt-1">
              <strong>
                {supplier.first_name} {supplier.last_name}
              </strong>{' '}
              will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {deleting && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const [supplierRes, catsRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', id).single(),
        supabase
          .from('service_categories')
          .select('id, name, slug, is_active')
          .eq('is_active', true),
      ])

      if (supplierRes.error || !supplierRes.data) {
        toast.error('Supplier not found')
        navigate('/suppliers')
        return
      }
      setSupplier(supplierRes.data as Supplier)

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
  }, [id, navigate])

  // ── Status toggle ─────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: SupplierStatus) {
    if (!id || !supplier) return
    setStatusUpdating(true)
    const { error } = await supabase
      .from('suppliers')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      setSupplier((prev) => (prev ? { ...prev, status: newStatus } : null))
      toast.success('Status updated')
    }
    setStatusUpdating(false)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete supplier')
      setDeleting(false)
    } else {
      toast.success('Supplier deleted')
      navigate('/suppliers')
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!supplier) return null

  const fullName = `${supplier.first_name} ${supplier.last_name}`
  const addedDate = new Date(supplier.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {showDeleteModal && (
        <DeleteModal
          supplier={supplier}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* ── Breadcrumb / Back ─────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link to="/suppliers" className="text-gray-400 hover:text-gray-700 transition-colors">
            Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-medium truncate">{fullName}</span>
        </div>

        {/* ── Header card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-teal-700">
                  {supplier.first_name[0]?.toUpperCase()}
                  {supplier.last_name[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-sm text-gray-500">{supplier.email}</p>
                <p className="text-xs text-gray-400 mt-1">Added {addedDate}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              {/* Status dropdown */}
              <div className="relative">
                <select
                  value={supplier.status}
                  onChange={(e) => handleStatusChange(e.target.value as SupplierStatus)}
                  disabled={statusUpdating}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white disabled:opacity-60 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Status indicator */}
              <StatusBadge status={supplier.status} />

              {/* Edit button */}
              <Link
                to={`/suppliers/${supplier.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Edit
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ── Contact ─────────────────────────────────────────────────── */}
          <Section title="Contact">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Cell number" value={supplier.cell_number} />
              <InfoRow label="Email" value={supplier.email} />
              <InfoRow label="WhatsApp" value={supplier.whatsapp_number} />
              <InfoRow label="Emergency contact" value={supplier.emergency_contact_name} />
              <InfoRow
                label="Emergency number"
                value={supplier.emergency_contact_number}
              />
            </dl>
          </Section>

          {/* ── Personal Information ──────────────────────────────────────── */}
          <Section title="Personal Information">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="ID number" value={supplier.id_number} />
              <InfoRow label="Date of birth" value={supplier.date_of_birth} />
              <InfoRow
                label="Gender"
                value={
                  supplier.gender
                    ? supplier.gender.charAt(0).toUpperCase() +
                      supplier.gender.slice(1).replace(/_/g, ' ')
                    : null
                }
              />
            </dl>
          </Section>

          {/* ── Professional ──────────────────────────────────────────────── */}
          <Section title="Professional">
            <div className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-400 mb-2">Service categories</dt>
                <dd>
                  {supplier.service_categories.length === 0 ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.service_categories.map((slug) => (
                        <span
                          key={slug}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                        >
                          {categoryMap[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Qualifications" value={supplier.qualifications} />
                <InfoRow
                  label="Professional reg. number"
                  value={supplier.professional_reg_number}
                />
                <InfoRow label="Registration body" value={supplier.registration_body} />
                <InfoRow
                  label="Years of experience"
                  value={
                    supplier.years_experience != null
                      ? `${supplier.years_experience} yr${supplier.years_experience !== 1 ? 's' : ''}`
                      : null
                  }
                />
              </dl>
            </div>
          </Section>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <Section title="Location">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Province" value={supplier.province} />
              <InfoRow label="City" value={supplier.city} />
              <InfoRow label="Suburb" value={supplier.suburb} />
              <InfoRow label="Street address" value={supplier.street_address} />
              <InfoRow label="Postal code" value={supplier.postal_code} />
            </dl>
          </Section>

          {/* ── Logistics ─────────────────────────────────────────────────── */}
          <Section title="Logistics">
            <div className="space-y-2.5">
              <BooleanRow label="Has own transport" value={supplier.has_own_transport} />
              <BooleanRow label="Willing to travel" value={supplier.willing_to_travel} />
            </div>
            {(supplier.car_make_model || supplier.car_registration || supplier.max_travel_distance_km != null) && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <InfoRow label="Vehicle" value={supplier.car_make_model} />
                <InfoRow label="Registration" value={supplier.car_registration} />
                <InfoRow
                  label="Max travel distance"
                  value={
                    supplier.max_travel_distance_km != null
                      ? `${supplier.max_travel_distance_km} km`
                      : null
                  }
                />
              </dl>
            )}
          </Section>

          {/* ── Compliance ────────────────────────────────────────────────── */}
          <Section title="Compliance">
            <div className="space-y-2.5">
              <BooleanRow label="Police clearance" value={supplier.has_police_clearance} />
              <BooleanRow label="Indemnity insurance" value={supplier.has_indemnity_insurance} />
            </div>
            {(supplier.police_clearance_date || supplier.indemnity_insurance_expiry) && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <InfoRow
                  label="Police clearance date"
                  value={supplier.police_clearance_date}
                />
                <InfoRow
                  label="Insurance expiry"
                  value={supplier.indemnity_insurance_expiry}
                />
              </dl>
            )}
          </Section>

          {/* ── Danger zone ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
              Danger zone
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this supplier and all associated records.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete supplier
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
