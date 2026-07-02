// CORS headers for browser-invoked edge functions.
//
// Scope the allowed origin by setting the `CORS_ALLOW_ORIGIN` secret to the
// site origin (e.g. https://grainood.com). Until it's set this falls back to
// "*" so nothing breaks — but set it before/at launch to restrict cross-origin
// callers (F-05). Requests still require a valid bearer token regardless.
const ALLOW_ORIGIN = Deno.env.get('CORS_ALLOW_ORIGIN')?.trim() || '*';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
