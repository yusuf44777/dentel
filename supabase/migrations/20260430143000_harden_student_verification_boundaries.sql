-- Harden student verification so client-provided metadata cannot grant trust.

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
    false,
    null,
    null,
    null
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        university_year = coalesce(excluded.university_year, public.profiles.university_year),
        whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp);

  return new;
end;
$$;

create or replace function public.prevent_student_verification_client_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'authenticated'
    and (
      (tg_op = 'INSERT' and (
        new.student_document_verified is distinct from false
        or new.student_document_verified_at is not null
        or new.student_document_barcode is not null
        or new.student_document_tc_masked is not null
      ))
      or
      (tg_op = 'UPDATE' and (
        new.student_document_verified is distinct from old.student_document_verified
        or new.student_document_verified_at is distinct from old.student_document_verified_at
        or new.student_document_barcode is distinct from old.student_document_barcode
        or new.student_document_tc_masked is distinct from old.student_document_tc_masked
      ))
    )
  then
    raise exception 'Öğrenci belge doğrulaması yalnızca sunucu tarafından güncellenebilir.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_student_verification_client_changes on public.profiles;
create trigger trg_profiles_prevent_student_verification_client_changes
before insert or update of
  student_document_verified,
  student_document_verified_at,
  student_document_barcode,
  student_document_tc_masked
on public.profiles
for each row execute function public.prevent_student_verification_client_changes();

create or replace function public.profile_has_verified_student_document(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id
      and student_document_verified is true
  );
$$;

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
on public.listings
for insert
to authenticated
with check (
  (select auth.uid()) = seller_id
  and (select public.profile_has_verified_student_document(seller_id))
);

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
on public.listings
for update
to authenticated
using ((select auth.uid()) = seller_id)
with check (
  (select auth.uid()) = seller_id
  and (
    status <> 'active'
    or (select public.profile_has_verified_student_document(seller_id))
  )
);
