-- (applied live as record_uids_for_addresses) a random unique ID for the address of menu items and inventory items
alter table public.products add column if not exists uid uuid not null default gen_random_uuid();
alter table public.inventory_items add column if not exists uid uuid not null default gen_random_uuid();
create unique index if not exists products_uid_key on public.products(uid);
create unique index if not exists inventory_items_uid_key on public.inventory_items(uid);
