begin;

create unique index menu_unique_category_name on public.menu_categories
  (lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))));

create unique index menu_unique_collection_name on public.special_collections
  (lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))));

commit;
