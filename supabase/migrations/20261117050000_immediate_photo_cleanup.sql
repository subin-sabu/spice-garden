begin;

create table private.retired_menu_photos (path text primary key);
revoke all on private.retired_menu_photos from public, anon, authenticated;

create function private.remember_unlinked_menu_photos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare paths text[];
begin
  if tg_table_name = 'item_images' then
    paths := array[old.thumbnail_path, old.image_path];
  elsif tg_table_name = 'homepage_settings' then
    paths := array[old.default_banner_path];
  else
    select array_agg(split_part(split_part(url, '?', 1), '/menu-photos/', 2))
      into paths from unnest(old.image_urls || array[old.image_url]) as urls(url);
  end if;

  insert into private.retired_menu_photos (path)
  select path from unnest(paths) as candidates(path)
  where path ~ '^([0-9a-f-]{36}/[0-9a-f-]{36}-(thumb|main)|banner/[0-9a-f-]{36}-banner)[.]webp$'
  on conflict do nothing;
  return null;
end;
$$;
revoke all on function private.remember_unlinked_menu_photos() from public, anon, authenticated;

create trigger remember_old_gallery_photos after update of image_path, thumbnail_path or delete on public.item_images
for each row execute function private.remember_unlinked_menu_photos();
create trigger remember_old_banner after update of default_banner_path or delete on public.homepage_settings
for each row execute function private.remember_unlinked_menu_photos();
create trigger remember_old_legacy_photos after update of image_urls, image_url or delete on public.menu_items
for each row execute function private.remember_unlinked_menu_photos();

create or replace function public.abandoned_menu_photos() returns setof text
language sql stable security definer set search_path = '' as $$
  select object.name from storage.objects object
  where public.is_menu_admin()
    and object.bucket_id = 'menu-photos'
    and object.name ~ '^([0-9a-f-]{36}/[0-9a-f-]{36}-(thumb|main)|banner/[0-9a-f-]{36}-banner)[.]webp$'
    and (
      exists(select 1 from private.retired_menu_photos retired where retired.path = object.name)
      or object.created_at <= now() - interval '1 hour'
    )
    and not exists(select 1 from public.homepage_settings where default_banner_path = object.name)
    and not exists(select 1 from public.item_images image
      where object.name in (image.thumbnail_path, image.image_path))
    and not exists(select 1 from public.menu_items dish
      cross join lateral unnest(dish.image_urls || array[dish.image_url]) url
      where split_part(split_part(url, '?', 1), '/menu-photos/', 2) = object.name)
  order by object.name limit 100;
$$;

commit;
