-- This migration sets up triggers to automatically update the discovered-routes.json
-- file in the GitHub repository whenever the blog posts or guides are changed.
--
-- IMPORTANT: Before applying this migration, you must add your Supabase
-- service role key to the Vault. You can do this in the Supabase dashboard
-- under "SQL Editor" with the following command:
--
-- insert into vault.secrets (name, secret) values ('supabase_service_role', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');
--
-- Replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY' with your actual service role key.

-- Create a function to be called by the trigger
create or replace function public.update_routes_on_change()
returns trigger as $$
declare
  SUPABASE_PROJECT_URL text := 'https://vqskeanwpnvuyxorymib.supabase.co';
  SERVICE_ROLE_KEY text;
begin
  -- Retrieve the service role key from the vault
  select decrypted_secret into SERVICE_ROLE_KEY from vault.decrypted_secrets where name = 'supabase_service_role';

  if SERVICE_ROLE_KEY is null then
    raise exception 'Service role key not found in vault. Please add it with the name "supabase_service_role"';
  end if;

  -- Don't wait for the function to complete
  PERFORM net.http_post(
    url:= SUPABASE_PROJECT_URL || '/functions/v1/update-routes',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || SERVICE_ROLE_KEY || '"}'::jsonb,
    body:='{}'::jsonb
  );
  return new;
end;
$$ language plpgsql;

-- Create triggers for the 'posts' table
create trigger on_post_change
after insert or update or delete on public.posts
for each row execute procedure public.update_routes_on_change();

-- Create triggers for the 'guides' table
create trigger on_guide_change
after insert or update or delete on public.guides
for each row execute procedure public.update_routes_on_change();

-- Create triggers for the 'post_translations' table
create trigger on_post_translation_change
after insert or update or delete on public.post_translations
for each row execute procedure public.update_routes_on_change();

-- Create triggers for the 'guide_translations' table
create trigger on_guide_translation_change
after insert or update or delete on public.guide_translations
for each row execute procedure public.update_routes_on_change();
