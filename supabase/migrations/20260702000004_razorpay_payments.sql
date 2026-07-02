-- Razorpay pay-at-checkout: payment-event idempotency + let the server create
-- pending ("Awaiting Payment") orders past the F4 order-integrity guard.

-- Idempotency log for webhook events (service-role only; no client access).
create table if not exists public.payment_events (
  event_id   text primary key,
  event_type text,
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
-- no policies: only SECURITY DEFINER / service-role writes here.

-- The order-integrity guard (20260702000002) forces status='Order Placed' for
-- non-admin inserts. The razorpay-create-order function runs as the service
-- role and must be able to insert an authoritative "Awaiting Payment" order,
-- so let the service role through untouched (it is trusted, server-side).
create or replace function public.orders_guard_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  d jsonb; it jsonb; qty int; unit numeric; line numeric; sum_lines numeric := 0; n_items int;
begin
  -- Trusted callers: admins (POS) and the server (edge functions via service role).
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  d := coalesce(new.data, '{}'::jsonb);
  d := jsonb_set(d, '{status}', '"Order Placed"'::jsonb, true);
  d := jsonb_set(d, '{payment}', '{"status":"pending","paidAmount":0}'::jsonb, true);
  d := d - 'receiptNumber' - 'receiptUrl' - 'cancellation';
  new.status := 'Order Placed';

  n_items := jsonb_array_length(coalesce(d->'items', '[]'::jsonb));
  if n_items > 0 then
    for it in select value from jsonb_array_elements(d->'items') loop
      qty := coalesce((it->>'quantity')::int, 1);
      if qty < 1 then raise exception 'orders_guard: invalid quantity %', qty; end if;
      unit := coalesce((it->>'unitPrice')::numeric, 0);
      line := coalesce((it->>'lineTotal')::numeric, unit * qty);
      if line < 0 then raise exception 'orders_guard: negative line total'; end if;
      sum_lines := sum_lines + line;
    end loop;
    new.total := round(sum_lines);
    d := jsonb_set(d, '{totalPrice}', to_jsonb(round(sum_lines)), true);
    if d ? 'pricing' then
      d := jsonb_set(d, '{pricing,total}', to_jsonb(round(sum_lines)), true);
    end if;
  end if;

  new.data := d;
  return new;
end;
$$;
