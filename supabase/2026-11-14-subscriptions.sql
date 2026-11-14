-- APPLIED to live 2026-11-14.
-- Skwyd Hub subscriptions: price list, a subscription per company (trial → paid → grace → locked), invoices,
-- POS device limit, self sign-up with a free trial, and the platform-owner (Skwyd Hub) admin functions.
-- Eat Out stays complimentary (never billed, never locked).

begin;

-- ============ who runs Skwyd Hub ============
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
insert into public.platform_admins (user_id, name)
  select id, 'Ziad' from auth.users where lower(email) = 'ziad.khayat91@gmail.com' on conflict do nothing;

create or replace function public.slick_is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- platform-wide billing settings (trial length, grace days, currency)
create table if not exists public.platform_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
insert into public.platform_settings (id, data) values ('billing', '{"trialDays":14,"graceDays":7,"currency":"USD"}')
  on conflict (id) do nothing;

-- ============ price list ============
-- unit: device = per activated POS device, branch = per active branch, company = once per company
create table if not exists public.sub_products (
  id text primary key,
  name text not null,
  name_ar text,
  description text,
  unit text not null default 'branch' check (unit in ('device','branch','company')),
  monthly numeric not null default 0,
  yearly numeric not null default 0,
  required boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0
);
alter table public.sub_products enable row level security;
drop policy if exists "anyone reads the price list" on public.sub_products;
create policy "anyone reads the price list" on public.sub_products for select using (active);
insert into public.sub_products (id, name, unit, required, sort) values
  ('pos',             'POS',             'device', true,  1),
  ('inventory',       'Inventory',       'branch', false, 2),
  ('marketing',       'Marketing',       'branch', false, 3),
  ('online_ordering', 'Online Ordering', 'branch', false, 4),
  ('marketplace',     'Marketplace',     'branch', false, 5),
  ('call_center',     'Call Center',     'branch', false, 6)
on conflict (id) do nothing;

-- ============ companies: contact details ============
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists contact_name text;
alter table public.companies add column if not exists country text;
update public.companies c set account_no = s.data->>'accountNo'
  from public.settings s where s.company_id = c.id and s.id = 'company' and c.account_no is null and coalesce(s.data->>'accountNo', '') <> '';

-- ============ one subscription per company ============
create table if not exists public.subscriptions (
  company_id text primary key references public.companies(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','active','cancelled')),
  complimentary boolean not null default false,      -- never billed, never locked (Eat Out)
  cycle text not null default 'monthly' check (cycle in ('monthly','yearly')),
  trial_ends_at timestamptz,
  paid_until timestamptz,                            -- end of the last paid period
  grace_days integer,                                -- null = platform default
  pos_devices integer not null default 1 check (pos_devices >= 0),
  modules text[] not null default '{}',
  discount_pct numeric not null default 0 check (discount_pct between 0 and 100),
  custom_prices jsonb not null default '{}'::jsonb,  -- {"pos": {"monthly": 25}} overrides the price list for this company
  locked boolean not null default false,             -- locked by hand by the platform owner
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop trigger if exists touch_subscriptions on public.subscriptions;
create trigger touch_subscriptions before update on public.subscriptions for each row execute function public.touch();

insert into public.subscriptions (company_id, status, complimentary, pos_devices, modules)
  select id, 'active', true, 999, array['inventory','marketing','online_ordering','marketplace','call_center'] from public.companies where id = 'co_eatout'
  on conflict (company_id) do nothing;

-- ============ invoices ============
create sequence if not exists public.sub_invoice_seq start 1001;
create table if not exists public.sub_invoices (
  id text primary key default 'si_' || replace(gen_random_uuid()::text, '-', ''),
  number text unique not null default 'SKW-' || lpad(nextval('public.sub_invoice_seq')::text, 6, '0'),
  company_id text not null references public.companies(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  cycle text not null,
  lines jsonb not null default '[]'::jsonb,          -- [{id,name,unit,qty,price,amount}]
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'open' check (status in ('open','paid','void')),
  due_at timestamptz not null default now() + interval '7 days',
  paid_at timestamptz,
  method text,                                       -- card, transfer, whish, cash…
  reference text,
  provider_ref text,                                 -- card payment provider's transaction id (later)
  created_at timestamptz not null default now()
);
create index if not exists sub_invoices_company on public.sub_invoices (company_id, created_at desc);
alter table public.sub_invoices enable row level security;

-- ============ state of a company's subscription ============
create or replace function public.slick_sub_state(p_company text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s subscriptions; cfg jsonb := (select data from platform_settings where id = 'billing');
        grace int; ends timestamptz; st text; lock_at timestamptz; used int; br int; owe numeric; nopen int;
begin
  select * into s from subscriptions where company_id = p_company;
  if s.company_id is null then return jsonb_build_object('state', 'none'); end if;
  grace := coalesce(s.grace_days, (cfg->>'graceDays')::int, 7);
  if s.complimentary then st := 'active';
  elsif s.locked or s.status = 'cancelled' then st := 'locked';
  else
    ends := case when s.status = 'trial' then s.trial_ends_at else s.paid_until end;
    lock_at := ends + make_interval(days => grace);
    st := case when ends is null then 'locked'
               when now() < ends then s.status                 -- 'trial' or 'active'
               when now() < lock_at then 'grace'
               else 'locked' end;
  end if;
  select count(*) into used from devices where company_id = p_company and activated_at is not null and not coalesce(deleted, false);
  select count(*) into br from branches where company_id = p_company and coalesce(active, true);
  select coalesce(sum(total), 0), count(*) into owe, nopen from sub_invoices where company_id = p_company and status = 'open';
  return jsonb_build_object(
    'state', st, 'status', s.status, 'complimentary', s.complimentary, 'cycle', s.cycle,
    'trialEndsAt', s.trial_ends_at, 'paidUntil', s.paid_until, 'lockAt', lock_at,
    'daysLeft', case when st in ('trial','active') and ends is not null then ceil(extract(epoch from ends - now()) / 86400)
                     when st = 'grace' then ceil(extract(epoch from lock_at - now()) / 86400) end,
    'posDevices', s.pos_devices, 'posUsed', used, 'branches', br, 'modules', to_jsonb(s.modules),
    'owed', owe, 'openInvoices', nopen);
end $$;

create or replace function public.slick_sub_locked(p_company text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not s.complimentary and (s.locked or s.status = 'cancelled' or
                     coalesce(case when s.status = 'trial' then s.trial_ends_at else s.paid_until end, '-infinity'::timestamptz)
                       + make_interval(days => coalesce(s.grace_days, (select (data->>'graceDays')::int from platform_settings where id = 'billing'), 7)) <= now())
                   from subscriptions s where s.company_id = p_company), false);
$$;

-- price lines for the next period
create or replace function public.slick_sub_quote(p_company text, p_cycle text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s subscriptions; p sub_products; cyc text; qty numeric; price numeric; lines jsonb := '[]'::jsonb; sub numeric := 0; br int; disc numeric;
begin
  select * into s from subscriptions where company_id = p_company;
  if s.company_id is null then return null; end if;
  cyc := coalesce(p_cycle, s.cycle);
  select greatest(count(*), 1) into br from branches where company_id = p_company and coalesce(active, true);
  for p in select * from sub_products where active order by sort loop
    if not (p.required or p.id = any(s.modules)) then continue; end if;
    qty := case p.unit when 'device' then s.pos_devices when 'branch' then br else 1 end;
    price := coalesce((s.custom_prices->p.id->>cyc)::numeric, case when cyc = 'yearly' then p.yearly else p.monthly end);
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'unit', p.unit, 'qty', qty, 'price', price, 'amount', round(qty * price, 2));
    sub := sub + round(qty * price, 2);
  end loop;
  disc := round(sub * s.discount_pct / 100, 2);
  return jsonb_build_object('cycle', cyc, 'lines', lines, 'subtotal', sub, 'discount', disc, 'total', sub - disc,
                            'currency', coalesce((select data->>'currency' from platform_settings where id = 'billing'), 'USD'));
end $$;

-- ============ for the restaurant's own back office ============
create or replace function public.slick_my_subscription() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me text := slick_company();
begin
  if me is null then return null; end if;
  return slick_sub_state(me) || jsonb_build_object(
    'company', (select jsonb_build_object('name', name, 'accountNo', account_no) from companies where id = me),
    'quote', slick_sub_quote(me),
    'products', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort), '[]') from sub_products p where p.active),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number, 'periodStart', i.period_start, 'periodEnd', i.period_end,
                   'lines', i.lines, 'total', i.total, 'currency', i.currency, 'status', i.status, 'dueAt', i.due_at, 'paidAt', i.paid_at, 'method', i.method)
                   order by i.created_at desc), '[]') from sub_invoices i where i.company_id = me and i.status <> 'void'));
end $$;
grant execute on function public.slick_my_subscription() to authenticated, anon;   -- anon: POS devices signed in with a device key

-- a locked company's staff and devices lose access to its data (the billing page above still works)
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $function$
  select case when public.slick_sub_locked(public.slick_company()) then null else coalesce(
    public.staff_role_user(),
    (select 'cashier'::text from public.devices d
      where d.auth_uid = auth.uid() and d.activated_at is not null and coalesce(d.deleted, false) = false limit 1),
    (select 'cashier'::text where public.slick_device_id() is not null)
  ) end;
$function$;

-- online ordering stops while a company is locked
create or replace function public.slick_sub_order_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.slick_sub_locked(new.company_id) then
    raise exception 'This restaurant can''t take orders right now.';
  end if;
  return new;
end $$;
drop trigger if exists b_slick_sub_guard on public.orders;
create trigger b_slick_sub_guard before insert on public.orders for each row execute function public.slick_sub_order_guard();

-- ============ POS device limit ============
create or replace function public.slick_sub_device_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; used int;
begin
  if new.activated_at is null or (tg_op = 'UPDATE' and old.activated_at is not null) or coalesce(new.deleted, false) then return new; end if;
  if public.slick_sub_locked(new.company_id) then raise exception 'Your Skwyd Hub subscription is locked. Pay the open invoice to use your POS devices.'; end if;
  select pos_devices into lim from subscriptions where company_id = new.company_id and not complimentary;
  if lim is null then return new; end if;
  select count(*) into used from devices where company_id = new.company_id and id <> new.id and activated_at is not null and not coalesce(deleted, false);
  if used >= lim then
    raise exception 'Your plan includes % POS device%. Add more devices to your subscription to activate this one.', lim, case when lim = 1 then '' else 's' end;
  end if;
  return new;
end $$;
drop trigger if exists b_slick_sub_devices on public.devices;
create trigger b_slick_sub_devices before insert or update of activated_at on public.devices for each row execute function public.slick_sub_device_guard();

-- the POS activation screen gets a clear answer instead of an error
create or replace function public.slick_activate_device_key(p_code text) returns json
language plpgsql security definer set search_path = public as $function$
declare d record; k text;
begin
  if (select count(*) from public.slick_act_fails where at > now() - interval '10 minutes') >= 30 then
    return json_build_object('error', 'wait');
  end if;
  select * into d from public.devices where code = p_code and coalesce(deleted, false) = false limit 1;
  if not found or coalesce(p_code, '') !~ '^[0-9]{6}$' then
    insert into public.slick_act_fails default values;
    delete from public.slick_act_fails where at < now() - interval '1 day';
    return json_build_object('error', 'invalid');
  end if;
  if d.activated_at is not null then return json_build_object('error', 'used'); end if;
  k := encode(extensions.gen_random_bytes(32), 'hex');
  begin
    update public.devices set activated_at = now(), last_seen = now(), key_hash = encode(extensions.digest(k, 'sha256'), 'hex') where id = d.id;
  exception when others then
    return json_build_object('error', 'plan', 'message', sqlerrm);
  end;
  return json_build_object('id', d.id, 'key', k, 'topic', (select topic from public.slick_rt where id = 1));
end $function$;

-- ============ self sign-up with a free trial ============
-- The sign-up page calls supabase.auth.signUp with user metadata {signup:'company', company, name, phone, country}.
-- Before the user is saved, it gets a company id and a new account number (returned to the page in user_metadata);
-- right after, the company, its owner, a brand, a branch, a Cash payment method and the trial are created.
create or replace function public.slick_signup_prepare() returns trigger
language plpgsql security definer set search_path = public as $$
declare acct text; tries int := 0;
begin
  if coalesce(new.raw_user_meta_data->>'signup', '') <> 'company' then return new; end if;
  loop
    acct := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    exit when not exists (select 1 from public.companies where account_no = acct) or tries > 50;
    tries := tries + 1;
  end loop;
  new.raw_user_meta_data := new.raw_user_meta_data
    || jsonb_build_object('account_no', acct, 'company_id', 'co_' || replace(gen_random_uuid()::text, '-', ''));
  return new;
end $$;

create or replace function public.slick_signup_company() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data; cid text; nm text; days int; br text; bd text;
begin
  if coalesce(m->>'signup', '') <> 'company' or coalesce(m->>'company_id', '') = '' then return new; end if;
  cid := m->>'company_id';
  nm := left(coalesce(nullif(trim(m->>'company'), ''), 'My Restaurant'), 80);
  days := coalesce((select (data->>'trialDays')::int from platform_settings where id = 'billing'), 14);
  insert into companies (id, name, account_no, email, phone, contact_name, country)
    values (cid, nm, m->>'account_no', new.email, left(m->>'phone', 30), left(m->>'name', 80), left(coalesce(m->>'country', 'Lebanon'), 60));
  insert into subscriptions (company_id, status, trial_ends_at, pos_devices, modules)
    values (cid, 'trial', now() + make_interval(days => days), 2, array['inventory','marketing','online_ordering','marketplace','call_center']);
  insert into staff (company_id, user_id, name, role) values (cid, new.id, left(coalesce(nullif(trim(m->>'name'), ''), 'Owner'), 80), 'owner');
  insert into staff_users (company_id, name, email, phone, user_id, branch_ids)
    values (cid, left(coalesce(nullif(trim(m->>'name'), ''), 'Owner'), 80), new.email, left(m->>'phone', 30), new.id, '{}');
  insert into settings (company_id, id, data)
    values (cid, 'company', jsonb_build_object('name', nm, 'accountNo', m->>'account_no', 'currency', coalesce(nullif(left(upper(m->>'currency'), 3), ''), 'USD'), 'country', coalesce(m->>'country', 'Lebanon'), 'taxInclusive', true));
  insert into brands (company_id, name) values (cid, nm) returning id into bd;
  insert into branches (company_id, brand_id, name, code) values (cid, bd, 'Main Branch', 'B01') returning id into br;
  insert into payment_methods (company_id, name, type, open_drawer, sort) values (cid, 'Cash', 'cash', true, 1);
  return new;
end $$;

drop trigger if exists slick_signup_prepare on auth.users;
create trigger slick_signup_prepare before insert on auth.users for each row execute function public.slick_signup_prepare();
drop trigger if exists slick_signup_company on auth.users;
create trigger slick_signup_company after insert on auth.users for each row execute function public.slick_signup_company();

-- ============ Skwyd Hub owner admin (platform admins only) ============
create or replace function public.slick_pa_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin if not slick_is_platform_admin() then raise exception 'Not allowed'; end if; end $$;

create or replace function public.slick_pa_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform slick_pa_check();
  return jsonb_build_object(
    'settings', (select data from platform_settings where id = 'billing'),
    'products', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort), '[]') from sub_products p),
    'companies', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]') from (
       select c.id, c.name, c.account_no, c.email, c.phone, c.contact_name, c.country, c.created_at,
              slick_sub_state(c.id) as sub, to_jsonb(s) as subscription, slick_sub_quote(c.id) as quote,
              (select count(*) from orders o where o.company_id = c.id and o.created_at > now() - interval '30 days') as orders30
       from companies c left join subscriptions s on s.company_id = c.id) x));
end $$;

create or replace function public.slick_pa_invoices(p_company text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform slick_pa_check();
  return (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]') from sub_invoices i where i.company_id = p_company);
end $$;

create or replace function public.slick_pa_update_subscription(p_company text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform slick_pa_check();
  insert into subscriptions (company_id) values (p_company) on conflict do nothing;
  update subscriptions set
    status        = coalesce(p->>'status', status),
    complimentary = coalesce((p->>'complimentary')::boolean, complimentary),
    cycle         = coalesce(p->>'cycle', cycle),
    trial_ends_at = case when p ? 'trialEndsAt' then (p->>'trialEndsAt')::timestamptz else trial_ends_at end,
    paid_until    = case when p ? 'paidUntil' then (p->>'paidUntil')::timestamptz else paid_until end,
    grace_days    = case when p ? 'graceDays' then (p->>'graceDays')::int else grace_days end,
    pos_devices   = coalesce((p->>'posDevices')::int, pos_devices),
    modules       = case when p ? 'modules' then array(select jsonb_array_elements_text(p->'modules')) else modules end,
    discount_pct  = coalesce((p->>'discountPct')::numeric, discount_pct),
    custom_prices = coalesce(p->'customPrices', custom_prices),
    locked        = coalesce((p->>'locked')::boolean, locked),
    notes         = case when p ? 'notes' then p->>'notes' else notes end
  where company_id = p_company;
  if p ? 'company' then
    update companies set name = coalesce(p->'company'->>'name', name), email = coalesce(p->'company'->>'email', email),
      phone = coalesce(p->'company'->>'phone', phone), contact_name = coalesce(p->'company'->>'contactName', contact_name)
    where id = p_company;
  end if;
  return slick_sub_state(p_company);
end $$;

-- bill the next period: from the end of what's paid (or today), one month or one year
create or replace function public.slick_pa_create_invoice(p_company text, p_due_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s subscriptions; q jsonb; st timestamptz; en timestamptz; inv sub_invoices;
begin
  perform slick_pa_check();
  select * into s from subscriptions where company_id = p_company;
  if s.company_id is null then raise exception 'No subscription'; end if;
  q := slick_sub_quote(p_company);
  st := greatest(coalesce(s.paid_until, now()), now());
  en := st + case when s.cycle = 'yearly' then interval '1 year' else interval '1 month' end;
  insert into sub_invoices (company_id, period_start, period_end, cycle, lines, subtotal, discount, total, currency, due_at)
    values (p_company, st, en, s.cycle, q->'lines', (q->>'subtotal')::numeric, (q->>'discount')::numeric, (q->>'total')::numeric,
            q->>'currency', now() + make_interval(days => greatest(p_due_days, 0)))
    returning * into inv;
  return to_jsonb(inv);
end $$;

-- paid: the subscription runs until the end of that invoice's period
create or replace function public.slick_pa_mark_paid(p_invoice text, p_method text default null, p_reference text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv sub_invoices;
begin
  perform slick_pa_check();
  update sub_invoices set status = 'paid', paid_at = now(), method = p_method, reference = p_reference
    where id = p_invoice and status = 'open' returning * into inv;
  if inv.id is null then raise exception 'Invoice not found or not open'; end if;
  update subscriptions set status = 'active', locked = false, paid_until = greatest(coalesce(paid_until, inv.period_end), inv.period_end)
    where company_id = inv.company_id;
  return to_jsonb(inv);
end $$;

create or replace function public.slick_pa_void_invoice(p_invoice text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv sub_invoices;
begin
  perform slick_pa_check();
  update sub_invoices set status = 'void' where id = p_invoice and status = 'open' returning * into inv;
  if inv.id is null then raise exception 'Invoice not found or not open'; end if;
  return to_jsonb(inv);
end $$;

create or replace function public.slick_pa_save_products(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare x jsonb;
begin
  perform slick_pa_check();
  for x in select * from jsonb_array_elements(p) loop
    insert into sub_products (id, name, name_ar, description, unit, monthly, yearly, required, active, sort)
    values (x->>'id', x->>'name', x->>'name_ar', x->>'description', coalesce(x->>'unit', 'branch'), coalesce((x->>'monthly')::numeric, 0),
            coalesce((x->>'yearly')::numeric, 0), coalesce((x->>'required')::boolean, false), coalesce((x->>'active')::boolean, true), coalesce((x->>'sort')::int, 0))
    on conflict (id) do update set name = excluded.name, name_ar = excluded.name_ar, description = excluded.description, unit = excluded.unit,
      monthly = excluded.monthly, yearly = excluded.yearly, required = excluded.required, active = excluded.active, sort = excluded.sort;
  end loop;
  return (select coalesce(jsonb_agg(to_jsonb(s) order by s.sort), '[]') from sub_products s);
end $$;

create or replace function public.slick_pa_save_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform slick_pa_check();
  update platform_settings set data = data || p where id = 'billing';
  return (select data from platform_settings where id = 'billing');
end $$;

-- only signed-in users can call the admin and billing functions (they check who is asking themselves)
do $$
declare f text;
begin
  foreach f in array array['slick_pa_overview()','slick_pa_invoices(text)','slick_pa_update_subscription(text,jsonb)','slick_pa_create_invoice(text,integer)',
    'slick_pa_mark_paid(text,text,text)','slick_pa_void_invoice(text)','slick_pa_save_products(jsonb)','slick_pa_save_settings(jsonb)',
    'slick_pa_check()','slick_is_platform_admin()','slick_sub_state(text)','slick_sub_quote(text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- internal helpers used by triggers and policies
  foreach f in array array['slick_signup_prepare()','slick_signup_company()','slick_sub_device_guard()','slick_sub_order_guard()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
-- slick_sub_state/quote are only useful to platform admins directly; the restaurant uses slick_my_subscription()
revoke execute on function public.slick_sub_state(text) from authenticated;
revoke execute on function public.slick_sub_quote(text, text) from authenticated;

notify pgrst, 'reload schema';
commit;
