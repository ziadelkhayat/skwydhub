-- "Fast Order" is gone: the order types are Dine-in, Pickup (takeaway) and Delivery.
-- Fast orders become Dine-in orders (without a table). Older POS tablets still sending "fast" are turned into Dine-in.
create or replace function public.skwyd_order_type_fast()
returns trigger language plpgsql as $$ begin if new.type = 'fast' then new.type := 'dinein'; end if; return new; end $$;
drop trigger if exists a0_skwyd_order_type_fast on public.orders;
create trigger a0_skwyd_order_type_fast before insert or update of type on public.orders for each row execute function public.skwyd_order_type_fast();

alter table public.orders disable trigger user;
update public.orders set type = 'dinein' where type = 'fast';
alter table public.orders enable trigger user;
alter table public.orders drop constraint if exists orders_type_check;
alter table public.orders add constraint orders_type_check check (type = any (array['dinein','pickup','delivery']));

-- taxes / charges: "fast" in their order types becomes "dinein" (no duplicates)
update public.taxes set order_types = (select coalesce(jsonb_agg(distinct case when v = 'fast' then 'dinein' else v end), '[]'::jsonb) from jsonb_array_elements_text(order_types) v)
 where order_types::text ~ '"fast"';
update public.charges set order_types = (select array_agg(distinct case when v = 'fast' then 'dinein' else v end) from unnest(order_types) v)
 where 'fast' = any(order_types);

-- sales channels: drop "fast" from the POS channel's order types (Dine-in stays)
update public.settings set data = jsonb_set(data, '{list}', (
  select coalesce(jsonb_agg(case when c ? 'types' then jsonb_set(c, '{types}', (select coalesce(jsonb_agg(distinct case when t = 'fast' then 'dinein' else t end), '[]'::jsonb) from jsonb_array_elements_text(c->'types') t)) else c end), '[]'::jsonb)
  from jsonb_array_elements(data->'list') c))
 where id = 'sales_channels' and data ? 'list' and data::text ~ '"fast"';
