-- Lock down discount_codes: stop the anon key from enumerating all promo codes.
-- Reads are now admin-only; customers validate a single pasted code via a
-- SECURITY DEFINER RPC that returns ONLY the matching active code (or null) —
-- no way to list the table.

-- 1) Restrict direct SELECT to admins (writes were already admin-only).
drop policy if exists discount_codes_read on public.discount_codes;
create policy discount_codes_read on public.discount_codes
  for select using (public.is_admin());

-- 2) Validate one code, server-side. Case-insensitive; honours active + expiry
--    (expiresAt is epoch milliseconds, matching the app's DiscountCode type).
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
  limit 1;
$$;

-- Anyone may VALIDATE a code they already know; they still can't LIST codes.
grant execute on function public.validate_discount_code(text) to anon, authenticated;
