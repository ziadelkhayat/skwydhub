-- skwyd_dashboard: hours and days also carry payments (pay), discounts of sales (disc) and returns (ret), for the Summary report cards.
do $$ declare d text; begin
select pg_get_functiondef(p.oid) into d from pg_proc p where proname='skwyd_dashboard';
d := replace(d, 'sum(sale) n, sum(net) net, sum(total) pay, sum(discount) disc from ok group by 1) x),
  ''days''', 'sum(sale) n, sum(net) net, sum(total) pay, sum(discount*sale) disc, coalesce(-sum(total) filter (where status = ''refund''),0) ret from ok group by 1) x),
  ''days''');
d := replace(d, 'sum(sale) n, sum(net) net from ok group by 1) x),
  ''branches''', 'sum(sale) n, sum(net) net, sum(total) pay, sum(discount*sale) disc, coalesce(-sum(total) filter (where status = ''refund''),0) ret from ok group by 1) x),
  ''branches''');
execute d; end $$;
