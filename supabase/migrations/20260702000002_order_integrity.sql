-- Order integrity guard (pentest finding F4).
--
-- orders_insert RLS only checks `user_id = auth.uid()`, so the client controls
-- the whole order JSON — including status, payment, and total. A customer could
-- insert an order already "Delivered", mark payment "confirmed", mint a receipt,
-- or set total = ₹1. Manual payment confirmation caught the money side, but this
-- closes it at the data layer.
--
-- This BEFORE INSERT trigger (non-admin inserts only) forces a safe initial
-- lifecycle and recomputes the authoritative total from the line items. Legit
-- orders are unaffected: the checkout already inserts status "Order Placed",
-- pending payment, and total == sum(lineTotal), so this is a no-op for them.

create or replace function public.orders_guard_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  d         jsonb;
  it        jsonb;
  qty       int;
  unit      numeric;
  line      numeric;
  sum_lines numeric := 0;
  n_items   int;
begin
  -- Admins / POS may create orders with explicit state (e.g. an already-paid
  -- walk-in sale), so don't constrain them.
  if public.is_admin() then
    return new;
  end if;

  d := coalesce(new.data, '{}'::jsonb);

  -- 1) Force a safe initial lifecycle — no self-confirming payment, no jumping
  --    straight to Processing/Delivered, no self-minted receipt.
  d := jsonb_set(d, '{status}', '"Order Placed"'::jsonb, true);
  d := jsonb_set(d, '{payment}', '{"status":"pending","paidAmount":0}'::jsonb, true);
  d := d - 'receiptNumber' - 'receiptUrl' - 'cancellation';
  new.status := 'Order Placed';

  -- 2) Recompute the authoritative total from the (discount-inclusive) line
  --    totals so a tampered `total` cannot understate the order.
  n_items := jsonb_array_length(coalesce(d->'items', '[]'::jsonb));
  if n_items > 0 then
    for it in select value from jsonb_array_elements(d->'items') loop
      qty := coalesce((it->>'quantity')::int, 1);
      if qty < 1 then
        raise exception 'orders_guard: invalid quantity %', qty;
      end if;
      unit := coalesce((it->>'unitPrice')::numeric, 0);
      line := coalesce((it->>'lineTotal')::numeric, unit * qty);
      if line < 0 then
        raise exception 'orders_guard: negative line total';
      end if;
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

drop trigger if exists orders_guard_insert on public.orders;
create trigger orders_guard_insert
  before insert on public.orders
  for each row execute function public.orders_guard_insert();
