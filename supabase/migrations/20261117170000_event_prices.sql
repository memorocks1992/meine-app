alter table public.events
  add column if not exists entry_price text,
  add column if not exists entry_price_complete boolean not null default false,
  add column if not exists entry_price_source text,
  add column if not exists entry_price_checked_at timestamptz;

alter table public.events drop constraint if exists events_entry_price_valid;
alter table public.events add constraint events_entry_price_valid check (
  (entry_price is null and not entry_price_complete and entry_price_source is null and entry_price_checked_at is null)
  or (
    entry_price is not null and length(trim(entry_price)) between 1 and 200
    and entry_price_source is not null and entry_price_checked_at is not null
  )
);
