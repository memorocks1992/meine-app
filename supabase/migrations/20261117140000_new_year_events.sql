alter table public.events
  add column if not exists event_end_estimated boolean not null default false;

alter table public.events drop constraint if exists events_valid_interval;
alter table public.events add constraint events_valid_interval check (
  (
    extract(month from event_date) = 12
    and extract(day from event_date) = 31
    and event_end_date + event_end_time > event_date + event_time
    and event_end_date + event_end_time <= event_date + event_time + interval '72 hours'
  )
  or (
    (extract(month from event_date) <> 12 or extract(day from event_date) <> 31)
    and event_end_date >= event_date
    and event_end_date <= event_date + 2
    and (
      event_end_date <> event_date + 2
      or (extract(isodow from event_date) = 6 and event_end_time <= time '06:00')
    )
    and (
      event_end_date <> event_date + 1
      or extract(isodow from event_end_date) <> 1
      or event_end_time <= time '06:00'
    )
  )
);

drop policy if exists "Anyone can read upcoming events" on public.events;
create policy "Anyone can read upcoming events"
on public.events for select to anon, authenticated
using (
  event_date between (now() at time zone 'Europe/Berlin')::date - 3
    and (now() at time zone 'Europe/Berlin')::date + 100
);
