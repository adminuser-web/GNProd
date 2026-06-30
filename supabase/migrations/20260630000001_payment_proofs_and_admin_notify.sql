-- Payment-by-email flow: private payment-proofs bucket + robust admin
-- new-order notification. RLS is already enabled on every public table and
-- `public.is_admin()` (SECURITY DEFINER) already exists (migration 0001).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Private storage bucket for payment proofs (admin-only; NEVER public)
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

drop policy if exists "payment_proofs_admin_read"   on storage.objects;
drop policy if exists "payment_proofs_admin_insert" on storage.objects;
drop policy if exists "payment_proofs_admin_update" on storage.objects;
drop policy if exists "payment_proofs_admin_delete" on storage.objects;

create policy "payment_proofs_admin_read" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.is_admin());
create policy "payment_proofs_admin_insert" on storage.objects
  for insert with check (bucket_id = 'payment-proofs' and public.is_admin());
create policy "payment_proofs_admin_update" on storage.objects
  for update using (bucket_id = 'payment-proofs' and public.is_admin());
create policy "payment_proofs_admin_delete" on storage.objects
  for delete using (bucket_id = 'payment-proofs' and public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Admin notification on every new order (server-side trigger).
--    Robust: fires regardless of who inserts (guest/customer/admin) and never
--    depends on the client. Message is PII-free (order id + total only).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.notify_admin_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, role_target, type, title, message, link, read)
  values (
    null,
    'admin',
    'order_created',
    'New Order Received',
    'New order ' || left(new.id, 16) || ' — ₹' || coalesce(new.total, 0)::text,
    '/admin/orders/' || new.id,
    false
  );
  return new;
end;
$$;

drop trigger if exists orders_notify_admin on public.orders;
create trigger orders_notify_admin
  after insert on public.orders
  for each row execute function public.notify_admin_new_order();
