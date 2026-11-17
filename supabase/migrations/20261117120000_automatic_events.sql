-- Automated imports must not overwrite an administrator's changes or restore a
-- deliberately deleted event. The importer can only call the RPC as service_role.
alter table public.events
  add column if not exists import_source text,
  add column if not exists import_end_estimated boolean not null default false;

create table if not exists public.event_import_suppressions (
  club_slug text not null references public.clubs (slug) on update cascade on delete cascade,
  event_date date not null,
  primary key (club_slug, event_date)
);

alter table public.event_import_suppressions enable row level security;
revoke all on public.event_import_suppressions from public, anon, authenticated;

create or replace function public.protect_manual_event_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'DELETE' then
      perform pg_advisory_xact_lock(hashtextextended(old.club_slug || ':' || old.event_date::text, 0));
      insert into public.event_import_suppressions (club_slug, event_date)
      values (old.club_slug, old.event_date)
      on conflict do nothing;
      return old;
    end if;
    new.import_source := null;
    new.import_end_estimated := false;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_manual_event_changes() from public, anon, authenticated;
drop trigger if exists protect_manual_event_changes on public.events;
create trigger protect_manual_event_changes
before insert or update or delete on public.events
for each row execute function public.protect_manual_event_changes();

create or replace function public.import_club_event(
  p_club_slug text,
  p_event_date date,
  p_event_time time without time zone,
  p_description text,
  p_djs text,
  p_source text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  berlin_now timestamp := now() at time zone 'Europe/Berlin';
  estimated_end timestamp;
  affected integer;
begin
  if p_club_slug is null or p_event_date is null or p_event_time is null
    or p_description is null or length(trim(p_description)) = 0
    or length(p_description) > 160 or length(p_djs) > 160
    or p_source is null or length(p_source) = 0 then
    raise exception 'Invalid imported event';
  end if;
  if p_event_date < berlin_now::date or p_event_date > berlin_now::date + 60
    or p_event_date + p_event_time <= berlin_now then
    return 'outside_window_or_started';
  end if;
  if not exists (select 1 from public.clubs where slug = p_club_slug and is_active) then
    return 'inactive_or_missing_club';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_club_slug || ':' || p_event_date::text, 0));
  if exists (
    select 1 from public.event_import_suppressions
    where club_slug = p_club_slug and event_date = p_event_date
  ) then
    return 'suppressed';
  end if;

  estimated_end := ((p_event_date + p_event_time) at time zone 'Europe/Berlin'
    + interval '12 hours') at time zone 'Europe/Berlin';
  -- Existing reporting rules do not allow events to run past Monday 06:00.
  if estimated_end::date > p_event_date + 2
    or (estimated_end::date = p_event_date + 2
      and (extract(isodow from p_event_date) <> 6 or estimated_end::time > time '06:00'))
    or (estimated_end::date = p_event_date + 1
      and extract(isodow from estimated_end) = 1 and estimated_end::time > time '06:00') then
    return 'estimated_end_outside_reporting_rules';
  end if;

  insert into public.events as existing
    (club_slug, event_date, event_time, event_end_date, event_end_time,
     description, djs, import_source, import_end_estimated)
  values
    (p_club_slug, p_event_date, p_event_time, estimated_end::date, estimated_end::time,
     p_description, p_djs, p_source, true)
  on conflict (club_slug, event_date) do update
  set event_time = excluded.event_time,
      event_end_date = excluded.event_end_date,
      event_end_time = excluded.event_end_time,
      description = excluded.description,
      djs = excluded.djs,
      import_end_estimated = true,
      updated_at = now()
  where existing.import_source = excluded.import_source
    and existing.event_date + existing.event_time > berlin_now;
  get diagnostics affected = row_count;
  if affected = 0 then
    return 'manual_or_started_event_preserved';
  end if;
  return 'saved';
end;
$$;

revoke all on function public.import_club_event(text, date, time, text, text, text)
  from public, anon, authenticated;
grant execute on function public.import_club_event(text, date, time, text, text, text)
  to service_role;
