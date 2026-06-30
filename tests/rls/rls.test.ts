/**
 * RLS / policy integration tests.
 *
 * Runs against a LOCAL Supabase (`supabase start`) — never production.
 * Provide env: SUPABASE_TEST_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * (the CLI prints these). The suite SKIPS cleanly when they're absent, so the
 * normal `vitest run` is unaffected.
 *
 * CI: see .github/workflows/ci.yml -> rls job (boots supabase, applies
 * migrations, exports the keys, runs `npm run test:rls`).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = !!(URL && ANON && SERVICE);

const run = ready ? describe : describe.skip;

run('RLS policies (local Supabase)', () => {
  let admin: SupabaseClient;       // service role — bypasses RLS, for setup
  let anon: SupabaseClient;        // unauthenticated public client
  const A = { email: `a_${Date.now()}@test.local`, password: 'Passw0rd!a' };
  const B = { email: `b_${Date.now()}@test.local`, password: 'Passw0rd!b' };
  let aClient: SupabaseClient;
  let bClient: SupabaseClient;
  let aId = '';
  let orderAId = `TEST-${Date.now()}`;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
    anon = createClient(URL!, ANON!, { auth: { persistSession: false } });

    // Create two customers via the service role.
    const { data: ua } = await admin.auth.admin.createUser({ email: A.email, password: A.password, email_confirm: true });
    const { data: ub } = await admin.auth.admin.createUser({ email: B.email, password: B.password, email_confirm: true });
    aId = ua.user!.id;

    aClient = createClient(URL!, ANON!, { auth: { persistSession: false } });
    bClient = createClient(URL!, ANON!, { auth: { persistSession: false } });
    await aClient.auth.signInWithPassword(A);
    await bClient.auth.signInWithPassword(B);

    // Seed an order owned by customer A.
    await admin.from('orders').insert({
      id: orderAId, user_id: aId, status: 'Order Placed', total: 14999,
      data: { userId: aId, status: 'Order Placed', customer: { email: A.email }, payment: { status: 'pending' } },
    });
  });

  it('anonymous CANNOT read profiles (no public read)', async () => {
    const { data } = await anon.from('profiles').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('anonymous CAN read the public catalog (products)', async () => {
    const { error } = await anon.from('products').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('a customer can read their OWN order', async () => {
    const { data } = await aClient.from('orders').select('id').eq('id', orderAId);
    expect((data ?? []).length).toBe(1);
  });

  it('a customer CANNOT read another customer\'s order', async () => {
    const { data } = await bClient.from('orders').select('id').eq('id', orderAId);
    expect(data ?? []).toHaveLength(0);
  });

  it('a customer CANNOT change their own role to admin (prevent_role_change)', async () => {
    const { error } = await aClient.from('profiles').update({ role: 'admin' }).eq('id', aId);
    // Either the row is invisible to the write, or the trigger raises — both block escalation.
    const { data: after } = await admin.from('profiles').select('role').eq('id', aId).single();
    expect(after?.role).not.toBe('admin');
    void error;
  });

  it('a customer CANNOT update order status / payment (admin-only)', async () => {
    await aClient.from('orders').update({ status: 'Delivered' }).eq('id', orderAId);
    const { data } = await admin.from('orders').select('status').eq('id', orderAId).single();
    expect(data?.status).toBe('Order Placed'); // unchanged
  });
});
