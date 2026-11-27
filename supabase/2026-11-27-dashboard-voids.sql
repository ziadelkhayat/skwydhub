-- Summary: voided amounts, for the Void rate and Voids on the Summary page.
-- 'voids' = whole orders voided in the period; 'voidItems' = items voided out of orders that went on (their price × quantity).
CREATE OR REPLACE FUNCTION public.skwyd_dashboard(p_day date, p_days integer DEFAULT 1, p_branches text[] DEFAULT NULL::text[], p_brand text DEFAULT NULL::text, p_tz text DEFAULT 'Asia/Beirut'::text, p_cut integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
with rng as (
  select (((p_day - (p_days - 1))::timestamp + make_interval(mins => p_cut)) at time zone p_tz) as t0, (((p_day + 1)::timestamp + make_interval(mins => p_cut)) at time zone p_tz) as t1
), o as (
  select o.*, ((case when o.status = 'closed' then coalesce(o.closed_at, o.created_at) else o.created_at end) at time zone p_tz) as lt,
         coalesce(o.total, 0) - coalesce(o.tax, 0) as net,          -- net sales = payments minus tax
         case when o.status = 'closed' then 1 else 0 end as sale
  from orders o, rng
  where (case when o.status = 'closed' then coalesce(o.closed_at, o.created_at) else o.created_at end) >= rng.t0 and (case when o.status = 'closed' then coalesce(o.closed_at, o.created_at) else o.created_at end) < rng.t1
    and (p_branches is null or o.branch_id = any(p_branches))
    and (p_brand is null or o.brand_id = p_brand)
), ok as (select * from o where status in ('closed','refund'))
select jsonb_build_object(
  'orders',    (select count(*) from ok where sale = 1),
  'net',       (select coalesce(sum(net),0) from ok),
  'discount',  (select coalesce(sum(discount),0) from ok where sale = 1),
  'payments',  (select coalesce(sum(total),0) from ok),
  'tax',       (select coalesce(sum(tax),0) from ok),
  'deliveryFees', (select coalesce(sum(delivery_fee),0) from ok where sale = 1),
  'refunds',   (select jsonb_build_object('n', count(*), 'v', coalesce(-sum(total),0), 'tax', coalesce(-sum(tax),0)) from ok where status = 'refund'),
  'declined',  (select jsonb_build_object('n', count(*), 'v', coalesce(sum(total),0)) from o where status = 'declined'),
  'voids',     (select jsonb_build_object('n', count(*), 'v', coalesce(sum(total),0)) from o where status = 'void'),
  'voidItems', (select coalesce(sum(coalesce((v->>'qty')::numeric,1) * coalesce((v->>'price')::numeric,0) - coalesce((v->>'disc')::numeric,0)),0)
                  from o, jsonb_array_elements(case when jsonb_typeof(o.voided_items) = 'array' then o.voided_items else '[]'::jsonb end) v where o.status <> 'void'),
  'open',      (select count(*) from o where status in ('pending','active')),
  'hours',     (select coalesce(jsonb_agg(x order by x.h), '[]') from (
                  select extract(hour from lt)::int h, sum(sale) n, sum(net) net, sum(total) pay, sum(discount*sale) disc, coalesce(-sum(total) filter (where status = 'refund'),0) ret from ok group by 1) x),
  'days',      (select coalesce(jsonb_agg(x order by x.d), '[]') from (
                  select (lt - make_interval(mins => p_cut))::date d, sum(sale) n, sum(net) net, sum(total) pay, sum(discount*sale) disc, coalesce(-sum(total) filter (where status = 'refund'),0) ret from ok group by 1) x),
  'branches',  (select coalesce(jsonb_agg(x), '[]') from (
                  select branch_id id, sum(sale) n, sum(net) net, sum(discount) disc, sum(total) pay from ok group by 1) x),
  'types',     (select coalesce(jsonb_agg(x), '[]') from (
                  select coalesce(type,'other') k, sum(sale) n, sum(net) net from ok group by 1) x),
  'channels',  (select coalesce(jsonb_agg(x), '[]') from (
                  select coalesce(channel,'other') k, sum(sale) n, sum(net) net from ok group by 1) x),
  'payMethods',(select coalesce(jsonb_agg(x), '[]') from (
                  select coalesce(payment->>'method', case when channel = 'pos' then 'cash' else 'on delivery' end) k, sum(sale) n, sum(total) v from ok group by 1) x),
  'products',  (select coalesce(jsonb_agg(x order by x.v desc), '[]') from (
                  select i->>'name' name, sum(coalesce((i->>'qty')::numeric,1) * case when ok.sale = 1 then 1 else -1 end) qty,
                         sum(coalesce((i->>'qty')::numeric,1) * coalesce((i->>'price')::numeric,0) * case when ok.sale = 1 then 1 else -1 end) v
                  from ok, jsonb_array_elements(case when jsonb_typeof(ok.items) = 'array' then ok.items else '[]'::jsonb end) i
                  where i->>'name' is not null group by 1 order by 3 desc limit 10) x),
  'callcenter',(select jsonb_build_object(
                  'byStatus', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from o where channel = 'callcenter' group by 1) s),
                  'byAgent',  (select coalesce(jsonb_agg(a), '[]') from (select coalesce(agent,'-') k, count(*) n, sum(net) net from ok where channel = 'callcenter' and sale = 1 group by 1 order by 2 desc) a),
                  'byBranch', (select coalesce(jsonb_agg(b), '[]') from (select branch_id id, count(*) n, sum(net) net from ok where channel = 'callcenter' and sale = 1 group by 1) b)))
);
$function$;
