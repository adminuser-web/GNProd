-- Pricing rules + discount codes as documents. Public read (needed at checkout),
-- admin write.

create table public.pricing_rules (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.pricing_rules enable row level security;
create policy pricing_rules_read  on public.pricing_rules for select using (true);
create policy pricing_rules_write on public.pricing_rules for all using (public.is_admin()) with check (public.is_admin());

create table public.discount_codes (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
create policy discount_codes_read  on public.discount_codes for select using (true);
create policy discount_codes_write on public.discount_codes for all using (public.is_admin()) with check (public.is_admin());
