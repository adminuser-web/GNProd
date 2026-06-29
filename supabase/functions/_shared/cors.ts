// Shared CORS headers for browser-invoked edge functions.
// The webhook function does NOT need these (Razorpay calls it server-to-server).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
