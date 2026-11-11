alter table public.live_updates
  add column if not exists id uuid;

update public.live_updates
set id = gen_random_uuid()
where id is null;

alter table public.live_updates
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.live_updates'::regclass
      and contype = 'p'
  ) then
    alter table public.live_updates
      add constraint live_updates_pkey primary key (id);
  end if;
end;
$$;
