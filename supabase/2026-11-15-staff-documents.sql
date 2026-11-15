-- Employee Management → Documents & Onboarding; social security flag for payroll
alter table public.staff_users add column if not exists onboarding jsonb;
alter table public.staff_users add column if not exists social_security boolean default false;
create table if not exists public.staff_documents (
  id text primary key default ('doc_' || replace(gen_random_uuid()::text, '-', '')),
  employee_id text not null, doc_type text not null, number text, issued_on date, expires_on date,
  file_path text, file_name text, note text, deleted boolean default false,
  company_id text, uid uuid default gen_random_uuid() unique, created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists staff_documents_co on public.staff_documents (company_id, employee_id);
alter table public.staff_documents enable row level security;
create policy "own company only" on public.staff_documents as restrictive for all
  using ((select skwyd_company()) is null or company_id = (select skwyd_company())) with check ((select skwyd_company()) is null or company_id = (select skwyd_company()));
create policy "admin all staff_documents" on public.staff_documents for all using (staff_role() = any (array['owner','admin'])) with check (staff_role() = any (array['owner','admin']));
create trigger a_skwyd_company before insert or update of company_id on public.staff_documents for each row execute function skwyd_fill_company();
create trigger touch_staff_documents before update on public.staff_documents for each row execute function touch();
alter publication supabase_realtime add table public.staff_documents;
-- private files: staff-docs/<company id>/<employee id>/<file>
insert into storage.buckets (id, name, public, file_size_limit) values ('staff-docs', 'staff-docs', false, 10485760) on conflict (id) do nothing;
create policy "staff docs read" on storage.objects for select using (bucket_id = 'staff-docs' and staff_role() = any (array['owner','admin']) and (storage.foldername(name))[1] = coalesce(skwyd_company(), (storage.foldername(name))[1]));
create policy "staff docs upload" on storage.objects for insert with check (bucket_id = 'staff-docs' and staff_role() = any (array['owner','admin']) and (storage.foldername(name))[1] = coalesce(skwyd_company(), (storage.foldername(name))[1]));
create policy "staff docs delete" on storage.objects for delete using (bucket_id = 'staff-docs' and staff_role() = any (array['owner','admin']) and (storage.foldername(name))[1] = coalesce(skwyd_company(), (storage.foldername(name))[1]));
