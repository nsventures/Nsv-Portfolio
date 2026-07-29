-- Tracks whether an admin has opened an inquiry, independent of its workflow
-- status (New/Contacted/In Progress/Closed stays fully manual).
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run
-- (or: npx supabase db query --linked -f supabase/migrations/020_inquiry_viewed_at.sql)

alter table public.inquiries
  add column if not exists viewed_at timestamptz;
