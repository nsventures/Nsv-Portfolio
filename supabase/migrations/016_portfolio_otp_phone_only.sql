-- Portfolio access OTP is now WhatsApp/phone-only; email is no longer collected.

alter table public.portfolio_otp_challenges
  alter column email drop not null;
