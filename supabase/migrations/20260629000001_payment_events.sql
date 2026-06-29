-- Idempotency ledger for Razorpay webhook events.
-- The webhook inserts the Razorpay event id before processing; a duplicate
-- insert (unique PK violation) means the event was already handled, so the
-- webhook safely no-ops on retries.
--
-- RLS is enabled with NO policies: only the service-role key (used by the
-- edge function) can read/write it. The browser can never touch it.

create table if not exists public.payment_events (
  id         text primary key,            -- Razorpay x-razorpay-event-id
  raw        text,                        -- truncated raw payload (debugging)
  created_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
