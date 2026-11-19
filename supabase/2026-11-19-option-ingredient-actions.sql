-- Option ingredients get an action: add (default, as before), remove, replace.
--   add:     { itemId, qty }                      adds qty of the ingredient (old negative quantities still work as before)
--   remove:  { itemId, action:"remove" }          takes out whatever this item's recipe uses of that ingredient, any size or variant
--   replace: { itemId, action:"replace", withId, qty? }   takes out the recipe's amount of itemId and uses withId instead
--                                                  (qty of withId; no qty = the same amount that was taken out)
-- One order line: recipe -> removes / replaces -> adds -> every ingredient clamped at 0 (a sale never puts stock back),
-- then multiplied by the line quantity. Lines are worked out separately, so one line can't cancel another's usage.

create or replace function public.skwyd_line_usage(li jsonb, p_type text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare p products; mo modifier_options; g jsonb; op jsonb; base jsonb := '{}'::jsonb; adds jsonb := '[]'::jsonb;
        k text; amt numeric; n numeric; lq numeric := coalesce((li->>'qty')::numeric, 1); out jsonb := '{}'::jsonb;
begin
  select * into p from products where id = li->>'productId';
  if p.id is not null and coalesce(p.costing_method,'ingredients') = 'ingredients' then
    for g in select * from jsonb_array_elements(skwyd_item_recipe(p, li)) loop
      if g ? 'types' and not (g->'types') ? p_type then continue; end if;
      base := jsonb_set(base, array[g->>'itemId'], to_jsonb(coalesce((base->>(g->>'itemId'))::numeric,0) + coalesce((g->>'qty')::numeric,0)));
    end loop;
  end if;
  -- removes and replaces work on the recipe; adds are collected and applied after
  for op in select * from jsonb_array_elements(coalesce(li->'options','[]'::jsonb)) loop
    select * into mo from modifier_options where id = op->>'id';
    if mo.id is null or coalesce(mo.costing_method,'ingredients') <> 'ingredients' then continue; end if;
    n := greatest(coalesce((op->>'qty')::numeric, 1), 0);
    for g in select * from jsonb_array_elements(coalesce(mo.ingredients,'[]'::jsonb)) loop
      if g ? 'types' and not (g->'types') ? p_type then continue; end if;
      if coalesce(g->>'action','add') in ('remove','replace') then
        amt := coalesce((base->>(g->>'itemId'))::numeric, 0);
        base := base - (g->>'itemId');
        if g->>'action' = 'replace' and coalesce(g->>'withId','') <> '' then
          adds := adds || jsonb_build_object('itemId', g->>'withId',
                    'qty', case when coalesce((g->>'qty')::numeric,0) > 0 then (g->>'qty')::numeric else amt end, 'once', true);
        end if;
      else
        adds := adds || jsonb_build_object('itemId', g->>'itemId', 'qty', coalesce((g->>'qty')::numeric,0) * n);
      end if;
    end loop;
  end loop;
  for g in select * from jsonb_array_elements(adds) loop
    base := jsonb_set(base, array[g->>'itemId'], to_jsonb(coalesce((base->>(g->>'itemId'))::numeric,0) + (g->>'qty')::numeric));
  end loop;
  for k in select jsonb_object_keys(base) loop
    amt := greatest((base->>k)::numeric, 0) * lq;
    if amt > 0 then out := jsonb_set(out, array[k], to_jsonb(amt)); end if;
  end loop;
  return out;
end $$;

-- what an order uses (stock preview, Sales stock items)
create or replace function public.skwyd_order_usage(p_items jsonb, p_type text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare li jsonb; u jsonb; k text; used jsonb := '{}'::jsonb;
begin
  for li in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    u := skwyd_line_usage(li, p_type);
    for k in select jsonb_object_keys(u) loop
      used := jsonb_set(used, array[k], to_jsonb(coalesce((used->>k)::numeric,0) + (u->>k)::numeric));
    end loop;
  end loop;
  return used;
end $$;

create or replace function public.slick_order_usage(p_items jsonb, p_type text)
returns jsonb language sql stable security definer set search_path to 'public' as $$ select skwyd_order_usage(p_items, p_type) $$;

-- the sale trigger: same as before, but usage comes from skwyd_order_usage
create or replace function public.skwyd_order_stock()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare li jsonb; it inventory_items; used jsonb; k text; q numeric; out_items jsonb := '[]'::jsonb; total numeric := 0; ot order_transactions; typ text;
begin
  if new.branch_id is null then return new; end if;
  typ := case when new.type in ('dinein','pickup','delivery') then new.type else 'pickup' end;

  -- sale completed: consume
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status is distinct from 'closed')
     and not exists (select 1 from order_transactions where order_id = new.id and kind = 'consumption') then
    used := skwyd_order_usage(new.items, typ);
    if used = '{}'::jsonb then return new; end if;
    for k in select jsonb_object_keys(used) loop
      select * into it from inventory_items where id = k;
      if it.id is null then continue; end if;
      q := (used->>k)::numeric / nullif(coalesce(it.factor,1),0);           -- recipe is in ingredient units, stock in storage units
      perform skwyd_move(new.branch_id, k, -q, 'Sales', 'OC-' || coalesce(new.no::text, new.id), 'Consumption from order');
      out_items := out_items || jsonb_build_object('itemId', k, 'qty', round(q, 5), 'cost', coalesce(it.cost,0));
      total := total + q * coalesce(it.cost,0);
    end loop;
    insert into order_transactions(ref, kind, order_id, order_no, branch_id, items, total_cost)
    values ('OC-' || coalesce(new.no::text, new.id), 'consumption', new.id, new.no::text, new.branch_id, out_items, round(total, 5))
    on conflict do nothing;

  -- voided after it was consumed: put the ingredients back
  elsif new.status = 'void' and tg_op = 'UPDATE' and old.status is distinct from 'void' then
    select * into ot from order_transactions where order_id = new.id and kind = 'consumption';
    if ot.id is null or exists (select 1 from order_transactions where order_id = new.id and kind = 'return') then return new; end if;
    for li in select * from jsonb_array_elements(ot.items) loop
      perform skwyd_move(ot.branch_id, li->>'itemId', (li->>'qty')::numeric, 'Sales', 'OR-' || coalesce(new.no::text, new.id), 'Return from voided order');
    end loop;
    insert into order_transactions(ref, kind, order_id, order_no, branch_id, items, total_cost)
    values ('OR-' || coalesce(new.no::text, new.id), 'return', new.id, new.no::text, ot.branch_id, ot.items, ot.total_cost)
    on conflict do nothing;
  end if;
  return new;
exception when others then
  -- never block a sale because of stock bookkeeping
  raise warning 'skwyd_order_stock: %', sqlerrm;
  return new;
end $$;

revoke execute on function public.skwyd_line_usage(jsonb, text) from public, anon;
grant execute on function public.skwyd_line_usage(jsonb, text) to authenticated, service_role;
