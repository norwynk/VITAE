import { useState, useEffect, useRef } from 'react'
import type { ReactNode, ChangeEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { uploadSupplierFile, deleteSupplierFile, getSignedUrl } from '@/lib/storage'
import type {
  Supplier,
  ServiceCategory,
  SupplierStatus,
  SupplierDocument,
  SupplierDocumentType,
} from '@/types/supplier'

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<SupplierDocumentType, string> = {
  id_copy: 'ID Copy',
  proof_of_address: 'Proof of Address',
  qualification_certificate: 'Qualification Certificate',
  professional_registration: 'Professional Registration',
  police_clearance: 'Police Clearance',
  indemnity_insurance: 'Indemnity Insurance',
  profile_photo: 'Profile Photo',
  other: 'Other',
}

// Types shown in the upload dropdown (profile_photo excluded — handled elsewhere)
const UPLOAD_DOC_TYPES: SupplierDocumentType[] = [
  'id_copy',
  'proof_of_address',
  'qualification_certificate',
  'professional_registration',
  'police_clearance',
  'indemnity_insurance',
  'other',
]

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-7 h-7'
  return (
    <svg className={`${s} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── File type badge ───────────────────────────────────────────────────────────

function FileExtBadge({ fileName }: { fileName: string }) {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase()
  const palette: Record<string, string> = {
    pdf: 'bg-red-100 text-red-700',
    jpg: 'bg-sky-100 text-sky-700',
    jpeg: 'bg-sky-100 text-sky-700',
    png: 'bg-violet-100 text-violet-700',
  }
  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
        palette[ext] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {ext || '?'}
    </div>
  )
}

// ── Supplier delete modal ─────────────────────────────────────────────────────

function SupplierDeleteModal({
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
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            {deleting && <Spinner />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ supplierId }: { supplierId: string }) {
  const [docs, setDocs] = useState<SupplierDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(true)

  // Upload form state
  const [docType, setDocType] = useState<SupplierDocumentType>('id_copy')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Per-row action state
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Fetch documents ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadDocs() {
      const { data, error } = await supabase
        .from('supplier_documents')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('uploaded_at', { ascending: false })
      if (error) {
        toast.error('Failed to load documents')
      } else {
        setDocs(data as SupplierDocument[])
      }
      setDocsLoading(false)
    }
    loadDocs()
  }, [supplierId])

  // ── File picker ─────────────────────────────────────────────────────────────

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    setFile(null)
    setFileError(null)

    if (!picked) return

    if (!ALLOWED_MIME.includes(picked.type)) {
      setFileError('Only PDF, JPG, and PNG files are accepted')
      e.target.value = ''
      return
    }
    if (picked.size > MAX_BYTES) {
      const mb = (picked.size / 1024 / 1024).toFixed(1)
      setFileError(`File is ${mb} MB — maximum allowed size is 20 MB`)
      e.target.value = ''
      return
    }

    setFile(picked)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const { path } = await uploadSupplierFile(supplierId, docType, file)

      const { data: inserted, error: dbErr } = await supabase
        .from('supplier_documents')
        .insert([
          {
            supplier_id: supplierId,
            document_type: docType,
            file_name: file.name,
            storage_path: path,
            uploaded_by: null,
            notes: notes.trim() || null,
          },
        ])
        .select('*')
        .single()

      if (dbErr) throw new Error(dbErr.message)

      setDocs((prev) => [inserted as SupplierDocument, ...prev])
      setFile(null)
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Document uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  // ── View (signed URL) ───────────────────────────────────────────────────────

  async function handleView(doc: SupplierDocument) {
    setViewingId(doc.id)
    try {
      const url = await getSignedUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Could not generate view link')
    }
    setViewingId(null)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(doc: SupplierDocument) {
    setDeletingId(doc.id)
    try {
      await deleteSupplierFile(doc.storage_path)
      const { error } = await supabase.from('supplier_documents').delete().eq('id', doc.id)
      if (error) throw new Error(error.message)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Document deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Upload card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Upload Document
        </h2>

        <div className="space-y-4">
          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as SupplierDocumentType)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
            >
              {UPLOAD_DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              File{' '}
              <span className="font-normal text-gray-400">(PDF, JPG or PNG · max 20 MB)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="sr-only"
              id="doc-file-input"
            />

            <div
              className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
                fileError
                  ? 'border-red-300 bg-red-50'
                  : file
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <label
                htmlFor="doc-file-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Choose file
              </label>

              <span
                className={`text-sm truncate ${
                  file ? 'text-teal-700 font-medium' : 'text-gray-400'
                }`}
              >
                {file ? file.name : 'No file chosen'}
              </span>
            </div>

            {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this document…"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
            />
          </div>

          {/* Upload button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Spinner />
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Uploaded Documents
            {!docsLoading && (
              <span className="ml-2 font-normal normal-case text-gray-400">
                ({docs.length})
              </span>
            )}
          </h2>
        </div>

        {docsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-500">No documents yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a document using the form above</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {docs.map((doc) => {
              const uploadedAt = new Date(doc.uploaded_at).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              const isConfirming = confirmDeleteId === doc.id
              const isDeleting = deletingId === doc.id
              const isViewing = viewingId === doc.id

              return (
                <li key={doc.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    {/* File type badge */}
                    <FileExtBadge fileName={doc.file_name} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{doc.file_name}</p>
                      {doc.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{doc.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{uploadedAt}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isConfirming ? (
                        /* Inline delete confirm */
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-red-700 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60"
                          >
                            {isDeleting ? <Spinner /> : null}
                            {isDeleting ? 'Deleting…' : 'Yes'}
                          </button>
                          <span className="text-red-300">·</span>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* View */}
                          <button
                            onClick={() => handleView(doc)}
                            disabled={isViewing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                          >
                            {isViewing ? (
                              <Spinner />
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            )}
                            {isViewing ? 'Opening…' : 'View'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDeleteId(doc.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents'

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const [supplierRes, catsRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', id).single(),
        supabase.from('service_categories').select('id, name, slug, is_active').eq('is_active', true),
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
    const { error } = await supabase.from('suppliers').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      setSupplier((prev) => (prev ? { ...prev, status: newStatus } : null))
      toast.success('Status updated')
    }
    setStatusUpdating(false)
  }

  // ── Supplier delete ───────────────────────────────────────────────────────

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

  // ── Loading / not found ───────────────────────────────────────────────────

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
        <SupplierDeleteModal
          supplier={supplier}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link to="/suppliers" className="text-gray-400 hover:text-gray-700 transition-colors">
            Suppliers
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-medium truncate">{fullName}</span>
        </div>

        {/* Header card */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <StatusBadge status={supplier.status} />

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

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 mb-5 -mx-0">
          {(['overview', 'documents'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                activeTab === tab
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Section title="Contact">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Cell number" value={supplier.cell_number} />
                <InfoRow label="Email" value={supplier.email} />
                <InfoRow label="WhatsApp" value={supplier.whatsapp_number} />
                <InfoRow label="Emergency contact" value={supplier.emergency_contact_name} />
                <InfoRow label="Emergency number" value={supplier.emergency_contact_number} />
              </dl>
            </Section>

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
                  <InfoRow label="Professional reg. number" value={supplier.professional_reg_number} />
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

            <Section title="Location">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Province" value={supplier.province} />
                <InfoRow label="City" value={supplier.city} />
                <InfoRow label="Suburb" value={supplier.suburb} />
                <InfoRow label="Street address" value={supplier.street_address} />
                <InfoRow label="Postal code" value={supplier.postal_code} />
              </dl>
            </Section>

            <Section title="Logistics">
              <div className="space-y-2.5">
                <BooleanRow label="Has own transport" value={supplier.has_own_transport} />
                <BooleanRow label="Willing to travel" value={supplier.willing_to_travel} />
              </div>
              {(supplier.car_make_model ||
                supplier.car_registration ||
                supplier.max_travel_distance_km != null) && (
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

            <Section title="Compliance">
              <div className="space-y-2.5">
                <BooleanRow label="Police clearance" value={supplier.has_police_clearance} />
                <BooleanRow label="Indemnity insurance" value={supplier.has_indemnity_insurance} />
              </div>
              {(supplier.police_clearance_date || supplier.indemnity_insurance_expiry) && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <InfoRow label="Police clearance date" value={supplier.police_clearance_date} />
                  <InfoRow label="Insurance expiry" value={supplier.indemnity_insurance_expiry} />
                </dl>
              )}
            </Section>

            {/* Danger zone */}
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
        )}

        {/* ── Documents tab ────────────────────────────────────────────────── */}
        {activeTab === 'documents' && <DocumentsTab supplierId={supplier.id} />}
      </div>
    </>
  )
}
