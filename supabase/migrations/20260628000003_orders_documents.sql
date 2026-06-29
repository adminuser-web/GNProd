-- Orders stored as documents: the app uses a custom order id (not a uuid) and a
-- rich nested OrderRecord (timeline, payment, shipment, receipt, etc.). Keep
-- user_id + status + total as columns for RLS and admin filtering; the full
-- record lives in `data`.

drop table if exists public.orders cascade;

create table public.orders (
  id         text primary key,                 -- custom order number
  user_id    uuid references auth.users(id) on delete set null,
  status     text,
  total      integer not null default 0,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx    on public.orders(user_id);
create index orders_created_idx on public.orders(created_at desc);

alter table public.orders enable row level security;

-- Customer reads/creates own orders; only admins update/delete (customers can't
-- change status or payment).
create policy orders_select on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert
  with check (user_id = auth.uid());
create policy orders_admin_update on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders for delete
  using (public.is_admin());

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
