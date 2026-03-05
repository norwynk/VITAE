// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

export type SupplierStatus = 'active' | 'inactive' | 'pending'

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export type Province =
  | 'Gauteng'
  | 'Western Cape'
  | 'KwaZulu-Natal'
  | 'Eastern Cape'
  | 'Limpopo'
  | 'Mpumalanga'
  | 'North West'
  | 'Free State'
  | 'Northern Cape'

export type BankAccountType = 'cheque' | 'savings'

export type SupplierDocumentType =
  | 'id_copy'
  | 'proof_of_address'
  | 'qualification_certificate'
  | 'professional_registration'
  | 'police_clearance'
  | 'indemnity_insurance'
  | 'profile_photo'
  | 'other'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SA_PROVINCES: Province[] = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Free State',
  'Northern Cape',
]

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

export interface Supplier {
  id: string
  created_at: string
  updated_at: string

  // Status
  status: SupplierStatus

  // Personal information
  first_name: string
  last_name: string
  id_number: string // 13-digit SA ID
  date_of_birth: string | null // ISO date string
  gender: Gender | null
  profile_photo_url: string | null

  // Contact details
  cell_number: string
  whatsapp_number: string | null
  email: string
  emergency_contact_name: string | null
  emergency_contact_number: string | null

  // Address
  street_address: string | null
  suburb: string | null
  city: string | null
  province: Province | null
  postal_code: string | null

  // Coverage & services
  regions_covered: string[]
  service_categories: string[]

  // Professional details
  qualifications: string | null
  professional_reg_number: string | null
  registration_body: string | null
  years_experience: number | null
  bio: string | null
  languages_spoken: string[]

  // Transport & travel
  has_own_transport: boolean
  car_registration: string | null
  car_make_model: string | null
  willing_to_travel: boolean
  max_travel_distance_km: number | null

  // Compliance
  has_police_clearance: boolean
  police_clearance_date: string | null // ISO date string
  has_indemnity_insurance: boolean
  indemnity_insurance_expiry: string | null // ISO date string

  // Internal notes
  notes: string | null

  // Rates
  rate_per_day: number | null
  rate_per_hour: number | null
  rate_notes: string | null

  // Banking
  bank_name: string | null
  bank_account_holder: string | null
  bank_account_number: string | null
  bank_account_type: BankAccountType | null
  bank_branch_code: string | null
}

// Omit server-generated fields when creating a new supplier
export type NewSupplier = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>

// Allow partial updates
export type UpdateSupplier = Partial<NewSupplier>

// ---------------------------------------------------------------------------
// SupplierDocument
// ---------------------------------------------------------------------------

export interface SupplierDocument {
  id: string
  supplier_id: string
  document_type: SupplierDocumentType
  file_name: string
  storage_path: string
  uploaded_at: string
  uploaded_by: string | null
  notes: string | null
}

export type NewSupplierDocument = Omit<SupplierDocument, 'id' | 'uploaded_at'>

// ---------------------------------------------------------------------------
// ServiceCategory
// ---------------------------------------------------------------------------

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  is_active: boolean
}
