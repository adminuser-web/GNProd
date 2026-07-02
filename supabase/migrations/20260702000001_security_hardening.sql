-- Security hardening (pentest findings F1 + F2).
--
-- F1: the public 'media' bucket allowed ANY authenticated user to insert/update/
--     delete ANY object. Because guest checkout uses anonymous sessions, that
--     meant any visitor could overwrite or delete product images and host
--     arbitrary files. Lock writes to admins; customers may still upload their
--     own support-ticket attachments (path `support/<uid>/...`).
-- F2: notifications INSERT was `with check (true)` — anyone could inject
--     admin-targeted notifications with an arbitrary link (phishing) or spam.
--     Restrict who/what can be inserted and sanitize non-admin-supplied fields.

-- ── F1: media bucket storage policies ────────────────────────────────────────
drop policy if exists "media auth insert" on storage.objects;
drop policy if exists "media auth update" on storage.objects;
drop policy if exists "media auth delete" on storage.objects;
drop policy if exists "media insert admin or own support" on storage.objects;
drop policy if exists "media update admin" on storage.objects;
drop policy if exists "media delete admin" on storage.objects;

-- Admins upload anywhere; a signed-in customer may upload ONLY into their own
-- support-ticket folder. (Public read policy "media public read" is unchanged.)
create policy "media insert admin or own support" on storage.objects
  for insert with check (
    bucket_id = 'media' and (
      public.is_admin()
      or name like ('support/' || auth.uid()::text || '/%')
    )
  );

-- Only admins may replace or delete media — protects product images.
create policy "media update admin" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "media delete admin" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ── F2: notifications insert lockdown + sanitizer ────────────────────────────
-- Non-admins may only notify the admin queue (role_target='admin', no target
-- user) or themselves — never a specific other user.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check (
    public.is_admin()
    or user_id = auth.uid()
    or (role_target = 'admin' and user_id is null)
  );

-- For non-admin inserts: force internal-only links (kills phishing) and cap
-- title/message length (limits spam payloads). Admin/system inserts pass through.
create or replace function public.notifications_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.link is not null and (
         left(new.link, 1) <> '/'
         or new.link like '%://%'
         or lower(new.link) like '%javascript:%'
       ) then
      new.link := null;  -- drop external / script links
    end if;
    new.title   := left(coalesce(new.title, ''), 120);
    new.message := left(coalesce(new.message, ''), 500);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard
  before insert on public.notifications
  for each row execute function public.notifications_guard();
