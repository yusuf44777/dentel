-- Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, listing_id)
);

create index if not exists idx_favorites_user_created_at
  on public.favorites (user_id, created_at desc);
create index if not exists idx_favorites_listing_id
  on public.favorites (listing_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  event_type text not null check (
    event_type in ('favorite_added', 'listing_marked_sold', 'report_submitted')
  ),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_read_created_at
  on public.notifications (user_id, is_read, created_at desc);

-- User settings
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  contact_whatsapp boolean not null default true,
  contact_email boolean not null default true,
  push_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute procedure public.set_updated_at();

-- Auto-create user settings for new profiles
create or replace function public.handle_new_profile_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_user_settings on public.profiles;
create trigger on_profile_created_user_settings
after insert on public.profiles
for each row execute procedure public.handle_new_profile_settings();

insert into public.user_settings (user_id)
select p.id
from public.profiles p
left join public.user_settings s on s.user_id = p.id
where s.user_id is null;

-- User blocks
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create index if not exists idx_user_blocks_blocker_id
  on public.user_blocks (blocker_id);

-- Listing reports
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'misleading', 'inappropriate', 'other')),
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'resolved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reporter_id, listing_id)
);

create index if not exists idx_listing_reports_reporter_created_at
  on public.listing_reports (reporter_id, created_at desc);
create index if not exists idx_listing_reports_listing_id
  on public.listing_reports (listing_id);

-- Push tokens
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  enabled boolean not null default true,
  last_registered_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_push_tokens_updated_at on public.push_tokens;
create trigger trg_push_tokens_updated_at
before update on public.push_tokens
for each row execute procedure public.set_updated_at();

create index if not exists idx_push_tokens_user_enabled
  on public.push_tokens (user_id, enabled);

-- RLS enable
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_blocks enable row level security;
alter table public.listing_reports enable row level security;
alter table public.push_tokens enable row level security;

-- Favorites policies
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);

-- Notifications policies
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- User settings policies
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- User blocks policies
drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
on public.user_blocks
for select
to authenticated
using (auth.uid() = blocker_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
on public.user_blocks
for insert
to authenticated
with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
on public.user_blocks
for delete
to authenticated
using (auth.uid() = blocker_id);

-- Listing reports policies
drop policy if exists "listing_reports_select_own" on public.listing_reports;
create policy "listing_reports_select_own"
on public.listing_reports
for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "listing_reports_insert_own" on public.listing_reports;
create policy "listing_reports_insert_own"
on public.listing_reports
for insert
to authenticated
with check (auth.uid() = reporter_id and reporter_id <> seller_id);

-- Push tokens policies
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

-- Update listings read visibility policy to hide blocked sellers
drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
on public.listings
for select
to authenticated
using (
  (status = 'active' or auth.uid() = seller_id)
  and not exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_id = auth.uid()
      and ub.blocked_user_id = listings.seller_id
  )
);

-- Update listing_images read visibility policy to hide blocked sellers
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
      and not exists (
        select 1
        from public.user_blocks ub
        where ub.blocker_id = auth.uid()
          and ub.blocked_user_id = l.seller_id
      )
  )
);
