alter table public.events
  add column if not exists djs varchar(160);
