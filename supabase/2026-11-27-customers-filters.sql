-- Customers: the Filters panel (name, phone, email, tag, has orders, blacklisted, loyalty, house account, updated after) as p_f
drop function if exists public.skwyd_customers(text, text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.skwyd_customers(p_q text DEFAULT ''::text, p_filter text DEFAULT 'all'::text, p_sort text DEFAULT 'last'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_f jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
with st as (
  select customer_id, count(*) n, sum(total) spent, max(created_at) last_at, min(created_at) first_at
  from orders where customer_id is not null and status in ('pending','active','closed') group by customer_id
), ha as (
  select customer_id, sum(case when kind = 'payment' then amount else -amount end) bal
  from house_account_txns where customer_id is not null group by customer_id
), c as (
  select c.*, coalesce(st.n,0) n, coalesce(st.spent,0) spent, st.last_at, st.first_at, coalesce(ha.bal,0) bal
  from customers c left join st on st.customer_id = c.id left join ha on ha.customer_id = c.id
), f as (
  select * from c
  where (coalesce(p_q,'') = '' or c.name ilike '%'||p_q||'%' or c.phone ilike '%'||regexp_replace(p_q,'[^0-9+]','','g')||'%' and regexp_replace(p_q,'[^0-9+]','','g') <> '' or c.email ilike '%'||p_q||'%')
    and case p_filter
      when 'deleted' then deleted_at is not null
      when 'blacklisted' then blacklisted and deleted_at is null
      when 'orders' then n >= 1 and deleted_at is null
      when 'negative' then bal < 0 and deleted_at is null
      when 'repeat' then n >= 2 and deleted_at is null
      when 'new' then first_at >= now() - interval '30 days' and deleted_at is null
      when 'inactive' then last_at < now() - interval '60 days' and deleted_at is null
      else deleted_at is null end
    and (coalesce(p_f->>'name','') = '' or c.name ilike '%'||(p_f->>'name')||'%')
    and (coalesce(p_f->>'phone','') = '' or c.phone ilike '%'||regexp_replace(p_f->>'phone','[^0-9+]','','g')||'%')
    and (coalesce(p_f->>'email','') = '' or c.email ilike '%'||(p_f->>'email')||'%')
    and (coalesce(p_f->>'tag','') = '' or (p_f->>'tag') = any(coalesce(c.tags, '{}')))
    and (coalesce(p_f->>'orders','') = '' or (n >= 1) = ((p_f->>'orders') = 'yes'))
    and (coalesce(p_f->>'black','') = '' or coalesce(blacklisted,false) = ((p_f->>'black') = 'yes'))
    and (coalesce(p_f->>'loyalty','') = '' or coalesce(loyalty,false) = ((p_f->>'loyalty') = 'yes'))
    and (coalesce(p_f->>'house','') = '' or coalesce(house_account,false) = ((p_f->>'house') = 'yes'))
    and (coalesce(p_f->>'updated','') = '' or coalesce(c.updated_at, c.created_at) >= (p_f->>'updated')::date)
)
select jsonb_build_object(
  'count', (select count(*) from f),
  'summary', (select jsonb_build_object('total', count(*), 'new30', count(*) filter (where first_at >= now() - interval '30 days'),
                 'repeat', count(*) filter (where n >= 2), 'withOrders', count(*) filter (where n >= 1),
                 'avgSpend', coalesce(avg(spent) filter (where n >= 1), 0), 'blacklisted', count(*) filter (where blacklisted)) from c where deleted_at is null),
  'rows', (select coalesce(jsonb_agg(x), '[]') from (
      select id, phone, name, email, tags, blacklisted, n, spent, last_at, first_at, deleted_at, bal from f
      order by case when p_sort = 'spent' then spent end desc nulls last,
               case when p_sort = 'orders' then n end desc nulls last,
               case when p_sort = 'name' then lower(coalesce(name, phone)) end asc,
               case when p_sort = 'new' then created_at end desc,
               last_at desc nulls last, created_at desc
      limit p_limit offset p_offset) x)
);
$function$;
revoke all on function public.skwyd_customers(text, text, text, integer, integer, jsonb) from public, anon;
grant execute on function public.skwyd_customers(text, text, text, integer, integer, jsonb) to authenticated, service_role;
