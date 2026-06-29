-- Public 'media' bucket for images/attachments. Public read; authenticated
-- write (tighten by path prefix during hardening).

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media auth insert" on storage.objects
  for insert with check (bucket_id = 'media' and auth.uid() is not null);

create policy "media auth update" on storage.objects
  for update using (bucket_id = 'media' and auth.uid() is not null);

create policy "media auth delete" on storage.objects
  for delete using (bucket_id = 'media' and auth.uid() is not null);
