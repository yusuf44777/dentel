create or replace function public.sync_listing_image_storage_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  extracted_drive_id text;
begin
  if new.image_url is not null then
    if new.storage_provider is null then
      if new.image_url like 'https://drive.google.com/%' then
        new.storage_provider := 'google_drive';
      elsif new.image_url like '%supabase.co/storage/%' then
        new.storage_provider := 'supabase_storage';
      end if;
    end if;

    if new.drive_file_id is null then
      extracted_drive_id := substring(new.image_url from 'id=([A-Za-z0-9_-]+)');
      if extracted_drive_id is null then
        extracted_drive_id := substring(new.image_url from '/d/([A-Za-z0-9_-]+)');
      end if;

      if extracted_drive_id is not null then
        new.drive_file_id := extracted_drive_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listing_images_sync_storage_metadata on public.listing_images;
create trigger trg_listing_images_sync_storage_metadata
before insert or update on public.listing_images
for each row
execute function public.sync_listing_image_storage_metadata();

update public.listing_images
set drive_file_id = coalesce(
  drive_file_id,
  substring(image_url from 'id=([A-Za-z0-9_-]+)'),
  substring(image_url from '/d/([A-Za-z0-9_-]+)')
)
where image_url is not null
  and drive_file_id is null
  and image_url like 'https://drive.google.com/%';

update public.listing_images
set storage_provider = 'google_drive'
where storage_provider is null
  and image_url like 'https://drive.google.com/%';

update public.listing_images
set storage_provider = 'supabase_storage'
where storage_provider is null
  and image_url like '%supabase.co/storage/%';
