-- Extensions
create extension if not exists pgcrypto;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (right(lower(email), 16) = '@st.uskudar.edu.tr'),
  full_name text,
  university_year text check (university_year in ('prep', '1', '2', '3', '4', '5')),
  avatar_url text,
  whatsapp text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0 and length(title) <= 120),
  description text,
  price numeric(10, 2) not null check (price > 0),
  category text not null check (
    category in (
      'pre_clinic',
      'clinic',
      'books',
      'consumables',
      'models',
      'instruments',
      'other'
    )
  ),
  condition text check (condition in ('new', 'like_new', 'good', 'fair')),
  status text not null default 'active' check (status in ('active', 'sold', 'deleted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings
for each row execute procedure public.set_updated_at();

create index if not exists idx_listings_status_created_at
  on public.listings (status, created_at desc);
create index if not exists idx_listings_category_status_created_at
  on public.listings (category, status, created_at desc);
create index if not exists idx_listings_seller_id
  on public.listings (seller_id);

-- Listing images
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (listing_id, position)
);

create index if not exists idx_listing_images_listing_id_position
  on public.listing_images (listing_id, position);

-- Auto-create profile row on auth sign-up
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
    university_year
  )
  values (
    new.id,
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'university_year'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        university_year = coalesce(excluded.university_year, public.profiles.university_year);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- profiles policies
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- listings policies
drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
on public.listings
for select
to authenticated
using (status = 'active' or auth.uid() = seller_id);

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
on public.listings
for insert
to authenticated
with check (auth.uid() = seller_id);

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
on public.listings
for update
to authenticated
using (auth.uid() = seller_id)
with check (auth.uid() = seller_id);

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
on public.listings
for delete
to authenticated
using (auth.uid() = seller_id);

-- listing_images policies
drop policy if exists "listing_images_select_visible" on public.listing_images;
create policy "listing_images_select_visible"
on public.listing_images
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (l.status = 'active' or l.seller_id = auth.uid())
  )
);

drop policy if exists "listing_images_insert_owner" on public.listing_images;
create policy "listing_images_insert_owner"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "listing_images_update_owner" on public.listing_images;
create policy "listing_images_update_owner"
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "listing_images_delete_owner" on public.listing_images;
create policy "listing_images_delete_owner"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

-- Storage bucket + storage policies
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'listing-images');

drop policy if exists "listing_images_auth_insert_own_folder" on storage.objects;
create policy "listing_images_auth_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_images_auth_update_own_folder" on storage.objects;
create policy "listing_images_auth_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_images_auth_delete_own_folder" on storage.objects;
create policy "listing_images_auth_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
