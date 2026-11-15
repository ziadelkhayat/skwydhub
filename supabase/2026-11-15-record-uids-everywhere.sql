-- (applied live as record_uids_everywhere) every record gets a random unique ID (uid) used in page addresses
do $$
declare t text;
begin
  foreach t in array array['brands','branches','categories','charges','customers','day_closes','delivery_zones','devices','gift_card_codes','house_account_txns','inventory_categories','inventory_docs','loyalty_rewards','modifier_options','modifiers','order_sources','order_transactions','orders','payment_methods','roles','shifts','staff_users','suppliers','tax_groups','taxes','variant_sets','warehouses'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists uid uuid not null default gen_random_uuid()', t);
      execute format('create unique index if not exists %I on public.%I(uid)', t || '_uid_key', t);
    end if;
  end loop;
end $$;
