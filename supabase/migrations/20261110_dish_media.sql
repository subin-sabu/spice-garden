begin;

alter table public.menu_items
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists video_url text check (video_url is null or video_url ~ '^https://');

commit;
