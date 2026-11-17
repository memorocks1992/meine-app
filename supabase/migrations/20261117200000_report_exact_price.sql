-- Accept whole euro prices up to 99 while retaining historical price ranges
-- and compatibility with older clients.
alter table public.reports drop constraint if exists reports_entry_range_check;
alter table public.reports add constraint reports_entry_range_check check (
  entry_range is null
  or entry_range in ('Up to €10', '€10–15', '€15–20', '€20–30', '€30+')
  or entry_range ~ '^€(0|[1-9][0-9]?)$'
);
