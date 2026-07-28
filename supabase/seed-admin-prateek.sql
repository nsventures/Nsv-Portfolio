-- Run once in Supabase SQL Editor after creating the auth user for the CRM admin.
-- User: prateek@nsventures.in
--
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    - Email: prateek@nsventures.in
--    - Password: set one (this is what he'll use to sign in to the CRM)
--    - Auto Confirm User: on
-- 2. Copy the new user's UUID from the Users table and paste it below.
-- 3. Run this script.

insert into public.admin_users (user_id, email)
values (
  '00000000-0000-0000-0000-000000000000', -- replace with prateek's auth.users id
  'prateek@nsventures.in'
)
on conflict (user_id) do update
set email = excluded.email;
