alter table public.listing_images
  add column if not exists storage_provider text;

alter table public.listing_images
  add column if not exists storage_path text;

alter table public.listing_images
  add column if not exists drive_file_id text;

create index if not exists idx_listing_images_drive_file_id
  on public.listing_images (drive_file_id);

create unique index if not exists idx_listing_images_storage_path_unique
  on public.listing_images (storage_path)
  where storage_path is not null;

update public.listing_images
set storage_provider = 'google_drive'
where storage_provider is null
  and image_url like 'https://drive.google.com/%';

update public.listing_images
set storage_provider = 'supabase_storage'
where storage_provider is null
  and image_url like '%supabase.co/storage/%';
