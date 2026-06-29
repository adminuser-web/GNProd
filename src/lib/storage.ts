import { supabase } from './supabase';

export const STORAGE_BUCKET = 'media';

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
