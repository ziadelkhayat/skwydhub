-- a POS tablet can void an order when a manager approved it on the tablet (approved_by set), e.g. a call center void request approved at the store
CREATE OR REPLACE FUNCTION public.skwyd_order_void()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
begin
  if new.status = 'void' and old.status is distinct from 'void' then
    if coalesce(staff_role(), '') not in ('owner','admin')
       and not (coalesce(new.approved_by, '') <> '' and (public.slick_device_id() is not null
            or exists (select 1 from public.devices d where d.auth_uid = auth.uid() and d.activated_at is not null and coalesce(d.deleted, false) = false))) then
      raise exception 'Only an owner or admin can void orders';
    end if;
    new.voided_at := now();
  end if;
  return new;
end $function$;
