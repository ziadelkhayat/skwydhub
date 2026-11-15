-- Employee Management: HR profile fields on staff_users
alter table public.staff_users
  add column if not exists job_title text,
  add column if not exists hire_date date,
  add column if not exists birth_date date,
  add column if not exists employment_type text,
  add column if not exists pay_type text,
  add column if not exists pay_rate numeric,
  add column if not exists emergency_name text,
  add column if not exists emergency_phone text,
  add column if not exists notes text;
