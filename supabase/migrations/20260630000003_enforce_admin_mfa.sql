-- Enforce MFA for admins at the DATA layer (the real security boundary).
--
-- Before this, is_admin() only checked profiles.role — so a password-only
-- (aal1) admin session could read/write all admin data even though MFA was
-- enrolled. Now: an admin who HAS a verified authenticator factor is only
-- treated as admin when the session is elevated to aal2 (i.e. they entered a
-- code). Admins without MFA are unaffected (aal1 still works), so nobody is
-- locked out for not having enrolled yet.
--
-- Rollback: re-create is_admin() with just the `exists(... role = 'admin')` body.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
           select 1 from public.profiles where id = auth.uid() and role = 'admin'
         )
     and (
           -- session has completed MFA…
           coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
           -- …or the admin hasn't set up MFA at all
           or not exists (
             select 1 from auth.mfa_factors
             where user_id = auth.uid() and status = 'verified'
           )
         );
$$;
