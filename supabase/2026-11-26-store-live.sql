-- Summary > Stores and Call Center tabs: live numbers per store (runs with the caller's rights, so row security applies).
-- active orders and their amount, occupied tables, call center active orders, cashier devices and the offline ones,
-- open tills (shifts not closed), last sync (latest cashier device contact) and the last order.
create or replace function public.skwyd_store_live(p_branches text[] default null, p_brand text default null)
returns jsonb language sql stable set search_path to 'public' as $$
with b as (select id from branches where (p_branches is null or id = any(p_branches)) and (p_brand is null or brand_id = p_brand)),
a as (select branch_id, count(*) n, coalesce(sum(total), 0) v,
             count(distinct table_no) filter (where coalesce(table_no, '') <> '') t,
             count(*) filter (where channel = 'callcenter') cc
      from orders where status in ('pending', 'active') and branch_id in (select id from b) group by 1),
d as (select branch_id, count(*) n, count(*) filter (where last_seen is null or last_seen < now() - interval '10 minutes') off, max(last_seen) seen
      from devices where coalesce(deleted, false) = false and type in ('cashier', 'sub_cashier') and branch_id in (select id from b) group by 1),
s as (select branch_id, count(*) n from shifts where closed_at is null and branch_id in (select id from b) group by 1),
l as (select branch_id, max(created_at) at from orders where branch_id in (select id from b) group by 1)
select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'active', coalesce(a.n, 0), 'amount', coalesce(a.v, 0), 'tables', coalesce(a.t, 0), 'cc', coalesce(a.cc, 0),
  'cashiers', coalesce(d.n, 0), 'offline', coalesce(d.off, 0), 'tills', coalesce(s.n, 0), 'sync', d.seen, 'last', l.at)), '[]'::jsonb)
from b left join a on a.branch_id = b.id left join d on d.branch_id = b.id left join s on s.branch_id = b.id left join l on l.branch_id = b.id;
$$;
grant execute on function public.skwyd_store_live(text[], text) to authenticated;
