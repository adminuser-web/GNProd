import { supabase } from './supabase';

export const STORAGE_BUCKET = 'media';
export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';

/**
 * Upload to a PRIVATE bucket and return the object PATH (not a URL — the bucket
 * is private). Used for payment proofs; only admins can read via a signed URL.
 * RLS on the bucket restricts upload/read to admins.
 */
export async function uploadPrivate(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/**
 * Generate a short-lived signed URL for a private object. Works from an admin
 * session because the bucket's RLS allows admin SELECT. Default 5 minutes.
 */
export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 * `path` is the object path within the bucket (e.g. "products/slug/123-name.jpg").
 */
export async function uploadToStorage(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
