-- OTP challenges are looked up by email (Resend delivery)

create index if not exists portfolio_otp_challenges_email_idx
  on public.portfolio_otp_challenges (email, created_at desc);
