-- =============================================================================
-- Migration: 002_storage_policies_and_id_relaxation.sql
-- 1. Create supplier-documents storage bucket (if absent)
-- 2. Add storage RLS policies so authenticated users can upload/read/delete
-- 3. Relax the id_number format check to allow non-SA IDs (passports, etc.)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-documents',
  'supplier-documents',
  false,
  20971520,   -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------------
-- 2. Storage RLS policies
-- ---------------------------------------------------------------------------

-- INSERT (upload)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Authenticated users can upload supplier documents'
  ) then
    execute $policy$
      create policy "Authenticated users can upload supplier documents"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'supplier-documents')
    $policy$;
  end if;
end$$;

-- SELECT (download / signed URLs)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Authenticated users can read supplier documents'
  ) then
    execute $policy$
      create policy "Authenticated users can read supplier documents"
        on storage.objects
        for select
        to authenticated
        using (bucket_id = 'supplier-documents')
    $policy$;
  end if;
end$$;

-- DELETE
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Authenticated users can delete supplier documents'
  ) then
    execute $policy$
      create policy "Authenticated users can delete supplier documents"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'supplier-documents')
    $policy$;
  end if;
end$$;

-- UPDATE (upsert / replace)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Authenticated users can update supplier documents'
  ) then
    execute $policy$
      create policy "Authenticated users can update supplier documents"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'supplier-documents')
    $policy$;
  end if;
end$$;


-- ---------------------------------------------------------------------------
-- 3. Relax id_number format check
--    Old: must be exactly 13 digits (SA only)
--    New: 1–50 characters, letters/digits/spaces/hyphens (covers SA IDs,
--         passports, and most international ID formats)
-- ---------------------------------------------------------------------------

alter table public.suppliers
  drop constraint if exists suppliers_id_number_format_check;

alter table public.suppliers
  add constraint suppliers_id_number_format_check
    check (
      id_number is null
      or (
        length(trim(id_number)) between 1 and 50
        and trim(id_number) ~ '^[A-Za-z0-9][A-Za-z0-9 \-]*$'
      )
    );

comment on column public.suppliers.id_number
  is 'ID or passport number. Accepts SA 13-digit IDs and international formats (1–50 alphanumeric chars, spaces, hyphens).';
