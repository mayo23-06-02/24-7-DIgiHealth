-- DigiHealth Postgres migration 012: MongoDB is gone, so the `mongo_id` bridge columns
-- (added in 002-008 for the one-time data migration) are dead weight. Drops them,
-- together with their unique constraints/indexes.

do $$
declare
  r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'mongo_id'
  loop
    execute format('alter table public.%I drop column if exists mongo_id', r.table_name);
  end loop;
end $$;
