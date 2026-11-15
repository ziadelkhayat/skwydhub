-- (applied live as brand_web_address) each brand's web ordering address: order.skwydhub.com/<slug>; unique across every business
alter table public.brands add column if not exists slug text;
create unique index if not exists brands_slug_key on public.brands (lower(slug)) where slug is not null;
alter table public.brands drop constraint if exists brands_slug_format;
alter table public.brands add constraint brands_slug_format check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$');
update public.brands set slug = 'thewok' where id = 'brd_thewok' and slug is null;
