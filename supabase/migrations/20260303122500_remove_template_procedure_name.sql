-- Remove redundant procedure_name column from surgical_consent_templates
alter table public.surgical_consent_templates drop column if exists procedure_name;
