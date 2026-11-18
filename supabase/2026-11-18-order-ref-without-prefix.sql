-- Order references are plain numbers (100048), no "REF-" prefix: new orders and existing ones.
-- Applied 2026-11-18 as migration order_ref_without_prefix; existing rows updated once with triggers skipped
-- (skwyd_order_numbers keeps references unchangeable).
do $$
declare f record; d text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname in ('slick_branch_numbers','skwyd_branch_numbers') loop
    d := pg_get_functiondef(f.oid);
    d := replace(d, 'new.ref := ''REF-'' || n::text;', 'new.ref := n::text;');
    execute d;
  end loop;
end $$;
begin; set local session_replication_role = replica; update orders set ref = substr(ref, 5) where ref like 'REF-%'; commit;
