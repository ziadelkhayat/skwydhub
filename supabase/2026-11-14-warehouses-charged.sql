-- Warehouses are charged: each subscription includes a number of warehouses (like POS devices),
-- billed per warehouse, and a business can't add more than its plan allows.
-- Also puts back the sync of business details to the back office's Business page in slick_pa_update_subscription.

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.sub_products'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%unit%' loop
    execute format('alter table public.sub_products drop constraint %I', c);
  end loop;
end $$;
alter table public.sub_products add constraint sub_products_unit_check check (unit in ('device','warehouse','branch','company'));
insert into public.sub_products (id, name, unit, required, sort, monthly, yearly, active)
  select 'warehouse', 'Warehouse', 'warehouse', false, 2, 0, 0, coalesce((select active from public.sub_products where id = 'pos'), true)
  where not exists (select 1 from public.sub_products where id = 'warehouse');
update public.sub_products set sort = sort + 1 where id <> 'pos' and id <> 'warehouse' and sort >= 2;

alter table public.subscriptions add column if not exists warehouses int not null default 1;

do $$
declare d text;
begin
  -- the plan's state: warehouses allowed and in use
  d := pg_get_functiondef('public.slick_sub_state(text)'::regprocedure);
  if position('warehousesUsed' in d) = 0 then
    execute replace(d, '''posDevices'', s.pos_devices, ''posUsed'', used,',
      '''posDevices'', s.pos_devices, ''posUsed'', used, ''warehouses'', s.warehouses,
    ''warehousesUsed'', (select count(*) from warehouses w where w.company_id = p_company and not coalesce(w.deleted, false)),');
  end if;
  -- price lines: one per warehouse the plan includes
  d := pg_get_functiondef('public.slick_sub_quote(text,text)'::regprocedure);
  if position('''warehouse''' in d) = 0 then
    d := replace(d, 'if not (p.required or p.id = any(s.modules)) then continue; end if;',
                    'if not (p.required or p.id = any(s.modules) or (p.unit = ''warehouse'' and coalesce(s.warehouses, 0) > 0)) then continue; end if;');
    d := replace(d, 'when ''device'' then s.pos_devices', 'when ''device'' then s.pos_devices when ''warehouse'' then coalesce(s.warehouses, 0)');
    execute d;
  end if;
  -- admin: warehouses on the plan, and business details copied to the back office
  d := pg_get_functiondef('public.slick_pa_update_subscription(text,jsonb)'::regprocedure);
  if position('warehouses' in d) = 0 then
    d := replace(d, 'pos_devices   = coalesce((p->>''posDevices'')::int, pos_devices),',
                    'pos_devices   = coalesce((p->>''posDevices'')::int, pos_devices),
    warehouses    = coalesce((p->>''warehouses'')::int, warehouses),');
  end if;
  if position('ownerPhone' in d) = 0 then
    d := replace(d, 'return slick_sub_state(p_company);
end', 'if p ? ''company'' then   -- keep the back office''s Business page in step
    update settings set data = data || jsonb_strip_nulls(jsonb_build_object(''name'', nullif(trim(p->''company''->>''name''), ''''),
      ''email'', nullif(trim(p->''company''->>''email''), ''''), ''ownerPhone'', nullif(trim(p->''company''->>''phone''), ''''),
      ''bizCategory'', nullif(p->''company''->>''category'', ''''), ''bizSubcategory'', nullif(p->''company''->>''subcategory'', ''''),
      ''country'', nullif(p->''company''->>''country'', ''''), ''currency'', nullif(left(upper(p->''company''->>''currency''), 3), '''')))
    where company_id = p_company and id = ''company'';
  end if;
  return slick_sub_state(p_company);
end');
  end if;
  execute d;
  -- admin: New Business sets the warehouses too
  d := pg_get_functiondef('public.slick_pa_create_company(jsonb)'::regprocedure);
  if position('warehouses' in d) = 0 then
    execute replace(d, 'insert into settings (company_id, id, data)',
      'update subscriptions set warehouses = coalesce((p->>''warehouses'')::int, 1) where company_id = cid;
  insert into settings (company_id, id, data)');
  end if;
end $$;

-- a business can't add more warehouses than its plan includes
create or replace function public.slick_sub_warehouse_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; used int;
begin
  if coalesce(new.deleted, false) or (tg_op = 'UPDATE' and not coalesce(old.deleted, false)) then return new; end if;
  select warehouses into lim from subscriptions where company_id = new.company_id and not complimentary;
  if lim is null then return new; end if;
  select count(*) into used from warehouses where company_id = new.company_id and id <> new.id and not coalesce(deleted, false);
  if used >= lim then
    raise exception 'Your plan includes % warehouse%. Add more warehouses to your Skwyd Hub subscription to create this one.', lim, case when lim = 1 then '' else 's' end;
  end if;
  return new;
end $$;
drop trigger if exists b_slick_sub_warehouses on public.warehouses;
create trigger b_slick_sub_warehouses before insert or update of deleted on public.warehouses for each row execute function public.slick_sub_warehouse_guard();
