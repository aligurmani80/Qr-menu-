-- ==========================================================================
-- QR Menu — two fixes for the live Supabase project
--   1. orders.restaurant_id  → every order belongs to one restaurant
--   2. app_settings lockdown → the anon key can no longer read the login
--
-- Run this ONCE in the Supabase dashboard:
--   Project → SQL Editor → New query → paste everything → Run
-- No password appears in this file. It only re-hashes what is already stored.
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. ORDERS ARE PER RESTAURANT
-- --------------------------------------------------------------------------

alter table public.orders
  add column if not exists restaurant_id text not null default '';

comment on column public.orders.restaurant_id is
  'Tenant id: the ?r= slug, or "restaurant" for the installed copy';

create index if not exists orders_restaurant_created_idx
  on public.orders (restaurant_id, created_at desc);

-- Orders written before tenants existed have no owner. The five test rows
-- (ORD-1025 twice, 1026, 1027, 1028) are all of them; a browser key is not
-- allowed to delete rows, so this cleanup runs here once.
delete from public.orders where restaurant_id = '';

-- --------------------------------------------------------------------------
-- 2. APP_SETTINGS: NO BROWSER ACCESS TO THE TABLE AT ALL
-- --------------------------------------------------------------------------

alter table public.app_settings enable row level security;

-- Drop every policy that used to let the anon key read or write the table.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'app_settings'
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end
$$;

revoke all on public.app_settings from anon;
revoke all on public.app_settings from authenticated;

-- Migrate the existing plain-text password to a SHA-256 hash, right now.
update public.app_settings
   set value = jsonb_build_object(
         'username', value ->> 'username',
         'password_hash', encode(digest(value ->> 'password', 'sha256'), 'hex')
       ),
       updated_at = now()
 where key = 'super_admin'
   and value ? 'password'
   and not (value ? 'password_hash');

-- --------------------------------------------------------------------------
-- 3. THE ONLY WAYS IN: THREE small SECURITY DEFINER functions
--    They return true/false (or a username) — never a stored password.
-- --------------------------------------------------------------------------

-- 3a. Does this username + password match?  Returns boolean only.
create or replace function public.super_admin_login_ok(
  p_username text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_value jsonb;
  v_hash  text;
begin
  select value
    into v_value
    from public.app_settings
   where key = 'super_admin'
   limit 1;

  if v_value is null then
    return false;
  end if;

  v_hash := v_value ->> 'password_hash';

  -- Safety net for a row that still holds the old plain-text password.
  if v_hash is null and v_value ? 'password' then
    v_hash := encode(digest(coalesce(v_value ->> 'password', ''), 'sha256'), 'hex');
    update public.app_settings
       set value = jsonb_build_object(
             'username', v_value ->> 'username',
             'password_hash', v_hash
           ),
           updated_at = now()
     where key = 'super_admin';
  end if;

  if v_hash is null or length(v_hash) <> 64 then
    return false;
  end if;

  return coalesce(
    lower(trim(coalesce(v_value ->> 'username', ''))) = lower(trim(coalesce(p_username, '')))
    and v_hash = encode(digest(coalesce(p_password, ''), 'sha256'), 'hex'),
    false
  );
end
$$;

-- 3b. Change the login, but only after the current password is proven.
create or replace function public.super_admin_login_change(
  p_username text,
  p_current_password text,
  p_new_username text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_value jsonb;
  v_hash  text;
  v_name  text;
begin
  if public.super_admin_login_ok(p_username, p_current_password) is distinct from true then
    return false;
  end if;

  select value
    into v_value
    from public.app_settings
   where key = 'super_admin'
   limit 1;

  if v_value is null then
    return false;
  end if;

  v_hash := v_value ->> 'password_hash';
  v_name := coalesce(nullif(trim(coalesce(p_new_username, '')), ''), v_value ->> 'username');

  if nullif(trim(coalesce(p_new_password, '')), '') is not null then
    if length(trim(p_new_password)) < 8 then
      return false;
    end if;
    v_hash := encode(digest(p_new_password, 'sha256'), 'hex');
  end if;

  update public.app_settings
     set value = jsonb_build_object('username', v_name, 'password_hash', v_hash),
         updated_at = now()
   where key = 'super_admin';

  return true;
end
$$;

-- 3c. First-run bootstrap: creates the login ONLY when the table has none yet.
--     It can never overwrite or reveal an existing login.
create or replace function public.super_admin_login_setup(
  p_username text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.app_settings where key = 'super_admin';
  if v_count > 0 then
    return false;
  end if;

  if coalesce(nullif(trim(coalesce(p_username, '')), ''), '') = '' then
    return false;
  end if;
  if length(coalesce(p_password, '')) < 8 then
    return false;
  end if;

  insert into public.app_settings (key, value, updated_at)
  values (
    'super_admin',
    jsonb_build_object(
      'username', trim(p_username),
      'password_hash', encode(digest(p_password, 'sha256'), 'hex')
    ),
    now()
  );

  return true;
end
$$;

revoke all on function public.super_admin_login_ok(text, text) from public;
revoke all on function public.super_admin_login_change(text, text, text, text) from public;
revoke all on function public.super_admin_login_setup(text, text) from public;

grant execute on function public.super_admin_login_ok(text, text) to anon, authenticated;
grant execute on function public.super_admin_login_change(text, text, text, text) to anon, authenticated;
grant execute on function public.super_admin_login_setup(text, text) to anon, authenticated;

-- Let PostgREST discover the new functions and the new column immediately.
notify pgrst, 'reload schema';

-- --------------------------------------------------------------------------
-- Check afterwards (should return 401/403 from the REST API):
--   curl "https://<project>.supabase.co/rest/v1/app_settings?select=*" \
--        -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
-- --------------------------------------------------------------------------
