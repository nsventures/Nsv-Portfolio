-- Inquiries CRM — status workflow, notes, updated_at, and admin write access
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.inquiries
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'in_progress', 'closed')),
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuses public.set_updated_at from 001_initial.sql)
-- ---------------------------------------------------------------------------

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — allow admins to update/delete, not just select
-- ---------------------------------------------------------------------------

drop policy if exists "admin update inquiries" on public.inquiries;
create policy "admin update inquiries"
  on public.inquiries for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete inquiries" on public.inquiries;
create policy "admin delete inquiries"
  on public.inquiries for delete
  using (public.is_admin());
