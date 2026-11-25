-- A sale counts on the business day it was closed (closed_at), so orders still active at the end of the day go into the next day's numbers.
-- Other orders (active, declined, void) and refunds keep their created time.
do $$ declare d text; begin
select pg_get_functiondef(p.oid) into d from pg_proc p where proname = 'skwyd_dashboard';
d := replace(d, '(o.created_at at time zone p_tz) as lt',
  '((case when o.status = ''closed'' then coalesce(o.closed_at, o.created_at) else o.created_at end) at time zone p_tz) as lt');
d := replace(d, 'where o.created_at >= rng.t0 and o.created_at < rng.t1',
  'where (case when o.status = ''closed'' then coalesce(o.closed_at, o.created_at) else o.created_at end) >= rng.t0 and (case when o.status = ''closed'' then coalesce(o.closed_at, o.created_at) else o.created_at end) < rng.t1');
execute d; end $$;
