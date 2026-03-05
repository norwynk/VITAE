import { supabase } from './supabase'
import type { SupplierDocumentType } from '../types/supplier'

const BUCKET = 'supplier-documents'

export interface UploadResult {
  path: string
  url: string
}

/**
 * Upload a file for a supplier to the storage bucket.
 * Returns the storage path and the public URL.
 */
export async function uploadSupplierFile(
  supplierId: string,
  documentType: SupplierDocumentType,
  file: File,
): Promise<UploadResult> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const path = `${supplierId}/${documentType}/${timestamp}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`File upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return { path, url: urlData.publicUrl }
}

/**
 * Delete a file from the storage bucket by its storage path.
 */
export async function deleteSupplierFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`)
  }
}

/**
 * Get a signed URL for a private file (valid for 1 hour by default).
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data) {
    throw new Error(`Could not create signed URL: ${error?.message ?? 'unknown error'}`)
  }

  return data.signedUrl
}
