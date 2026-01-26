create table if not exists public.patient_relationships (
  id uuid default gen_random_uuid() primary key,
  patient_id text references public.patients(id) on delete cascade not null,
  related_patient_id text references public.patients(id) on delete cascade not null,
  relationship_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(patient_id, related_patient_id)
);

-- Enable RLS
alter table public.patient_relationships enable row level security;

-- Policies
create policy "Enable read access for all users" on public.patient_relationships for select using (true);
create policy "Enable insert access for all users" on public.patient_relationships for insert with check (true);
create policy "Enable delete access for all users" on public.patient_relationships for delete using (true);
