begin;

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text not null default '',
  category text not null check (category in ('soup','salad','starter','main','dessert','drink','side')),
  diet text not null default 'unknown' check (diet in ('veg','non-veg','unknown')),
  price_paise integer check (price_paise >= 0),
  image_url text check (image_url is null or image_url ~ '^https://'),
  image_urls text[] not null default '{}',
  video_url text check (video_url is null or video_url ~ '^https://'),
  featured boolean not null default false,
  special_on date,
  is_available boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 0
);

alter table public.menu_items enable row level security;
revoke all on public.menu_items from public, anon, authenticated;
grant select on public.menu_items to anon, authenticated;
create policy "Guests can read published dishes"
  on public.menu_items for select to anon, authenticated using (published);

commit;
