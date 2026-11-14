drop policy if exists "Anyone can read upcoming events" on public.events;
alter table public.events
  add column if not exists event_time time without time zone not null default time '00:00',
  add column if not exists event_end_date date,
  add column if not exists event_end_time time without time zone not null default time '23:59:59';

update public.events
set event_end_date = event_date
where event_end_date is null;

update public.events as club_event
set event_end_date = club_event.event_date + 2,
    event_end_time = time '06:00'
where extract(isodow from club_event.event_date) = 6
  and not exists (
    select 1
    from public.events as next_event
    where next_event.club_slug = club_event.club_slug
      and next_event.event_date = club_event.event_date + 1
  )
  and not exists (
    select 1
    from public.events as monday_event
    where monday_event.club_slug = club_event.club_slug
      and monday_event.event_date = club_event.event_date + 2
  );

update public.events as club_event
set event_end_date = club_event.event_date + 1,
    event_end_time = time '06:00'
where extract(isodow from club_event.event_date) = 7
  and not exists (
    select 1
    from public.events as next_event
    where next_event.club_slug = club_event.club_slug
      and next_event.event_date = club_event.event_date + 1
  );

alter table public.events
  alter column event_end_date set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_valid_interval'
  ) then
    alter table public.events
      add constraint events_valid_interval check (
        event_end_date >= event_date
        and event_end_date <= event_date + 2
        and (
          event_end_date <> event_date + 2
          or (
            extract(isodow from event_date) = 6
            and event_end_time <= time '06:00'
          )
        )
        and (
          event_end_date <> event_date + 1
          or extract(isodow from event_end_date) <> 1
          or event_end_time <= time '06:00'
        )
      );
  end if;
end;
$$;

create policy "Anyone can read upcoming events"
on public.events for select to anon, authenticated
using (
  event_date between (now() at time zone 'Europe/Berlin')::date - 2
    and (now() at time zone 'Europe/Berlin')::date + 100
);

create or replace function public.assign_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  berlin_now timestamp without time zone := now() at time zone 'Europe/Berlin';
begin
  select event.id
  into new.event_id
  from public.events as event
  where event.club_slug = new.club_slug
    and event.event_date + event.event_time <= berlin_now
    and event.event_end_date + event.event_end_time > berlin_now
  order by event.event_date desc, event.event_time desc
  limit 1;

  if new.event_id is null then
    raise exception 'Reports are only accepted while a scheduled event is running.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.delete_expired_event_reports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  berlin_now timestamp without time zone := now() at time zone 'Europe/Berlin';
  berlin_date date := (now() at time zone 'Europe/Berlin')::date;
begin
  delete from public.reports as report
  where (
    report.event_id is null
    and (report.created_at at time zone 'Europe/Berlin')::date < berlin_date
  )
  or exists (
    select 1
    from public.events as club_event
    where club_event.id = report.event_id
      and club_event.event_end_date + club_event.event_end_time <= berlin_now
  );
end;
$$;
