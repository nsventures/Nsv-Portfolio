-- NS Ventures portfolio — Step 1: schema, RLS, cities seed, read RPC
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id text primary key,
  name text not null,
  link text not null,
  thumbnail_path text,
  city_id uuid references public.cities (id) on delete set null,
  media_type text not null check (media_type in ('video', 'virtual-tour')),
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  project_type text,
  city text,
  timeline text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_items_list_idx
  on public.portfolio_items (is_published, media_type, city_id, sort_order, name);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_items_updated_at on public.portfolio_items;
create trigger portfolio_items_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.inquiries enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public read active cities" on public.cities;
create policy "public read active cities"
  on public.cities for select
  using (is_active = true);

drop policy if exists "admin manage cities" on public.cities;
create policy "admin manage cities"
  on public.cities for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public read published portfolio" on public.portfolio_items;
create policy "public read published portfolio"
  on public.portfolio_items for select
  using (is_published = true);

drop policy if exists "admin manage portfolio" on public.portfolio_items;
create policy "admin manage portfolio"
  on public.portfolio_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public insert inquiries" on public.inquiries;
create policy "public insert inquiries"
  on public.inquiries for insert
  with check (true);

drop policy if exists "admin read inquiries" on public.inquiries;
create policy "admin read inquiries"
  on public.inquiries for select
  using (public.is_admin());

drop policy if exists "admin read admin_users self" on public.admin_users;
create policy "admin read admin_users self"
  on public.admin_users for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "service manage admin_users" on public.admin_users;
create policy "service manage admin_users"
  on public.admin_users for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket for thumbnails
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tour-thumbs',
  'tour-thumbs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read tour thumbs" on storage.objects;
create policy "public read tour thumbs"
  on storage.objects for select
  using (bucket_id = 'tour-thumbs');

drop policy if exists "admin upload tour thumbs" on storage.objects;
create policy "admin upload tour thumbs"
  on storage.objects for insert
  with check (bucket_id = 'tour-thumbs' and public.is_admin());

drop policy if exists "admin update tour thumbs" on storage.objects;
create policy "admin update tour thumbs"
  on storage.objects for update
  using (bucket_id = 'tour-thumbs' and public.is_admin());

drop policy if exists "admin delete tour thumbs" on storage.objects;
create policy "admin delete tour thumbs"
  on storage.objects for delete
  using (bucket_id = 'tour-thumbs' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed cities (no portfolio items)
-- ---------------------------------------------------------------------------

insert into public.cities (name, sort_order) values
  ('Ahmedabad', 1),
  ('Bangalore', 2),
  ('Bhopal', 3),
  ('Chandigarh', 4),
  ('Chennai', 5),
  ('Coimbatore', 6),
  ('Delhi NCR', 7),
  ('Goa', 8),
  ('Gurgaon', 9),
  ('Hyderabad', 10),
  ('Indore', 11),
  ('Jaipur', 12),
  ('Kochi', 13),
  ('Kolkata', 14),
  ('Lucknow', 15),
  ('Mumbai', 16),
  ('Nagpur', 17),
  ('Noida', 18),
  ('Pune', 19),
  ('Surat', 20),
  ('Visakhapatnam', 21)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Paginated portfolio read (public site)
-- ---------------------------------------------------------------------------

create or replace function public.get_portfolio_page(
  p_page int,
  p_page_size int,
  p_city text default null,
  p_media_type text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_page_size int := least(greatest(coalesce(p_page_size, 48), 1), 100);
  v_offset int;
  v_total int;
  v_items jsonb;
  v_city_counts jsonb;
begin
  v_offset := (v_page - 1) * v_page_size;

  select coalesce(
    jsonb_object_agg(c.name, coalesce(cnt.count, 0)),
    '{}'::jsonb
  )
  into v_city_counts
  from public.cities c
  left join lateral (
    select count(*)::int as count
    from public.portfolio_items pi
    where pi.is_published = true
      and pi.city_id = c.id
      and (p_media_type is null or pi.media_type = p_media_type)
  ) cnt on true
  where c.is_active = true;

  select count(*)::int
  into v_total
  from public.portfolio_items pi
  left join public.cities c on c.id = pi.city_id
  where pi.is_published = true
    and (p_city is null or c.name = p_city)
    and (p_media_type is null or pi.media_type = p_media_type);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      pi.id,
      pi.name,
      pi.link,
      pi.thumbnail_path as thumbnail,
      c.name as city,
      pi.media_type as "mediaType"
    from public.portfolio_items pi
    left join public.cities c on c.id = pi.city_id
    where pi.is_published = true
      and (p_city is null or c.name = p_city)
      and (p_media_type is null or pi.media_type = p_media_type)
    order by pi.sort_order asc, pi.name asc
    limit v_page_size
    offset v_offset
  ) t;

  return jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'pageSize', v_page_size,
    'hasMore', (v_offset + jsonb_array_length(v_items)) < v_total,
    'cityCounts', v_city_counts
  );
end;
$$;

grant execute on function public.get_portfolio_page(int, int, text, text) to anon, authenticated;
