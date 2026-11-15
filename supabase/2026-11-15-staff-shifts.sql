-- Employee Management → Schedule: planned work shifts per branch and day
create table if not exists public.staff_shifts (
  id text primary key,
  employee_id text,            -- staff_users.id; null = open (unassigned) shift
  branch_id text,
  day date not null,
  start_time text not null,    -- 'HH:MM'
  end_time text not null,      -- 'HH:MM' (earlier than start = ends next day)
  break_min int default 0,
  job_title text,
  note text,
  published boolean default false,
  deleted boolean default false,
  company_id text,
  uid uuid default gen_random_uuid() unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists staff_shifts_day on public.staff_shifts (company_id, day);
alter table public.staff_shifts enable row level security;
create policy "own company only" on public.staff_shifts as restrictive for all
  using ((select skwyd_company()) is null or company_id = (select skwyd_company()))
  with check ((select skwyd_company()) is null or company_id = (select skwyd_company()));
create policy "admin write staff_shifts" on public.staff_shifts for all
  using (staff_role() = any (array['owner','admin'])) with check (staff_role() = any (array['owner','admin']));
create policy "staff read published shifts" on public.staff_shifts for select using (staff_role() is not null and published and not deleted);
create trigger a_skwyd_company before insert or update of company_id on public.staff_shifts for each row execute function skwyd_fill_company();
create trigger touch_staff_shifts before update on public.staff_shifts for each row execute function touch();
alter publication supabase_realtime add table public.staff_shifts;
