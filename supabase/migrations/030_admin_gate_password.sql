-- Admin gate password — stored hashed, verified in the database
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Replaces the build-time VITE_ADMIN_GATE_PASSWORD, which was compiled into
-- the public JS bundle in plain text. Only the bcrypt hash is stored, nothing
-- can read the row (no select policy), and the check runs server-side.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Single-row settings table
-- ---------------------------------------------------------------------------

create table if not exists public.admin_gate (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.admin_gate enable row level security;

-- Deliberately no policies: the hash is unreachable through PostgREST.
-- All access goes through the security-definer functions below.

-- Seed with the password the bundle used to hardcode, so nobody is locked out.
insert into public.admin_gate (id, password_hash)
values (true, extensions.crypt('nsv@1234', extensions.gen_salt('bf', 10)))
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Verify — callable before sign-in, so anon needs it
-- ---------------------------------------------------------------------------

create or replace function public.verify_admin_gate(p_password text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.admin_gate
    where id = true
      and password_hash = crypt(p_password, password_hash)
  );
$$;

revoke all on function public.verify_admin_gate(text) from public;
grant execute on function public.verify_admin_gate(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Change — admins only
-- ---------------------------------------------------------------------------

create or replace function public.set_admin_gate_password(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_password is null or length(trim(p_password)) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  insert into public.admin_gate (id, password_hash, updated_at, updated_by)
  values (true, crypt(p_password, gen_salt('bf', 10)), now(), auth.uid())
  on conflict (id) do update
    set password_hash = excluded.password_hash,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;
end;
$$;

revoke all on function public.set_admin_gate_password(text) from public;
grant execute on function public.set_admin_gate_password(text) to authenticated;

-- ---------------------------------------------------------------------------
-- When the gate password was last changed (admin UI shows this)
-- ---------------------------------------------------------------------------

create or replace function public.admin_gate_updated_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select updated_at from public.admin_gate where id = true;
$$;

revoke all on function public.admin_gate_updated_at() from public;
grant execute on function public.admin_gate_updated_at() to authenticated;
