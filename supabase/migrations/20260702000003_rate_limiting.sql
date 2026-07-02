-- F5: server-side rate limiting for public surfaces (no external dependency).
--
-- A tiny event log + a SECURITY DEFINER `rl_check` that returns false once a
-- (bucket, identifier) exceeds N hits in a window. Wired into public enquiry
-- and ticket inserts via triggers; the track-order edge function calls it too.

create table if not exists public.rate_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_lookup
  on public.rate_events (bucket, identifier, created_at desc);

alter table public.rate_events enable row level security;
-- No policies on purpose: only SECURITY DEFINER functions below touch this table,
-- so clients can neither read nor tamper with it.

-- True (and records a hit) if under the limit; false if the limit is exceeded.
create or replace function public.rl_check(
  p_bucket text, p_identifier text, p_max int, p_window interval
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_identifier is null or p_identifier = '' then
    p_identifier := 'unknown';
  end if;
  -- opportunistic cleanup of old rows so the table stays small
  delete from public.rate_events where created_at < now() - interval '1 day';
  select count(*) into n
    from public.rate_events
   where bucket = p_bucket and identifier = p_identifier
     and created_at > now() - p_window;
  if n >= p_max then
    return false;
  end if;
  insert into public.rate_events(bucket, identifier) values (p_bucket, p_identifier);
  return true;
end;
$$;

-- Best-effort client IP from the PostgREST request headers.
create or replace function public.rl_client_ip()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare hdrs jsonb; ip text;
begin
  begin
    hdrs := current_setting('request.headers', true)::jsonb;
  exception when others then
    return 'unknown';
  end;
  if hdrs is null then return 'unknown'; end if;
  ip := coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-real-ip', hdrs->>'x-forwarded-for');
  if ip is null or ip = '' then return 'unknown'; end if;
  return split_part(ip, ',', 1);  -- first hop
end;
$$;

-- Public enquiries: max 10 per 10 minutes per IP.
create or replace function public.enquiries_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.rl_check('enquiry', public.rl_client_ip(), 10, interval '10 minutes') then
    raise exception 'Too many submissions — please try again in a few minutes.'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists enquiries_rate_limit on public.enquiries;
create trigger enquiries_rate_limit before insert on public.enquiries
  for each row execute function public.enquiries_rate_limit();

-- Support tickets: max 15 per 10 minutes per user (fallback to IP).
create or replace function public.tickets_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare ident text;
begin
  -- admins (support staff) are never limited
  if public.is_admin() then return new; end if;
  ident := coalesce(auth.uid()::text, public.rl_client_ip());
  if not public.rl_check('ticket', ident, 15, interval '10 minutes') then
    raise exception 'Too many requests — please try again shortly.'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists tickets_rate_limit on public.tickets;
create trigger tickets_rate_limit before insert on public.tickets
  for each row execute function public.tickets_rate_limit();

-- The track-order edge function calls rl_check with the service role.
grant execute on function public.rl_check(text, text, int, interval) to service_role;
