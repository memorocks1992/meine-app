-- Keep 45 minutes for reports and older clients created before the slider.
alter table public.reports drop constraint if exists reports_wait_minutes_check;
alter table public.reports add constraint reports_wait_minutes_check check (
  wait_minutes is null
  or wait_minutes = 45
  or (wait_minutes between 0 and 240 and wait_minutes % 10 = 0)
);
