-- Invoicing: automatic invoices before each period ends, one-off charges and notes on invoices,
-- an all-invoices list for the admin, and what a printed invoice needs (who bills, who is billed).

alter table public.sub_invoices add column if not exists notes text;
alter table public.sub_invoices add column if not exists auto boolean not null default false;

-- the next invoice of a subscription (used by the admin and by the daily job). Returns the invoice,
-- or the one already made for that period, or null when there's nothing to bill.
create or replace function public.slick_sub_make_invoice(p_company text, p_due_days int default 7, p_extra jsonb default '[]'::jsonb, p_notes text default null, p_auto boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s subscriptions; q jsonb; st timestamptz; en timestamptz; inv sub_invoices; extra jsonb := '[]'::jsonb; x jsonb; amt numeric; add numeric := 0;
begin
  select * into s from subscriptions where company_id = p_company;
  if s.company_id is null then raise exception 'This business has no subscription.'; end if;
  if s.complimentary then raise exception 'This business is free: it is never billed.'; end if;
  -- the period starts where the trial or the paid period ends (or today, after a long gap)
  st := case when s.status = 'trial' then coalesce(s.trial_ends_at, now()) else s.paid_until end;
  if st is null or st < now() - interval '60 days' then st := now(); end if;
  -- already billed for that period
  select * into inv from sub_invoices where company_id = p_company and status <> 'void' and period_start = st limit 1;
  if inv.id is not null then return to_jsonb(inv); end if;
  en := st + case when s.cycle = 'yearly' then interval '1 year' else interval '1 month' end;
  q := slick_sub_quote(p_company);
  for x in select * from jsonb_array_elements(coalesce(p_extra, '[]'::jsonb)) loop   -- one-off charges: {name, amount}
    amt := round(coalesce((x->>'amount')::numeric, 0), 2);
    if nullif(trim(x->>'name'), '') is null or amt = 0 then continue; end if;
    extra := extra || jsonb_build_object('id', 'extra', 'name', left(trim(x->>'name'), 120), 'unit', 'once', 'qty', 1, 'price', amt, 'amount', amt);
    add := add + amt;
  end loop;
  if (q->>'total')::numeric + add <= 0 and p_auto then return null; end if;   -- nothing to charge yet (prices not set)
  insert into sub_invoices (company_id, period_start, period_end, cycle, lines, subtotal, discount, total, currency, due_at, notes, auto)
    values (p_company, st, en, s.cycle, (q->'lines') || extra, (q->>'subtotal')::numeric + add, (q->>'discount')::numeric,
            (q->>'total')::numeric + add, q->>'currency', greatest(st, now() + make_interval(days => greatest(coalesce(p_due_days, 0), 0))),
            nullif(trim(p_notes), ''), p_auto)
    returning * into inv;
  return to_jsonb(inv);
end $$;
revoke execute on function public.slick_sub_make_invoice(text,int,jsonb,text,boolean) from public, anon, authenticated;

-- admin: create the next invoice, with optional one-off charges and a note
drop function if exists public.slick_pa_create_invoice(text, int);
create or replace function public.slick_pa_create_invoice(p_company text, p_due_days int default 7, p_extra jsonb default '[]'::jsonb, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform slick_pa_check();
  return slick_sub_make_invoice(p_company, p_due_days, p_extra, p_notes, false);
end $$;

-- every day: invoice each subscription that ends within the next few days (Settings → Invoice Days Before)
create or replace function public.slick_sub_auto_invoice() returns int
language plpgsql security definer set search_path = public as $$
declare cfg jsonb := (select data from platform_settings where id = 'billing'); days int; s record; n int := 0; r jsonb;
begin
  if coalesce((cfg->>'autoInvoice')::boolean, true) = false then return 0; end if;
  days := coalesce((cfg->>'invoiceDaysBefore')::int, 7);
  for s in select * from subscriptions where not complimentary and status <> 'cancelled'
             and (case when status = 'trial' then trial_ends_at else paid_until end) between now() - interval '60 days' and now() + make_interval(days => days) loop
    begin
      if exists (select 1 from sub_invoices where company_id = s.company_id and status = 'open') then continue; end if;   -- one open invoice at a time
      r := slick_sub_make_invoice(s.company_id, 0, '[]'::jsonb, null, true);
      if r is not null and (r->>'auto')::boolean and (r->>'created_at')::timestamptz > now() - interval '1 minute' then n := n + 1; end if;
    exception when others then null;   -- one business's problem doesn't stop the others
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.slick_sub_auto_invoice() from public, anon, authenticated;

-- admin: every invoice, newest first
create or replace function public.slick_pa_all_invoices() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform slick_pa_check();
  return (select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object('company', c.name, 'accountNo', c.account_no) order by i.created_at desc), '[]')
          from sub_invoices i join companies c on c.id = i.company_id);
end $$;
grant execute on function public.slick_pa_all_invoices() to authenticated;
grant execute on function public.slick_pa_create_invoice(text,int,jsonb,text) to authenticated;
revoke execute on function public.slick_pa_create_invoice(text,int,jsonb,text) from anon;

-- the restaurant's Subscription page: who bills them (for the printed invoice) and their own details
do $$
declare d text;
begin
  d := pg_get_functiondef('public.slick_my_subscription()'::regprocedure);
  if position('billingName' in d) = 0 then
    d := replace(d, '''supportEmail'', cfg->>''supportEmail'')', '''supportEmail'', cfg->>''supportEmail'', ''billingName'', cfg->>''billingName'',
      ''billingAddress'', cfg->>''billingAddress'', ''billingTaxNo'', cfg->>''billingTaxNo'', ''paymentInstructions'', cfg->>''paymentInstructions'', ''invoiceFooter'', cfg->>''invoiceFooter'')');
    d := replace(d, '''accountNo'', account_no, ''createdAt'', created_at,', '''accountNo'', account_no, ''createdAt'', created_at, ''phone'', phone, ''country'', country,');
    d := replace(d, '''dueAt'', i.due_at,', '''dueAt'', i.due_at, ''notes'', i.notes, ''createdAt'', i.created_at,');
    execute d;
  end if;
end $$;

-- the daily job
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'skwyd-hub-invoices';
select cron.schedule('skwyd-hub-invoices', '0 5 * * *', 'select public.slick_sub_auto_invoice()');   -- 07:00 Beirut
