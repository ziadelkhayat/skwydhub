-- Employee Management → Requests: time off and shift swaps (asked on the POS, approved in the portal)
alter table public.staff_users add column if not exists leave_days numeric;   -- annual leave days a year
create table if not exists public.staff_requests (
  id text primary key default ('req_' || replace(gen_random_uuid()::text, '-', '')),
  employee_id text not null, kind text not null default 'time_off', leave_type text, from_day date, to_day date,
  shift_id text, swap_with text, note text, status text not null default 'pending',
  decided_by text, decided_at timestamptz, decision_note text, branch_id text, deleted boolean default false,
  company_id text, uid uuid default gen_random_uuid() unique, created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists staff_requests_co on public.staff_requests (company_id, status);
alter table public.staff_requests enable row level security;
create policy "own company only" on public.staff_requests as restrictive for all
  using ((select skwyd_company()) is null or company_id = (select skwyd_company())) with check ((select skwyd_company()) is null or company_id = (select skwyd_company()));
create policy "admin write staff_requests" on public.staff_requests for all using (staff_role() = any (array['owner','admin'])) with check (staff_role() = any (array['owner','admin']));
create policy "staff read staff_requests" on public.staff_requests for select using (staff_role() is not null);
create policy "staff ask staff_requests" on public.staff_requests for insert with check (staff_role() is not null and status = 'pending');
create trigger a_skwyd_company before insert or update of company_id on public.staff_requests for each row execute function skwyd_fill_company();
create trigger touch_staff_requests before update on public.staff_requests for each row execute function touch();
alter publication supabase_realtime add table public.staff_requests;
