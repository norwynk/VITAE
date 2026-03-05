import { useState, useEffect } from 'react'
import type { ReactNode, FocusEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { parseSAId } from '@/utils/saId'
import type { ServiceCategory, Gender, Province, NewSupplier } from '@/types/supplier'
import { SA_PROVINCES } from '@/types/supplier'

// ── Form state type ───────────────────────────────────────────────────────────

interface FormData {
  // Personal
  first_name: string
  last_name: string
  id_number: string
  date_of_birth: string
  gender: Gender | ''
  cell_number: string
  email: string
  // Professional
  service_categories: string[]
  qualifications: string
  // Location
  province: Province | ''
  city: string
  suburb: string
  // Logistics
  has_own_transport: boolean
  willing_to_travel: boolean
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY_FORM: FormData = {
  first_name: '',
  last_name: '',
  id_number: '',
  date_of_birth: '',
  gender: '',
  cell_number: '',
  email: '',
  service_categories: [],
  qualifications: '',
  province: '',
  city: '',
  suburb: '',
  has_own_transport: false,
  willing_to_travel: false,
}

// ── Small shared UI components ────────────────────────────────────────────────

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="pb-3 mb-5 border-b border-gray-200">
      <h2 className="text-base font-semibold text-gray-800">{children}</h2>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return `w-full rounded-lg border ${
    error
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
      : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500/20'
  } px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:outline-none transition`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddSupplier() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [pageLoading, setPageLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // ── Load categories (and supplier when editing) ─────────────────────────────
  useEffect(() => {
    async function load() {
      const catsPromise = supabase
        .from('service_categories')
        .select('id, name, slug, is_active')
        .eq('is_active', true)
        .order('name')

      if (isEdit && id) {
        const [catsRes, supplierRes] = await Promise.all([
          catsPromise,
          supabase.from('suppliers').select('*').eq('id', id).single(),
        ])

        if (catsRes.data) setCategories(catsRes.data as ServiceCategory[])

        if (supplierRes.error || !supplierRes.data) {
          toast.error('Supplier not found')
          navigate('/suppliers')
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supplierRes.data as any
        setFormData({
          first_name: s.first_name ?? '',
          last_name: s.last_name ?? '',
          id_number: s.id_number ?? '',
          date_of_birth: s.date_of_birth ?? '',
          gender: s.gender ?? '',
          cell_number: s.cell_number ?? '',
          email: s.email ?? '',
          service_categories: s.service_categories ?? [],
          qualifications: s.qualifications ?? '',
          province: s.province ?? '',
          city: s.city ?? '',
          suburb: s.suburb ?? '',
          has_own_transport: s.has_own_transport ?? false,
          willing_to_travel: s.willing_to_travel ?? false,
        })
      } else {
        const catsRes = await catsPromise
        if (catsRes.data) setCategories(catsRes.data as ServiceCategory[])
      }

      setPageLoading(false)
    }
    load()
  }, [id, isEdit, navigate])

  // ── Field helpers ───────────────────────────────────────────────────────────

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleCategory(slug: string) {
    const next = formData.service_categories.includes(slug)
      ? formData.service_categories.filter((s) => s !== slug)
      : [...formData.service_categories, slug]
    set('service_categories', next)
  }

  // ── SA ID auto-fill ─────────────────────────────────────────────────────────
  // If the value looks like a 13-digit SA ID, try to auto-fill DOB and gender.
  // Non-SA IDs (passports, foreign IDs) are accepted as-is — no error shown.

  function handleIdBlur(e: FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    if (!val) return
    if (/^\d{13}$/.test(val)) {
      const result = parseSAId(val)
      if (result.isValid) {
        setFormData((prev) => ({
          ...prev,
          date_of_birth: result.dateOfBirth ?? prev.date_of_birth,
          gender: result.gender ?? prev.gender,
        }))
      }
    }
    setErrors((prev) => ({ ...prev, id_number: undefined }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!formData.first_name.trim()) errs.first_name = 'Required'
    if (!formData.last_name.trim()) errs.last_name = 'Required'
    if (!formData.id_number.trim()) {
      errs.id_number = 'Required'
    }
    if (!formData.cell_number.trim()) errs.cell_number = 'Required'
    if (!formData.email.trim()) {
      errs.email = 'Required'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address'
    }
    if (formData.service_categories.length === 0) {
      errs.service_categories = 'Select at least one category'
    }
    return errs
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fix the errors below')
      return
    }

    setSaving(true)

    const payload: NewSupplier = {
      status: 'active',
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      id_number: formData.id_number.trim(),
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender !== '' ? formData.gender : null,
      profile_photo_url: null,
      cell_number: formData.cell_number.trim(),
      whatsapp_number: null,
      email: formData.email.trim().toLowerCase(),
      emergency_contact_name: null,
      emergency_contact_number: null,
      street_address: null,
      suburb: formData.suburb.trim() || null,
      city: formData.city.trim() || null,
      province: formData.province !== '' ? formData.province : null,
      postal_code: null,
      regions_covered: [],
      service_categories: formData.service_categories,
      qualifications: formData.qualifications.trim() || null,
      professional_reg_number: null,
      registration_body: null,
      years_experience: null,
      bio: null,
      languages_spoken: [],
      has_own_transport: formData.has_own_transport,
      car_registration: null,
      car_make_model: null,
      willing_to_travel: formData.willing_to_travel,
      max_travel_distance_km: null,
      has_police_clearance: false,
      police_clearance_date: null,
      has_indemnity_insurance: false,
      indemnity_insurance_expiry: null,
      notes: null,
      rate_per_day: null,
      rate_per_hour: null,
      rate_notes: null,
      bank_name: null,
      bank_account_holder: null,
      bank_account_number: null,
      bank_account_type: null,
      bank_branch_code: null,
    }

    if (isEdit && id) {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', id)
      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
      toast.success('Supplier updated')
      navigate(`/suppliers/${id}`)
    } else {
      const { data, error } = await supabase.from('suppliers').insert([payload]).select('id').single()
      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
      toast.success('Supplier added')
      navigate(`/suppliers/${(data as { id: string }).id}`)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={isEdit && id ? `/suppliers/${id}` : '/suppliers'}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* ── Personal Information ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader>Personal Information</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required error={errors.first_name}>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                placeholder="Jane"
                className={inputCls(errors.first_name)}
              />
            </Field>

            <Field label="Last name" required error={errors.last_name}>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                placeholder="Smith"
                className={inputCls(errors.last_name)}
              />
            </Field>

            <Field label="ID / Passport number" required error={errors.id_number}>
              <input
                type="text"
                maxLength={50}
                value={formData.id_number}
                onChange={(e) => set('id_number', e.target.value)}
                onBlur={handleIdBlur}
                placeholder="SA ID, passport or foreign ID number"
                className={inputCls(errors.id_number)}
              />
            </Field>

            <Field label="Cell number" required error={errors.cell_number}>
              <input
                type="tel"
                value={formData.cell_number}
                onChange={(e) => set('cell_number', e.target.value)}
                placeholder="082 000 0000"
                className={inputCls(errors.cell_number)}
              />
            </Field>

            <Field label="Email address" required error={errors.email}>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
                className={inputCls(errors.email)}
              />
            </Field>

            <Field label="Gender">
              <select
                value={formData.gender}
                onChange={(e) => set('gender', e.target.value as Gender | '')}
                className={inputCls()}
              >
                <option value="">— auto-filled from ID —</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>

            {formData.date_of_birth && (
              <Field label="Date of birth">
                <div className={`${inputCls()} bg-gray-50 text-gray-500 cursor-default`}>
                  {formData.date_of_birth}
                  <span className="ml-2 text-xs text-gray-400">(auto-filled)</span>
                </div>
              </Field>
            )}
          </div>
        </section>

        {/* ── Professional ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader>Professional</SectionHeader>

          <div className="space-y-4">
            <Field
              label="Service categories"
              required
              error={errors.service_categories}
            >
              <div className="flex flex-wrap gap-2 mt-1">
                {categories.map((cat) => {
                  const active = formData.service_categories.includes(cat.slug)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
              {errors.service_categories && (
                <p className="mt-1.5 text-xs text-red-600">{errors.service_categories}</p>
              )}
            </Field>

            <Field label="Qualifications">
              <textarea
                rows={3}
                value={formData.qualifications}
                onChange={(e) => set('qualifications', e.target.value)}
                placeholder="Relevant qualifications, certifications…"
                className={`${inputCls()} resize-none`}
              />
            </Field>
          </div>
        </section>

        {/* ── Location ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader>Location</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Province">
              <select
                value={formData.province}
                onChange={(e) => set('province', e.target.value as Province | '')}
                className={inputCls()}
              >
                <option value="">Select province…</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="City">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Johannesburg"
                className={inputCls()}
              />
            </Field>

            <Field label="Suburb">
              <input
                type="text"
                value={formData.suburb}
                onChange={(e) => set('suburb', e.target.value)}
                placeholder="e.g. Sandton"
                className={inputCls()}
              />
            </Field>
          </div>
        </section>

        {/* ── Logistics ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader>Logistics</SectionHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_own_transport}
                onChange={(e) => set('has_own_transport', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Has own transport</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.willing_to_travel}
                onChange={(e) => set('willing_to_travel', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Willing to travel</span>
            </label>
          </div>
        </section>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            to={isEdit && id ? `/suppliers/${id}` : '/suppliers'}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add supplier'}
          </button>
        </div>
      </form>
    </div>
  )
}
