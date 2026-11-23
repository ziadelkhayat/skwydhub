-- the check number comes as soon as an order is active (accepted, sent to the kitchen or saved), not only when it is done
CREATE OR REPLACE FUNCTION public.skwyd_order_numbers()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    new.ref := skwyd_ref_prefix(new.channel) || '-' || lpad(nextval('order_ref_seq')::text, 6, '0');
  else
    new.ref := old.ref;
  end if;
  if new.status = 'refund' then
    if new.return_no is null then new.return_no := nextval('return_no_seq'); end if;
    if new.invoice_no is null and (tg_op = 'INSERT' or old.invoice_no is null) then new.invoice_no := nextval('invoice_no_seq'); end if;
  elsif new.status in ('active','closed','returned') then
    if new.invoice_no is null then new.invoice_no := nextval('invoice_no_seq'); end if;
  elsif tg_op = 'INSERT' or old.invoice_no is null then
    new.invoice_no := null;
  end if;
  return new;
end $function$;
-- open orders that had none: update orders set status = status where status = 'active' and invoice_no is null;
