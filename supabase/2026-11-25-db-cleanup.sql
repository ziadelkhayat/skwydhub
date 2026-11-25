-- Drop old slick_* trigger functions that no trigger uses; stop API callers from running trigger functions.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
             and not exists (select 1 from pg_trigger t where t.tgfoid = p.oid)
  loop execute format('drop function %s', r.sig); end loop;
end $$;
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop execute format('revoke execute on function %s from public, anon, authenticated', r.sig); end loop;
end $$;
-- Indexes for foreign keys; drop duplicate index
drop index if exists public.orders_created_desc;
create index if not exists categories_brand_id_idx on public.categories (brand_id);
create index if not exists delivery_zones_branch_id_idx on public.delivery_zones (branch_id);
create index if not exists devices_branch_id_idx on public.devices (branch_id);
create index if not exists orders_device_id_idx on public.orders (device_id);
create index if not exists orders_shift_id_idx on public.orders (shift_id);
create index if not exists orders_zone_id_idx on public.orders (zone_id);
create index if not exists platform_view_company_id_idx on public.platform_view (company_id);
create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists shifts_branch_id_idx on public.shifts (branch_id);
create index if not exists shifts_device_id_idx on public.shifts (device_id);
create index if not exists staff_branch_id_idx on public.staff (branch_id);
create index if not exists staff_users_role_id_idx on public.staff_users (role_id);
create index if not exists stock_counts_item_id_idx on public.stock_counts (item_id);
