-- OTP delivery metadata (email + WhatsApp via Authyo)

alter table public.portfolio_otp_challenges
  add column if not exists whatsapp_mask_id text,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists email_sent_at timestamptz;

create index if not exists portfolio_otp_challenges_phone_hour_idx
  on public.portfolio_otp_challenges (phone_e164, created_at desc);
