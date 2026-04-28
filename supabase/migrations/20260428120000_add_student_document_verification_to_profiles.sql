alter table public.profiles
  add column if not exists student_document_verified boolean not null default false;

alter table public.profiles
  add column if not exists student_document_verified_at timestamptz;

alter table public.profiles
  add column if not exists student_document_barcode text;

alter table public.profiles
  add column if not exists student_document_tc_masked text;

create index if not exists idx_profiles_student_document_verified
  on public.profiles (student_document_verified);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    university_year,
    whatsapp,
    student_document_verified,
    student_document_verified_at,
    student_document_barcode,
    student_document_tc_masked
  )
  values (
    new.id,
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'university_year'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'whatsapp'), ''),
    coalesce((new.raw_user_meta_data ->> 'student_document_verified')::boolean, false),
    nullif(new.raw_user_meta_data ->> 'student_document_verified_at', '')::timestamptz,
    nullif(trim(new.raw_user_meta_data ->> 'student_document_barcode'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'student_document_tc_masked'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        university_year = coalesce(excluded.university_year, public.profiles.university_year),
        whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
        student_document_verified =
          public.profiles.student_document_verified or excluded.student_document_verified,
        student_document_verified_at =
          coalesce(excluded.student_document_verified_at, public.profiles.student_document_verified_at),
        student_document_barcode =
          coalesce(excluded.student_document_barcode, public.profiles.student_document_barcode),
        student_document_tc_masked =
          coalesce(excluded.student_document_tc_masked, public.profiles.student_document_tc_masked);

  return new;
end;
$$;
