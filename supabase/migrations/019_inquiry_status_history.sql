-- Inquiry status history — audit trail for status changes, admin-only read
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run
-- (or: npx supabase db query --linked -f supabase/migrations/019_inquiry_status_history.sql)

create table if not exists public.inquiry_status_history (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists inquiry_status_history_inquiry_idx
  on public.inquiry_status_history (inquiry_id, changed_at desc);

create or replace function public.log_inquiry_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.inquiry_status_history (inquiry_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists inquiries_status_history on public.inquiries;
create trigger inquiries_status_history
  after update on public.inquiries
  for each row execute function public.log_inquiry_status_change();

alter table public.inquiry_status_history enable row level security;

drop policy if exists "admin read inquiry status history" on public.inquiry_status_history;
create policy "admin read inquiry status history"
  on public.inquiry_status_history for select
  using (public.is_admin());

-- rows are written exclusively by the security-definer trigger; no insert
-- policy needed/wanted for any role.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inquiry_status_history'
  ) then
    alter publication supabase_realtime add table public.inquiry_status_history;
  end if;
end $$;

-- speeds up layout.tsx's unfiltered `.order('created_at', { ascending: false })`
-- fetch of the whole table (existing index is (status, created_at desc), which
-- doesn't help a plain created_at sort).
create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);
