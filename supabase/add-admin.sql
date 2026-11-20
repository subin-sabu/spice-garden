-- Run manually in the Supabase SQL Editor for each approved administrator.
-- Replace the email below with the account created under Authentication > Users.
-- Existing administrators keep access. This script does not enable public admin signup.
begin;

do $$
declare
  staff_email text := 'REPLACE-WITH-ADMIN-EMAIL';
  staff_id uuid;
  confirmed_at timestamptz;
begin
  select id, email_confirmed_at into staff_id, confirmed_at
  from auth.users
  where lower(email) = lower(btrim(staff_email));

  if staff_id is null then
    raise exception 'Create the user in Authentication > Users before approving admin access.';
  end if;
  if confirmed_at is null then
    raise exception 'Confirm this user email in Supabase before approving admin access.';
  end if;

  insert into private.menu_admin(user_id) values (staff_id)
  on conflict (user_id) do nothing;
end $$;

commit;
