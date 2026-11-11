alter table public.live_updates
  add column if not exists update_date date,
  add column if not exists update_time time without time zone;

update public.live_updates
set
  update_date = (created_at at time zone 'Europe/Berlin')::date,
  update_time = (created_at at time zone 'Europe/Berlin')::time
where update_date is null or update_time is null;

alter table public.live_updates
  alter column update_date set not null,
  alter column update_time set not null;
