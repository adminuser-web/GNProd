-- Grainood — initial schema + Row Level Security (RLS)
-- Backend migration: Firebase -> Supabase (Postgres).
-- Mirrors the existing security model: public catalog/content, admin-only writes,
-- customers access only their own orders/builds/tickets/notifications, immutable audit log.
-- Prices are stored as integer INR (whole rupees).

-- ────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ────────────────────────────────────────────────────────────────────────────

-- Keep updated_at fresh on row updates.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- profiles (1:1 with auth.users)
-- ────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  full_name         text not null default '',
  phone             text not null default '',
  role              text not null default 'customer' check (role in ('customer','admin')),
  dob               date,
  address           jsonb,
  marketing_consent boolean not null default false,
  profile_completed boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check. SECURITY DEFINER so it reads profiles bypassing RLS (prevents
-- infinite recursion when other policies call is_admin()).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, profile_completed)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer', false)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers must not change their own role; only admins can.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) and not public.is_admin() then
    raise exception 'Only admins can change a profile role';
  end if;
  return new;
end;
$$;
create trigger profiles_prevent_role_change before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ────────────────────────────────────────────────────────────────────────────
-- Catalog: series, products (sub-series), reviews
-- ────────────────────────────────────────────────────────────────────────────
create table public.series (
  slug           text primary key,
  name           text not null,
  grade          text not null,
  tagline        text,
  description    text,
  sort_order     int  not null,
  starting_price integer,            -- INR
  is_single      boolean not null default false,  -- Immortal = true
  media          jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger series_set_updated_at before update on public.series
  for each row execute function public.set_updated_at();

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  series_slug    text not null references public.series(slug) on delete cascade,
  slug           text not null,
  name           text not null,
  sku            text,
  grade          text,               -- inherited snapshot from series
  price          integer,            -- INR
  description    text,
  player_level   text,
  media          jsonb,
  specs          jsonb,
  customizations jsonb,              -- option groups; option IDs are kebab-case
  sort_order     int not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (series_slug, slug)
);
create index products_series_idx on public.products(series_slug);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name       text not null,
  rating     int  not null check (rating between 1 and 5),
  text       text not null default '',
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Commerce: orders, builds
-- ────────────────────────────────────────────────────────────────────────────
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  items               jsonb not null,          -- immutable snapshot
  subtotal            integer not null default 0,
  customization_total integer not null default 0,
  total               integer not null default 0,
  status              text not null default 'pending',
  payment             jsonb,                   -- {status, method, reference, paidAmount, proofImageUrl, notes}
  shipping_address    jsonb,
  tracking            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.builds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text,
  snapshot   jsonb not null,
  created_at timestamptz not null default now()
);
create index builds_user_idx on public.builds(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Engagement: enquiries, support_tickets, notifications
-- ────────────────────────────────────────────────────────────────────────────
create table public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  message     text not null default '',
  product_ref text,
  status      text not null default 'new',
  created_at  timestamptz not null default now()
);

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,           -- warranty | repair | return | order-query
  subject     text,
  messages    jsonb not null default '[]'::jsonb,
  attachments jsonb,
  status      text not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets(user_id);
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text,
  title      text,
  body       text,
  read       boolean not null default false,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- CMS: content + content_revisions
-- ────────────────────────────────────────────────────────────────────────────
create table public.content (
  area       text primary key,        -- brand | home | philosophy | contact | footer | legal | seo | reviews
  data       jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create trigger content_set_updated_at before update on public.content
  for each row execute function public.set_updated_at();

create table public.content_revisions (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  data          jsonb not null,
  actor_user_id uuid,
  actor_name    text,
  created_at    timestamptz not null default now()
);
create index content_revisions_area_idx on public.content_revisions(area, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Governance: audit_logs (append-only)
-- ────────────────────────────────────────────────────────────────────────────
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_name    text,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.series            enable row level security;
alter table public.products          enable row level security;
alter table public.reviews           enable row level security;
alter table public.orders            enable row level security;
alter table public.builds            enable row level security;
alter table public.enquiries         enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.notifications     enable row level security;
alter table public.content           enable row level security;
alter table public.content_revisions enable row level security;
alter table public.audit_logs        enable row level security;

-- profiles: self read/update; admins everything. Role changes blocked by trigger.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete
  using (public.is_admin());

-- Public catalog/content: anyone reads; only admins write.
create policy series_read   on public.series   for select using (true);
create policy series_write  on public.series   for all using (public.is_admin()) with check (public.is_admin());
create policy products_read on public.products for select using (true);
create policy products_write on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy reviews_read  on public.reviews  for select using (true);
create policy reviews_write on public.reviews  for all using (public.is_admin()) with check (public.is_admin());
create policy content_read  on public.content  for select using (true);
create policy content_write on public.content  for all using (public.is_admin()) with check (public.is_admin());

-- content_revisions: admin read + insert only (immutable — no update/delete policies).
create policy content_rev_select on public.content_revisions for select using (public.is_admin());
create policy content_rev_insert on public.content_revisions for insert with check (public.is_admin());

-- orders: customer reads/creates own; only admins update/delete (no changing status/payment as customer).
create policy orders_select on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders for insert
  with check (user_id = auth.uid());
create policy orders_admin_update on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders for delete
  using (public.is_admin());

-- builds / support_tickets / notifications: owner + admin.
create policy builds_all on public.builds for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy tickets_select on public.support_tickets for select
  using (user_id = auth.uid() or public.is_admin());
create policy tickets_insert on public.support_tickets for insert
  with check (user_id = auth.uid());
create policy tickets_update on public.support_tickets for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy tickets_admin_delete on public.support_tickets for delete
  using (public.is_admin());

create policy notifications_select on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
create policy notifications_insert on public.notifications for insert
  with check (public.is_admin());
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy notifications_delete on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());

-- enquiries: public create (abuse protection added later); admin read/update/delete.
create policy enquiries_insert on public.enquiries for insert with check (true);
create policy enquiries_select on public.enquiries for select using (public.is_admin());
create policy enquiries_update on public.enquiries for update using (public.is_admin()) with check (public.is_admin());
create policy enquiries_delete on public.enquiries for delete using (public.is_admin());

-- audit_logs: admin read + insert (actor must be self); immutable (no update/delete policies).
create policy audit_select on public.audit_logs for select using (public.is_admin());
create policy audit_insert on public.audit_logs for insert
  with check (public.is_admin() and actor_user_id = auth.uid());
