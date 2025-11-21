-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions for cron to use pg_net
GRANT USAGE ON SCHEMA net TO postgres;

-- WARNING: The following statement is commented out because it might fail if the function signature is not exact.
-- Unschedule existing jobs to make this migration re-runnable
-- cron.unschedule will return false if the job does not exist, which is safe.
SELECT cron.unschedule('daily-db-backup');
SELECT cron.unschedule('weekly-db-backup');

-- Schedule daily backups
-- The project URL and service role key are retrieved from the vault at execution time.
SELECT cron.schedule(
  'daily-db-backup',
  '0 2 * * *', -- Every day at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url:=(SELECT decrypted_secret FROM supabase_vault.decrypted_secrets WHERE name = 'project_functions_url') || '/functions/v1/backup-database',
    headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM supabase_vault.decrypted_secrets WHERE name = 'supabase_service_role')
    ),
    body:=jsonb_build_object('type', 'daily')
  )
  $$
);

-- Schedule weekly backups
SELECT cron.schedule(
  'weekly-db-backup',
  '0 3 * * 0', -- Every Sunday at 3:00 AM UTC
  $$
  SELECT net.http_post(
    url:=(SELECT decrypted_secret FROM supabase_vault.decrypted_secrets WHERE name = 'project_functions_url') || '/functions/v1/backup-database',
    headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM supabase_vault.decrypted_secrets WHERE name = 'supabase_service_role')
    ),
    body:=jsonb_build_object('type', 'weekly')
  )
  $$
);
