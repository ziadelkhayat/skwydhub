-- business category and subcategory (Restaurant → Quick Service, Café & Bakery → Coffee Shop, …)
alter table public.companies add column if not exists category text, add column if not exists subcategory text;
do $$
declare d text;
begin
  d := pg_get_functiondef('public.slick_pa_create_company(jsonb)'::regprocedure);
  if position('category' in d) = 0 then
    execute replace(d, 'insert into subscriptions (company_id', 'update companies set category = left(nullif(trim(p->>''category''), ''''), 60), subcategory = left(nullif(trim(p->>''subcategory''), ''''), 60) where id = cid;
  insert into subscriptions (company_id');
  end if;
  d := pg_get_functiondef('public.slick_signup_company()'::regprocedure);
  if position('category' in d) = 0 then
    execute replace(d, 'insert into subscriptions (company_id', 'update companies set category = left(nullif(trim(m->>''category''), ''''), 60), subcategory = left(nullif(trim(m->>''subcategory''), ''''), 60) where id = cid;
  insert into subscriptions (company_id');
  end if;
  d := pg_get_functiondef('public.slick_pa_update_subscription(text,jsonb)'::regprocedure);
  if position('category' in d) = 0 then
    execute replace(d, 'contact_name = coalesce(p->''company''->>''contactName'', contact_name)', 'contact_name = coalesce(p->''company''->>''contactName'', contact_name),
      category = coalesce(p->''company''->>''category'', category), subcategory = coalesce(p->''company''->>''subcategory'', subcategory)');
  end if;
  d := pg_get_functiondef('public.slick_pa_overview()'::regprocedure);
  if position('category' in d) = 0 then
    execute replace(d, 'c.country, c.created_at', 'c.country, c.category, c.subcategory, c.created_at');
  end if;
end $$;
