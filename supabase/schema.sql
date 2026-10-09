create table if not exists public.portal_records (
  id uuid primary key,
  kind text not null check (kind in ('branches', 'students', 'classes', 'payments')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.portal_records
  drop constraint if exists portal_records_kind_check;

alter table public.portal_records
  add constraint portal_records_kind_check
  check (kind in ('branches', 'students', 'classes', 'payments'));

create index if not exists portal_records_kind_idx on public.portal_records (kind);

alter table public.portal_records enable row level security;

insert into public.portal_records (id, kind, payload)
select gen_random_uuid(), 'branches', '{"name":"Muruva","startDate":"2025-09-22","status":"open"}'::jsonb
where not exists (
  select 1 from public.portal_records
  where kind = 'branches' and lower(payload->>'name') = 'muruva'
);
