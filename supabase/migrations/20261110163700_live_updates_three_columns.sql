alter table public.live_updates
  add column if not exists datum date,
  add column if not exists uhrzeit time without time zone;

do $$
declare
  date_parts text[] := array['datum'];
  time_parts text[] := array['uhrzeit'];
  date_expression text;
  time_expression text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_updates'
      and column_name = 'update_date'
  ) then
    date_parts := array_append(date_parts, 'update_date');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_updates'
      and column_name = 'update_time'
  ) then
    time_parts := array_append(time_parts, 'update_time');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_updates'
      and column_name = 'date'
  ) then
    date_parts := array_append(date_parts, '"date"');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_updates'
      and column_name = 'time'
  ) then
    time_parts := array_append(time_parts, '"time"');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'live_updates'
      and column_name = 'created_at'
  ) then
    date_parts := array_append(date_parts, '(created_at at time zone ''Europe/Berlin'')::date');
    time_parts := array_append(time_parts, '(created_at at time zone ''Europe/Berlin'')::time');
  end if;

  date_parts := array_append(date_parts, '(now() at time zone ''Europe/Berlin'')::date');
  time_parts := array_append(time_parts, '(now() at time zone ''Europe/Berlin'')::time');

  date_expression := 'coalesce(' || array_to_string(date_parts, ', ') || ')';
  time_expression := 'coalesce(' || array_to_string(time_parts, ', ') || ')';
  execute format(
    'update public.live_updates set datum = %s, uhrzeit = %s',
    date_expression,
    time_expression
  );

  if exists (
    select 1 from public.live_updates
    where datum is null or uhrzeit is null
  ) then
    raise exception 'Some live_updates rows have no date or time value. Fill datum and uhrzeit before running this migration.';
  end if;
end;
$$;

drop policy if exists "Anyone can read recent live updates" on public.live_updates;
create policy "Anyone can read recent live updates"
on public.live_updates for select to anon, authenticated
using (datum >= (now() at time zone 'Europe/Berlin')::date - 30);

alter table public.live_updates
  alter column datum set not null,
  alter column uhrzeit set not null;

do $$
declare
  primary_key_name text;
begin
  select constraint_name
  into primary_key_name
  from information_schema.table_constraints
  where table_schema = 'public'
    and table_name = 'live_updates'
    and constraint_type = 'PRIMARY KEY';

  if primary_key_name is not null then
    execute format('alter table public.live_updates drop constraint %I', primary_key_name);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'live_updates' and column_name = 'message'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'live_updates' and column_name = 'text'
  ) then
    alter table public.live_updates rename column message to text;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'live_updates' and column_name = 'message'
  ) then
    alter table public.live_updates drop column message;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'live_updates' and column_name = 'text'
  ) then
    raise exception 'The live_updates table has neither a message nor a text column.';
  end if;
end;
$$;

alter table public.live_updates
  drop column if exists id,
  drop column if exists kind,
  drop column if exists created_at,
  drop column if exists update_date,
  drop column if exists update_time,
  drop column if exists "date",
  drop column if exists "time";

alter table public.live_updates
  alter column text set not null;
