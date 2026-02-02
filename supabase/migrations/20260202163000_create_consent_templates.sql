-- Create table for storing reusable surgical consent templates
create table public.surgical_consent_templates (
    id uuid not null default gen_random_uuid(),
    name text not null, -- Display name of the template e.g. "ACL Reconstruction (Telugu)"
    language text not null check (language in ('en', 'te')),
    procedure_name text, -- Optional default procedure name
    risks_general text, -- HTML content
    risks_anesthesia text, -- HTML content
    risks_procedure text, -- HTML content
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint surgical_consent_templates_pkey primary key (id)
);

-- Enable RLS
alter table public.surgical_consent_templates enable row level security;

-- Policies
-- Allow public access (since Supabase Auth is not used)
create policy "Allow public access to templates"
on public.surgical_consent_templates
for all
to public
using (true)
with check (true);
