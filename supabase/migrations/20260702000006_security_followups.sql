-- Security follow-ups from the 2026-07-02 self-assessment (docs/SECURITY_REPORT.md).
-- F-01 private support-attachments bucket, F-02 discount redemption limit,
-- F-03 rate limit on order inserts.

-- ────────────────────────────────────────────────────────────────────────────
-- F-01: Private bucket for support-ticket attachments.
-- Previously attachments went into the PUBLIC `media` bucket (world-readable by
-- URL). Move them to a private bucket; owner + admin read via short-lived
-- signed URLs. Path convention: `<uid>/<ticketId>/<file>`.
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "support_att_insert" on storage.objects;
drop policy if exists "support_att_select" on storage.objects;
drop policy if exists "support_att_update" on storage.objects;
drop policy if exists "support_att_delete" on storage.objects;

-- A signed-in customer may upload only into their own folder; admins anywhere.
create policy "support_att_insert" on storage.objects
  for insert with check (
    bucket_id = 'support-attachments' and (
      public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  );

-- Owner reads their own files; admins read all. (Signed URLs are generated
-- against this SELECT permission, so they only work for owner/admin.)
create policy "support_att_select" on storage.objects
  for select using (
    bucket_id = 'support-attachments' and (
      public.is_admin()
      or name like (auth.uid()::text || '/%')
    )
  );

-- Only admins may replace/delete attachments.
create policy "support_att_update" on storage.objects
  for update using (bucket_id = 'support-attachments' and public.is_admin())
  with check (bucket_id = 'support-attachments' and public.is_admin());
create policy "support_att_delete" on storage.objects
  for delete using (bucket_id = 'support-attachments' and public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- F-02: Discount-code redemption limit.
-- Codes may carry an optional integer `maxUses`. A code is invalid once the
-- number of CONFIRMED-payment orders that used it reaches maxUses. Codes with
-- no `maxUses` stay unlimited (backward compatible). Authoritative enforcement
-- also happens in the razorpay-create-order edge function; this RPC keeps the
-- client's live validation honest.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.discount_redemptions(p_code text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.orders o
  where lower(o.data->'discount'->>'code') = lower(trim(p_code))
    and (o.data->'payment'->>'status') = 'confirmed';
$$;
grant execute on function public.discount_redemptions(text) to service_role;

create or replace function public.validate_discount_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select d.data
  from public.discount_codes d
  where lower(d.data->>'code') = lower(trim(p_code))
    and coalesce((d.data->>'active')::boolean, false) = true
    and (
      d.data->>'expiresAt' is null
      or (d.data->>'expiresAt')::bigint >= (extract(epoch from now()) * 1000)::bigint
    )
    and (
      (d.data->>'maxUses') is null
      or (d.data->>'maxUses') = ''
      or public.discount_redemptions(p_code) < (d.data->>'maxUses')::int
    )
  limit 1;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- F-03: Rate limit on order inserts.
-- The Razorpay flow creates orders via the service role (bypassed here). This
-- only throttles DIRECT client inserts — the abuse/spam vector — at 8 per 10
-- minutes per user (fallback IP). Admins/POS are never limited.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.orders_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare ident text;
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;
  ident := coalesce(auth.uid()::text, public.rl_client_ip());
  if not public.rl_check('order', ident, 8, interval '10 minutes') then
    raise exception 'Too many orders — please wait a few minutes and try again.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_rate_limit on public.orders;
create trigger orders_rate_limit before insert on public.orders
  for each row execute function public.orders_rate_limit();
