-- Run once in Supabase SQL Editor after creating the auth user.
-- User: anmol@nsventures.in

insert into public.admin_users (user_id, email)
values (
  '7c86f2ab-c5fb-4871-aa8d-6759fd469000',
  'anmol@nsventures.in'
)
on conflict (user_id) do update
set email = excluded.email;
