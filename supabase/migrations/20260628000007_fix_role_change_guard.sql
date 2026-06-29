-- Fix the role-change guard so it only blocks an AUTHENTICATED non-admin user.
-- Previously it also blocked trusted server-side / SQL-editor / service_role
-- contexts (where auth.uid() is null), which made it impossible to promote the
-- first admin. Those contexts are gated by RLS already, so they're trusted here.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change a profile role';
  end if;
  return new;
end;
$$;
