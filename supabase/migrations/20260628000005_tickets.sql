-- Support tickets as documents (full SupportTicket in `data`, internal admin
-- notes in `notes`). Replaces the normalized support_tickets table.

drop table if exists public.support_tickets cascade;

create table public.tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  status     text not null default 'open',
  data       jsonb not null,
  notes      jsonb not null default '[]'::jsonb,   -- admin-only internal notes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_user_idx    on public.tickets(user_id);
create index tickets_created_idx on public.tickets(created_at desc);

alter table public.tickets enable row level security;
create policy tickets_select on public.tickets for select
  using (user_id = auth.uid() or public.is_admin());
create policy tickets_insert on public.tickets for insert
  with check (user_id = auth.uid() or public.is_admin());
create policy tickets_update on public.tickets for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy tickets_admin_delete on public.tickets for delete
  using (public.is_admin());

create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();
