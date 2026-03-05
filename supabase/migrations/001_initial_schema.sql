-- =============================================================================
-- OSW Supplier Tracker — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";   -- gen_random_uuid() fallback
create extension if not exists "unaccent";   -- accent-insensitive search (future use)


-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at timestamp
-- ---------------------------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- TABLE: service_categories
-- Reference data — seed immediately after creation.
-- =============================================================================

create table if not exists public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  is_active  boolean not null default true,

  constraint service_categories_name_key unique (name),
  constraint service_categories_slug_key unique (slug)
);

comment on table  public.service_categories               is 'Wellness service categories available in the platform.';
comment on column public.service_categories.slug          is 'URL-safe lowercase identifier derived from the name.';


-- ---------------------------------------------------------------------------
-- Indexes: service_categories
-- ---------------------------------------------------------------------------

create index if not exists idx_service_categories_slug
  on public.service_categories (slug);

create index if not exists idx_service_categories_is_active
  on public.service_categories (is_active);


-- =============================================================================
-- TABLE: suppliers
-- =============================================================================

create table if not exists public.suppliers (

  -- Identity
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  status        text not null default 'pending',

  -- Personal information
  first_name             text not null,
  last_name              text not null,
  id_number              text,                          -- SA 13-digit ID
  date_of_birth          date,
  gender                 text,
  profile_photo_url      text,

  -- Contact details
  cell_number              text not null,
  whatsapp_number          text,
  email                    text not null,
  emergency_contact_name   text,
  emergency_contact_number text,

  -- Address
  street_address  text,
  suburb          text,
  city            text,
  province        text,
  postal_code     text,

  -- Coverage & services
  regions_covered    text[] not null default '{}',
  service_categories text[] not null default '{}',

  -- Professional details
  qualifications         text,
  professional_reg_number text,
  registration_body      text,
  years_experience       integer,
  bio                    text,
  languages_spoken       text[] not null default '{}',

  -- Transport & travel
  has_own_transport        boolean not null default false,
  car_registration         text,
  car_make_model           text,
  willing_to_travel        boolean not null default false,
  max_travel_distance_km   integer,

  -- Compliance
  has_police_clearance        boolean not null default false,
  police_clearance_date       date,
  has_indemnity_insurance     boolean not null default false,
  indemnity_insurance_expiry  date,

  -- Internal notes
  notes  text,

  -- Rates
  rate_per_day   numeric(10, 2),
  rate_per_hour  numeric(10, 2),
  rate_notes     text,

  -- Banking
  bank_name             text,
  bank_account_holder   text,
  bank_account_number   text,
  bank_account_type     text,
  bank_branch_code      text,

  -- -------------------------------------------------------------------------
  -- Constraints
  -- -------------------------------------------------------------------------

  constraint suppliers_status_check
    check (status in ('active', 'inactive', 'pending')),

  constraint suppliers_gender_check
    check (gender in ('male', 'female', 'other', 'prefer_not_to_say') or gender is null),

  constraint suppliers_province_check
    check (province in (
      'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
      'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
    ) or province is null),

  constraint suppliers_bank_account_type_check
    check (bank_account_type in ('cheque', 'savings') or bank_account_type is null),

  constraint suppliers_id_number_format_check
    check (id_number ~ '^\d{13}$' or id_number is null),

  constraint suppliers_years_experience_check
    check (years_experience >= 0 or years_experience is null),

  constraint suppliers_max_travel_distance_check
    check (max_travel_distance_km >= 0 or max_travel_distance_km is null),

  constraint suppliers_rate_per_day_check
    check (rate_per_day >= 0 or rate_per_day is null),

  constraint suppliers_rate_per_hour_check
    check (rate_per_hour >= 0 or rate_per_hour is null),

  constraint suppliers_id_number_key unique (id_number),
  constraint suppliers_email_key      unique (email)
);

comment on table  public.suppliers                        is 'Wellness service suppliers / contractors for One Stop Wellness.';
comment on column public.suppliers.id_number              is '13-digit South African ID number. Validated by application layer (Luhn).';
comment on column public.suppliers.regions_covered        is 'Array of geographic regions this supplier is willing to work in.';
comment on column public.suppliers.service_categories     is 'Array of service category slugs this supplier offers.';
comment on column public.suppliers.languages_spoken       is 'Languages the supplier is comfortable working in.';


-- ---------------------------------------------------------------------------
-- Trigger: keep updated_at current
-- ---------------------------------------------------------------------------

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function update_updated_at_column();


-- ---------------------------------------------------------------------------
-- Indexes: suppliers
-- ---------------------------------------------------------------------------

-- Filtered lookups
create index if not exists idx_suppliers_status
  on public.suppliers (status);

create index if not exists idx_suppliers_province
  on public.suppliers (province);

create index if not exists idx_suppliers_email
  on public.suppliers (email);

create index if not exists idx_suppliers_id_number
  on public.suppliers (id_number);

-- GIN indexes for array columns (contains / overlap queries)
create index if not exists idx_suppliers_regions_covered
  on public.suppliers using gin (regions_covered);

create index if not exists idx_suppliers_service_categories
  on public.suppliers using gin (service_categories);

create index if not exists idx_suppliers_languages_spoken
  on public.suppliers using gin (languages_spoken);

-- Compliance expiry monitoring
create index if not exists idx_suppliers_indemnity_expiry
  on public.suppliers (indemnity_insurance_expiry)
  where indemnity_insurance_expiry is not null;

create index if not exists idx_suppliers_police_clearance_date
  on public.suppliers (police_clearance_date)
  where police_clearance_date is not null;

-- Full-text search across name fields
create index if not exists idx_suppliers_fulltext
  on public.suppliers using gin (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name,  '') || ' ' ||
      coalesce(email,      '') || ' ' ||
      coalesce(city,       '') || ' ' ||
      coalesce(bio,        '')
    )
  );


-- =============================================================================
-- TABLE: supplier_documents
-- =============================================================================

create table if not exists public.supplier_documents (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.suppliers (id) on delete cascade,
  document_type text not null,
  file_name     text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now(),
  uploaded_by   uuid references auth.users (id) on delete set null,
  notes         text,

  constraint supplier_documents_document_type_check
    check (document_type in (
      'id_copy',
      'proof_of_address',
      'qualification_certificate',
      'professional_registration',
      'police_clearance',
      'indemnity_insurance',
      'profile_photo',
      'other'
    )),

  constraint supplier_documents_storage_path_key unique (storage_path)
);

comment on table  public.supplier_documents               is 'Files uploaded for a supplier, stored in Supabase Storage.';
comment on column public.supplier_documents.storage_path  is 'Path within the supplier-documents storage bucket.';
comment on column public.supplier_documents.uploaded_by   is 'Auth user who uploaded the document.';


-- ---------------------------------------------------------------------------
-- Indexes: supplier_documents
-- ---------------------------------------------------------------------------

create index if not exists idx_supplier_documents_supplier_id
  on public.supplier_documents (supplier_id);

create index if not exists idx_supplier_documents_document_type
  on public.supplier_documents (document_type);

create index if not exists idx_supplier_documents_supplier_type
  on public.supplier_documents (supplier_id, document_type);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on every table
alter table public.service_categories  enable row level security;
alter table public.suppliers           enable row level security;
alter table public.supplier_documents  enable row level security;


-- ---------------------------------------------------------------------------
-- Policies: service_categories
-- Authenticated users can read. Only authenticated users can manage.
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read service categories"
  on public.service_categories
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert service categories"
  on public.service_categories
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update service categories"
  on public.service_categories
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete service categories"
  on public.service_categories
  for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- Policies: suppliers
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read suppliers"
  on public.suppliers
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert suppliers"
  on public.suppliers
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update suppliers"
  on public.suppliers
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete suppliers"
  on public.suppliers
  for delete
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- Policies: supplier_documents
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read supplier documents"
  on public.supplier_documents
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert supplier documents"
  on public.supplier_documents
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update supplier documents"
  on public.supplier_documents
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete supplier documents"
  on public.supplier_documents
  for delete
  to authenticated
  using (true);


-- =============================================================================
-- SEED DATA: service_categories
-- 20 corporate wellness categories for One Stop Wellness (South Africa)
-- =============================================================================

insert into public.service_categories (name, slug, is_active) values
  ('Yoga',                          'yoga',                        true),
  ('Pilates',                       'pilates',                     true),
  ('Meditation & Mindfulness',      'meditation-mindfulness',      true),
  ('Massage Therapy',               'massage-therapy',             true),
  ('Personal Training',             'personal-training',           true),
  ('Nutrition & Dietetics',         'nutrition-dietetics',         true),
  ('Life Coaching',                 'life-coaching',               true),
  ('Corporate Wellness Facilitation','corporate-wellness-facilitation', true),
  ('Mental Health Counselling',     'mental-health-counselling',   true),
  ('Physiotherapy',                 'physiotherapy',               true),
  ('Occupational Therapy',          'occupational-therapy',        true),
  ('Reflexology',                   'reflexology',                 true),
  ('Aromatherapy',                  'aromatherapy',                true),
  ('Stress Management',             'stress-management',           true),
  ('Financial Wellness Coaching',   'financial-wellness-coaching', true),
  ('Sleep Coaching',                'sleep-coaching',              true),
  ('Art Therapy',                   'art-therapy',                 true),
  ('Sound Healing',                 'sound-healing',               true),
  ('Health Screening & Assessment', 'health-screening-assessment', true),
  ('Employee Assistance Programme', 'employee-assistance-programme', true)
on conflict (slug) do nothing;
