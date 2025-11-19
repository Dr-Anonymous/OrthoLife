-- This migration stores the project's public functions URL in the Vault.
--
-- IMPORTANT:
-- To apply this migration, the PROJECT_FUNCTIONS_URL environment variable must be set
-- when running `supabase db push`. For example:
-- PROJECT_FUNCTIONS_URL='https://<your-project-ref>.supabase.co' supabase db push
--
-- This ensures the URL is not stored in plain text in your git history.

-- Create a new secret in the vault.
-- The `:'PROJECT_FUNCTIONS_URL'` is a placeholder that will be replaced by the
-- environment variable value when the migration is applied via the Supabase CLI.
INSERT INTO supabase_vault.secrets (name, secret)
VALUES ('project_functions_url', :'PROJECT_FUNCTIONS_URL')
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
