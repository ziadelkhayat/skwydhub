-- a zone's delivery fee follows the Delivery Charge it uses (settings 'dcharges'.map zone -> charge):
-- turned off, deleted, made a percentage or changed -> the zone's fee changes too, whichever app made the change
create or replace function public.skwyd_charge_zone_fees()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare f numeric;
begin
  f := case when coalesce(new.deleted,false) or new.active = false or coalesce(new.type,'fixed') <> 'fixed' then 0 else coalesce(new.value,0) end;
  update delivery_zones z set fee = f, updated_at = now()
   where z.company_id is not distinct from new.company_id and coalesce(z.fee,0) <> f
     and exists (select 1 from settings s where s.id = 'dcharges' and s.company_id is not distinct from new.company_id and s.data->'map'->>z.id = new.id);
  return new;
end $$;
drop trigger if exists skwyd_charge_zone_fees on public.charges;
create trigger skwyd_charge_zone_fees after update of deleted, active, value, type on public.charges for each row execute function public.skwyd_charge_zone_fees();

-- one-time: zones whose charge was already deleted / off still had the old fee (Beirut kept $2 after its Delivery Charge was deleted)
update delivery_zones z set fee = 0, updated_at = now()
 where coalesce(z.fee,0) <> 0 and exists (
   select 1 from settings s join charges c on c.id = s.data->'map'->>z.id
    where s.id = 'dcharges' and s.company_id is not distinct from z.company_id
      and (coalesce(c.deleted,false) or c.active = false or coalesce(c.type,'fixed') <> 'fixed'));
