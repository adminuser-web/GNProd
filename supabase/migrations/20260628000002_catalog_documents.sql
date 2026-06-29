-- Catalog stored as documents to match the app's nested Product model
-- (each series is one row whose jsonb `data` holds name, grade, subSeries[],
-- customizations, media, etc.). This replaces the normalized series/products
-- tables from the init migration (no data existed in them yet).

drop table if exists public.reviews  cascade;
drop table if exists public.products cascade;
drop table if exists public.series   cascade;

create table public.products (
  id         text primary key,        -- series slug (e.g. 'debutant')
  slug       text not null,
  sort_order int  not null default 0,
  data       jsonb not null,          -- full Product object
  updated_at timestamptz not null default now()
);
create index products_sort_idx on public.products(sort_order);
alter table public.products enable row level security;
create policy products_read  on public.products for select using (true);
create policy products_write on public.products for all using (public.is_admin()) with check (public.is_admin());
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_ref text,                   -- product/series slug (optional)
  name        text not null,
  rating      int  not null check (rating between 1 and 5),
  text        text not null default '',
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy reviews_read  on public.reviews for select using (true);
create policy reviews_write on public.reviews for all using (public.is_admin()) with check (public.is_admin());
