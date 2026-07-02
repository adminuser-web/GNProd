-- Sequential, human-friendly order numbers (GRN-1001, GRN-1002, …) instead of
-- random ids. Atomic via a Postgres sequence so concurrent checkouts never
-- collide. The razorpay-create-order edge function (service role) reserves the
-- next number; both the internal id and the customer-facing number use it.

create sequence if not exists public.order_number_seq start with 1001 increment by 1;

-- Server-only: reserve the next order number. Not granted to anon/authenticated
-- (orders are created by the edge function under the service role).
create or replace function public.next_order_number()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.order_number_seq');
$$;

revoke all on function public.next_order_number() from public;
grant execute on function public.next_order_number() to service_role;
