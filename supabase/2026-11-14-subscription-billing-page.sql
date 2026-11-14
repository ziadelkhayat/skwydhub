-- the restaurant's Subscription page also shows Skwyd Hub's support contact and the price list currency
create or replace function public.slick_my_subscription() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me text := slick_company(); cfg jsonb := (select data from platform_settings where id = 'billing');
begin
  if me is null then return null; end if;
  return slick_sub_state(me) || jsonb_build_object(
    'company', (select jsonb_build_object('name', name, 'accountNo', account_no) from companies where id = me),
    'quote', slick_sub_quote(me),
    'yearlyQuote', slick_sub_quote(me, 'yearly'),
    'monthlyQuote', slick_sub_quote(me, 'monthly'),
    'billing', jsonb_build_object('currency', coalesce(cfg->>'currency', 'USD'), 'supportPhone', cfg->>'supportPhone', 'supportEmail', cfg->>'supportEmail'),
    'products', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort), '[]') from sub_products p where p.active),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number, 'periodStart', i.period_start, 'periodEnd', i.period_end,
                   'lines', i.lines, 'subtotal', i.subtotal, 'discount', i.discount, 'total', i.total, 'currency', i.currency, 'status', i.status,
                   'dueAt', i.due_at, 'paidAt', i.paid_at, 'method', i.method)
                   order by i.created_at desc), '[]') from sub_invoices i where i.company_id = me and i.status <> 'void'));
end $$;
grant execute on function public.slick_my_subscription() to authenticated, anon;
