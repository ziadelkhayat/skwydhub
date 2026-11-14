-- the owner's email and phone, and the business category, set from Skwyd Hub fill the back office's
-- Account → Business page, where they can't be changed (only from the Skwyd Hub admin)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.slick_pa_create_company(jsonb)'::regprocedure);
  if position('ownerPhone' in d) = 0 then
    execute replace(d, '''taxInclusive'', true)', '''taxInclusive'', true, ''email'', em, ''ownerPhone'', left(p->>''phone'', 30), ''bizCategory'', nullif(trim(p->>''category''), ''''), ''bizSubcategory'', nullif(trim(p->>''subcategory''), ''''))');
  end if;
  d := pg_get_functiondef('public.slick_signup_company()'::regprocedure);
  if position('ownerPhone' in d) = 0 then
    execute replace(d, '''taxInclusive'', true)', '''taxInclusive'', true, ''email'', new.email, ''ownerPhone'', left(m->>''phone'', 30), ''bizCategory'', nullif(trim(m->>''category''), ''''), ''bizSubcategory'', nullif(trim(m->>''subcategory''), ''''))');
  end if;
  d := pg_get_functiondef('public.slick_pa_update_subscription(text,jsonb)'::regprocedure);
  if position('ownerPhone' in d) = 0 then
    execute replace(d, 'return slick_sub_state(p_company);
end', 'if p ? ''company'' then   -- keep the back office''s Business page in step
    update settings set data = data || jsonb_strip_nulls(jsonb_build_object(''name'', nullif(trim(p->''company''->>''name''), ''''),
      ''email'', nullif(trim(p->''company''->>''email''), ''''), ''ownerPhone'', nullif(trim(p->''company''->>''phone''), ''''),
      ''bizCategory'', nullif(p->''company''->>''category'', ''''), ''bizSubcategory'', nullif(p->''company''->>''subcategory'', '''')))
    where company_id = p_company and id = ''company'';
  end if;
  return slick_sub_state(p_company);
end');
  end if;
end $$;

-- the restaurant itself can't change what Skwyd Hub set (name, account number, owner email and phone, category)
create or replace function public.slick_company_locks() returns trigger
language plpgsql set search_path = public as $$
declare k text;
begin
  if new.id <> 'company' or current_user not in ('authenticated', 'anon') then return new; end if;
  foreach k in array array['name','accountNo','email','ownerPhone','bizCategory','bizSubcategory'] loop
    if coalesce(old.data->>k, '') <> '' then new.data := jsonb_set(new.data, array[k], old.data->k); end if;
  end loop;
  return new;
end $$;
drop trigger if exists b_slick_company_locks on public.settings;
create trigger b_slick_company_locks before update on public.settings for each row execute function public.slick_company_locks();
