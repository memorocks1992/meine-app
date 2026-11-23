create extension if not exists pg_cron with schema pg_catalog;

alter table public.live_updates
  add column if not exists created_at timestamptz;

update public.live_updates
set created_at = least((datum + uhrzeit) at time zone 'Europe/Berlin', now())
where created_at is null;

alter table public.live_updates
  alter column created_at set default now(),
  alter column created_at set not null;

create index if not exists live_updates_created_at_idx on public.live_updates (created_at);

drop policy if exists "Anyone can read recent live updates" on public.live_updates;
create policy "Anyone can read recent live updates"
on public.live_updates for select to anon, authenticated
using (created_at > now() - interval '48 hours');

drop policy if exists "Expired live updates are hidden" on public.live_updates;
create policy "Expired live updates are hidden"
on public.live_updates as restrictive for select to anon, authenticated
using (created_at > now() - interval '48 hours');

create or replace function public.delete_expired_live_updates()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.live_updates
  where created_at <= now() - interval '48 hours';
$$;

revoke all on function public.delete_expired_live_updates() from public, anon, authenticated;

select public.delete_expired_live_updates();

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'live-updates-expiry'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'live-updates-expiry',
    '* * * * *',
    'select public.delete_expired_live_updates();'
  );
end;
$$;
