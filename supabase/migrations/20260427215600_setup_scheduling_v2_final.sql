-- Unified Scheduling V2 Migration
-- 1. Add granular messaging settings to consultants
ALTER TABLE public.consultants 
ADD COLUMN IF NOT EXISTS messaging_settings JSONB DEFAULT '{
  "auto_pharmacy": false,
  "auto_diagnostics": false,
  "auto_discharge_review": false,
  "auto_followup": false,
  "auto_npo_reminder": false,
  "location_followup_overrides": {},
  "location_print_overrides": {}
}'::jsonb;

COMMENT ON COLUMN public.consultants.messaging_settings IS 'Granular toggles for automated messages and location-specific overrides.';

-- 2. Update scheduled_tasks table to allow subscription_reorder task type
ALTER TABLE public.scheduled_tasks DROP CONSTRAINT IF EXISTS scheduled_tasks_task_type_check;
ALTER TABLE public.scheduled_tasks ADD CONSTRAINT scheduled_tasks_task_type_check CHECK (task_type IN ('social_post', 'whatsapp_message', 'subscription_reorder'));
