-- Fix: right(email, 16) was wrong — @st.uskudar.edu.tr is 18 chars.
-- Replaced with LIKE pattern which is safer and length-independent.

alter table public.profiles
  drop constraint if exists profiles_email_check;

alter table public.profiles
  add constraint profiles_email_check
  check (lower(email) like '%@st.uskudar.edu.tr');
