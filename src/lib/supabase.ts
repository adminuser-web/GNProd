import { createClient } from '@supabase/supabase-js';

// Vite exposes env vars prefixed with VITE_ via import.meta.env.
// These are the PUBLIC client credentials (safe to ship) — Row-Level Security
// on the database is what actually protects data. The secret service_role key
// must never appear in the frontend bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev so a missing env var doesn't turn into confusing runtime errors.
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — ' +
      'copy .env.example to .env.local and fill them in (and set them in Vercel).'
  );
}

// Placeholder fallbacks keep createClient from throwing in environments without
// env vars (e.g. unit tests); real values come from .env.local / Vercel.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
