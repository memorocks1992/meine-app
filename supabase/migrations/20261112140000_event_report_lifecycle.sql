alter table public.reports
  add column if not exists event_id uuid references public.events (id) on delete cascade;

update public.reports as report
set event_id = club_event.id
from public.events as club_event
where report.event_id is null
  and club_event.club_slug = report.club_slug
  and club_event.event_date = (report.created_at at time zone 'Europe/Berlin')::date;

create index if not exists reports_event_created_at_idx
  on public.reports (event_id, created_at desc);

create or replace function public.assign_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select id
  into new.event_id
  from public.events
  where club_slug = new.club_slug
    and event_date = (now() at time zone 'Europe/Berlin')::date;

  if new.event_id is null then
    raise exception 'Reports are only accepted on a scheduled event date.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.assign_report_event() from public, anon, authenticated;

drop trigger if exists reports_assign_event on public.reports;
create trigger reports_assign_event
before insert on public.reports
for each row execute function public.assign_report_event();

create or replace view public.public_reports
with (security_barrier = true, security_invoker = false)
as
select id, club_slug, wait_minutes, entry_chance, mood, entry_range, created_at, event_id
from public.reports;

create or replace function public.delete_expired_event_reports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reports
  where (created_at at time zone 'Europe/Berlin')::date
    < (now() at time zone 'Europe/Berlin')::date;
end;
$$;

revoke all on function public.delete_expired_event_reports() from public, anon, authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'event-expire-reports'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'event-expire-reports',
    '*/5 * * * *',
    'select public.delete_expired_event_reports();'
  );
end;
$$;
