create or replace function public.registration_contact_conflict(
  p_email text,
  p_whatsapp text
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_whatsapp text;
begin
  normalized_email := lower(trim(coalesce(p_email, '')));
  normalized_whatsapp :=
    nullif(regexp_replace(coalesce(p_whatsapp, ''), '[[:space:]]+', '', 'g'), '');

  if normalized_email <> '' and (
    exists (select 1 from public.profiles where email = normalized_email)
    or exists (select 1 from auth.users where lower(email) = normalized_email)
  ) then
    return 'email';
  end if;

  if normalized_whatsapp is not null and exists (
    select 1 from public.profiles where whatsapp = normalized_whatsapp
  ) then
    return 'phone';
  end if;

  return null;
end;
$$;

revoke all on function public.registration_contact_conflict(text, text) from public;
grant execute on function public.registration_contact_conflict(text, text) to anon, authenticated;
