-- Enable Supabase Realtime (postgres_changes) for the inquiries CRM
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inquiries'
  ) then
    alter publication supabase_realtime add table public.inquiries;
  end if;
end $$;
