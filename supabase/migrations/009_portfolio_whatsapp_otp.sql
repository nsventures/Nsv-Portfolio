-- WhatsApp OTP challenges for portfolio access gate (used by edge functions only)

create table if not exists public.portfolio_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  otp_hash text not null,
  name text not null,
  email text not null,
  project_name text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_otp_challenges_phone_idx
  on public.portfolio_otp_challenges (phone_e164, created_at desc);

create index if not exists portfolio_otp_challenges_expires_idx
  on public.portfolio_otp_challenges (expires_at);

alter table public.portfolio_otp_challenges enable row level security;

-- No public policies — edge functions use service role only.
