-- Reshape notifications + enquiries to match the app's models, and add a
-- customer_notes table for admin CRM notes.

-- notifications: match Notification { userId, roleTarget, type, title, message, link, read }
drop table if exists public.notifications cascade;
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  role_target text not null default 'customer',   -- 'customer' | 'admin'
  type        text,
  title       text,
  message     text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id);
create index notifications_role_idx on public.notifications(role_target);
alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
-- Created by order/enquiry flows (sometimes anonymous enquiries).
create policy notifications_insert on public.notifications for insert with check (true);
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy notifications_delete on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());

-- enquiries as documents (rich Enquiry object). Public create; admin manage.
drop table if exists public.enquiries cascade;
create table public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  status     text not null default 'new',
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries(created_at desc);
alter table public.enquiries enable row level security;
create policy enquiries_insert on public.enquiries for insert with check (true);
create policy enquiries_select on public.enquiries for select using (public.is_admin());
create policy enquiries_update on public.enquiries for update using (public.is_admin()) with check (public.is_admin());
create policy enquiries_delete on public.enquiries for delete using (public.is_admin());

-- customer_notes: one admin-only note per customer.
create table public.customer_notes (
  user_id    uuid primary key,
  note       text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.customer_notes enable row level security;
create policy customer_notes_all on public.customer_notes for all
  using (public.is_admin()) with check (public.is_admin());
