-- Fix invalid email domain check on profiles.email.
-- Previous constraint used right(lower(email), 16) which can never match
-- '@st.uskudar.edu.tr' (18 chars), causing "Database error saving new user".

alter table public.profiles
  drop constraint if exists profiles_email_check;

alter table public.profiles
  add constraint profiles_email_check
  check (
    lower(email) ~ '^[^@\\s]+@st\\.uskudar\\.edu\\.tr$'
  );
