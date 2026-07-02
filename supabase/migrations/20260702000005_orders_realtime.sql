-- Enable Supabase Realtime for orders so the admin board/detail page and the
-- customer "My Orders" page update live after any status/payment change
-- (no manual refresh). RLS still applies to realtime, so customers only get
-- their own orders and admins get all.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
