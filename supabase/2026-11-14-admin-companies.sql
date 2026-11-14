-- Skwyd Hub admin: create a business by hand, and open any business's back office ("view as").

-- ============ view as: a platform admin opens a business's back office ============
create table if not exists public.platform_view (
  user_id uuid primary key,
  company_id text not null references public.companies(id) on delete cascade,
  until timestamptz not null
);
alter table public.platform_view enable row level security;   -- only the functions below read it

-- the business a platform admin is viewing right now (null for everyone else)
create or replace function public.slick_view_company() returns text
language sql stable security definer set search_path = public as $$
  select v.company_id from platform_view v
  where v.user_id = auth.uid() and v.until > now() and exists (select 1 from platform_admins a where a.user_id = auth.uid());
$$;

-- a login's company: the business being viewed comes first
create or replace function public.skwyd_company() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.slick_view_company(),
    (select s.company_id from public.staff s where s.user_id = auth.uid()),
    (select d.company_id from public.devices d
      where d.auth_uid = auth.uid() and d.activated_at is not null and coalesce(d.deleted, false) = false limit 1),
    (select d.company_id from public.devices d where d.id = public.skwyd_device_id())
  );
$$;
create or replace function public.slick_company() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.slick_view_company(),
    (select s.company_id from public.staff s where s.user_id = auth.uid()),
    (select d.company_id from public.devices d
      where d.auth_uid = auth.uid() and d.activated_at is not null and coalesce(d.deleted, false) = false limit 1),
    (select d.company_id from public.devices d where d.id = public.slick_device_id())
  );
$$;

-- an admin viewing a business is its owner, even while its subscription is locked
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select case when public.slick_view_company() is not null then 'owner'
              when public.slick_sub_locked(public.slick_company()) then null
              else coalesce(
    public.staff_role_user(),
    (select 'cashier'::text from public.devices d
      where d.auth_uid = auth.uid() and d.activated_at is not null and coalesce(d.deleted, false) = false limit 1),
    (select 'cashier'::text where public.slick_device_id() is not null)
  ) end;
$$;

create or replace function public.slick_pa_view_as(p_company text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform slick_pa_check();
  if not exists (select 1 from companies where id = p_company) then raise exception 'Company not found'; end if;
  insert into platform_view (user_id, company_id, until) values (auth.uid(), p_company, now() + interval '4 hours')
    on conflict (user_id) do update set company_id = excluded.company_id, until = excluded.until;
  return (select jsonb_build_object('companyId', id, 'name', name, 'accountNo', account_no) from companies where id = p_company);
end $$;

create or replace function public.slick_stop_view() returns void
language sql security definer set search_path = public as $$
  delete from platform_view where user_id = auth.uid();
$$;

-- for the back office banner: which business an admin is viewing
create or replace function public.slick_my_view() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('companyId', c.id, 'name', c.name, 'accountNo', c.account_no, 'until', v.until)
  from platform_view v join companies c on c.id = v.company_id
  where v.user_id = auth.uid() and v.until > now() and exists (select 1 from platform_admins a where a.user_id = auth.uid());
$$;

-- ============ first sign-in: a user added as a business's owner becomes its owner ============
create or replace function public.skwyd_claim_login() returns text
language plpgsql security definer set search_path = public as $function$
declare u staff_users; lvl text; em text;
begin
  if auth.uid() is null then return null; end if;
  if exists(select 1 from staff where user_id = auth.uid()) then return (select role from staff where user_id = auth.uid()); end if;
  select email into em from auth.users where id = auth.uid();
  select * into u from staff_users where lower(email) = lower(em) and active and not deleted and (user_id is null or user_id = auth.uid()) limit 1;
  if u.id is null then return null; end if;
  if u.role = 'owner' and not exists (select 1 from staff where company_id = u.company_id and role = 'owner') then
    lvl := 'owner';   -- the owner the Skwyd Hub admin set up when creating the business
  else
    select case when 'bo_manage' = any(r.permissions) then 'admin' when exists(select 1 from unnest(r.permissions) p where p like 'bo_%') then 'agent' else null end
      into lvl from roles r where r.id = u.role_id and not r.deleted and r.company_id = u.company_id;
  end if;
  if lvl is null then return null; end if;
  update staff_users set user_id = auth.uid() where id = u.id;
  insert into staff (company_id, user_id, name, role, branch_id) values (u.company_id, auth.uid(), u.name, lvl, u.branch_ids[1]);
  return lvl;
end $function$;
create or replace function public.slick_claim_login() returns text
language sql security definer set search_path = public as $$ select public.skwyd_claim_login(); $$;

-- ============ create a business from the admin ============
-- p: {name, contactName, email, phone, country, status 'trial'|'active', trialDays, paidUntil, cycle, posDevices, modules[], complimentary}
create or replace function public.slick_pa_create_company(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid text := 'co_' || replace(gen_random_uuid()::text, '-', ''); acct text; tries int := 0; nm text; bd text; days int; st text; em text;
begin
  perform slick_pa_check();
  nm := left(nullif(trim(p->>'name'), ''), 80);
  if nm is null then raise exception 'Write the business name.'; end if;
  em := lower(nullif(trim(p->>'email'), ''));
  if em is not null and exists (select 1 from staff_users where lower(email) = em and not deleted) then
    raise exception 'This email is already a user of another business.';
  end if;
  loop
    acct := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    exit when not exists (select 1 from companies where account_no = acct) or tries > 50;
    tries := tries + 1;
  end loop;
  st := case when p->>'status' = 'active' then 'active' else 'trial' end;
  days := coalesce((p->>'trialDays')::int, (select (data->>'trialDays')::int from platform_settings where id = 'billing'), 14);
  insert into companies (id, name, account_no, email, phone, contact_name, country)
    values (cid, nm, acct, em, left(p->>'phone', 30), left(p->>'contactName', 80), left(coalesce(nullif(p->>'country', ''), 'Lebanon'), 60));
  insert into subscriptions (company_id, status, cycle, trial_ends_at, paid_until, pos_devices, modules, complimentary)
    values (cid, st, case when p->>'cycle' = 'yearly' then 'yearly' else 'monthly' end,
            case when st = 'trial' then now() + make_interval(days => days) end,
            case when st = 'active' then coalesce((p->>'paidUntil')::timestamptz, now() + interval '1 month') end,
            coalesce((p->>'posDevices')::int, 2),
            coalesce((select array_agg(x) from jsonb_array_elements_text(p->'modules') x), array['inventory','marketing','online_ordering','marketplace','call_center']),
            coalesce((p->>'complimentary')::boolean, false));
  insert into settings (company_id, id, data)
    values (cid, 'company', jsonb_build_object('name', nm, 'accountNo', acct, 'currency', 'USD', 'country', coalesce(nullif(p->>'country', ''), 'Lebanon'), 'taxInclusive', true));
  insert into brands (company_id, name) values (cid, nm) returning id into bd;
  insert into branches (company_id, brand_id, name, code) values (cid, bd, 'Main Branch', 'B01');
  insert into payment_methods (company_id, name, type, open_drawer, sort) values (cid, 'Cash', 'cash', true, 1);
  if em is not null then   -- the owner: becomes owner at first sign-in with this email
    insert into staff_users (company_id, name, email, phone, role, branch_ids, active)
      values (cid, left(coalesce(nullif(trim(p->>'contactName'), ''), 'Owner'), 80), em, left(p->>'phone', 30), 'owner', '{}', true);
  end if;
  return jsonb_build_object('id', cid, 'accountNo', acct);
end $$;

do $$
declare f text;
begin
  foreach f in array array['slick_pa_view_as(text)','slick_stop_view()','slick_my_view()','slick_pa_create_company(jsonb)','slick_view_company()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
