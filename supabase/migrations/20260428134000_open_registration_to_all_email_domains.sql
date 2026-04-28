-- Open registration to all valid email domains and prevent duplicate WhatsApp numbers.

alter table public.profiles
  drop constraint if exists profiles_email_check;

alter table public.profiles
  add constraint profiles_email_check
  check (
    lower(email) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  );

update public.profiles
set whatsapp = nullif(regexp_replace(whatsapp, '[[:space:]]+', '', 'g'), '')
where whatsapp is not null;

create unique index if not exists idx_profiles_whatsapp_unique
  on public.profiles (whatsapp)
  where whatsapp is not null and btrim(whatsapp) <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_whatsapp text;
begin
  normalized_whatsapp :=
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'whatsapp', ''), '[[:space:]]+', '', 'g'), '');

  if normalized_whatsapp is not null and exists (
    select 1
    from public.profiles
    where whatsapp = normalized_whatsapp
      and id <> new.id
  ) then
    raise exception 'Bu telefon numarasıyla zaten kayıt var.' using errcode = '23505';
  end if;

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
    normalized_whatsapp,
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
