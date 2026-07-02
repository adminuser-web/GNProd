// Edge function: cancel-order (CUSTOMER self-cancel, PRE-PAYMENT only)
//
// RLS makes orders admin-only to update, so a customer can't cancel their own
// order directly. This lets the ORDER OWNER cancel an order that hasn't been
// paid yet ("Awaiting Payment"). Once payment is confirmed, self-cancel is
// refused — the customer must go through support (no money is moved here).
//
// Deploy:  supabase functions deploy cancel-order   (JWT verification ON —
//          the caller must be the authenticated order owner.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const log = (m: string) => console.log(`[cancel-order] ${m}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.orderId ?? '').trim();
    const reason = String(body?.reason ?? '').trim().slice(0, 300);
    if (!orderId) return json({ ok: false, error: 'bad_request' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin.from('orders').select('id, user_id, status, data').eq('id', orderId).maybeSingle();
    // Same response for missing and not-owned — don't leak order existence.
    if (!row || row.user_id !== user.id) return json({ ok: false, error: 'not_found' }, 404);

    const d: any = row.data ?? {};
    const status = d.status ?? row.status;
    if (status === 'Cancelled') return json({ ok: true, already: true });

    // Only PRE-PAYMENT orders can be self-cancelled. Paid/processing → support.
    const paid = d.payment?.status === 'confirmed';
    if (paid || status !== 'Awaiting Payment') return json({ ok: false, error: 'not_cancellable' }, 409);

    const nowIso = new Date().toISOString();
    const newData = {
      ...d,
      status: 'Cancelled',
      cancellation: { reason: reason || 'Cancelled by customer before payment', at: nowIso, by: 'customer' },
      payment: { ...(d.payment || {}), status: 'cancelled' },
      timeline: [...(d.timeline || []), { status: 'Cancelled', timestamp: nowIso, changedBy: 'customer', note: 'Cancelled by customer before payment' }],
      updatedAt: nowIso,
    };
    const { error } = await admin.from('orders').update({ data: newData, status: 'Cancelled' }).eq('id', row.id);
    if (error) { log(`update failed: ${error.message}`); return json({ ok: false, error: 'server_error' }, 500); }

    log(`order ${row.id} self-cancelled`);
    return json({ ok: true, orderId: row.id });
  } catch (e) {
    log(`unhandled: ${(e as Error).message}`);
    return json({ ok: false, error: 'server_error' }, 500);
  }
});
