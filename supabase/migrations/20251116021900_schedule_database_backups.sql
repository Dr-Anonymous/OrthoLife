-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions for cron to use pg_net
GRANT USAGE ON SCHEMA net TO postgres;

-- WARNING: The following statement is commented out because it might fail if the function signature is not exact.
-- The permissions are often granted by default depending on the Supabase setup.
-- If the cron job fails with a permission error for net.http_post, uncomment and run this manually.
-- GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;


-- Schedule daily backups
-- The SERVICE_ROLE_KEY will be substituted by the environment variable during `supabase db push`.
SELECT cron.schedule(
  'daily-db-backup',
  '0 2 * * *', -- Every day at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url:='http://localhost:54323/functions/v1/backup-database',
    headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || :'SERVICE_ROLE_KEY'
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
    url:='http://localhost:54323/functions/v1/backup-database',
    headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || :'SERVICE_ROLE_KEY'
    ),
    body:=jsonb_build_object('type', 'weekly')
  )
  $$
);
