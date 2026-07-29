-- One-time backfill: mark all pre-existing inquiries as already viewed, so the
-- "unread" bubble counts introduced alongside viewed_at only reflect requests
-- nobody has opened since the feature shipped, not the entire historical table.
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run
-- (or: npx supabase db query --linked -f supabase/migrations/021_backfill_inquiry_viewed_at.sql)

update public.inquiries
set viewed_at = now()
where viewed_at is null;
