-- Consolidated Scheduling System Migration
-- Includes: Base Table, Enhancements, RLS (Firebase/Anon), RPC, and pg_cron Trigger

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the Table
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_type TEXT NOT NULL CHECK (task_type IN ('social_post', 'whatsapp_message')),
    payload JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error TEXT,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    result JSONB DEFAULT '{}'::jsonb,
    consultant_id UUID,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
-- Partial index to prevent duplicate auto-schedules (same source + reference_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_tasks_source_ref 
ON public.scheduled_tasks (source, (payload->>'reference_id')) 
WHERE status = 'pending' AND source IS NOT NULL;

-- 4. RLS Policies (Firebase/Anonymous Compatibility)
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read scheduled tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow public insert scheduled tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow public update scheduled tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow public delete scheduled tasks" ON public.scheduled_tasks;

CREATE POLICY "Allow public read scheduled tasks"
ON public.scheduled_tasks FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert scheduled tasks"
ON public.scheduled_tasks FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update scheduled tasks"
ON public.scheduled_tasks FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete scheduled tasks"
ON public.scheduled_tasks FOR DELETE TO anon, authenticated
USING (true);

-- 5. Functions & Triggers
-- Atomic claiming function for worker
CREATE OR REPLACE FUNCTION claim_scheduled_tasks(batch_size int DEFAULT 10)
RETURNS SETOF public.scheduled_tasks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_tasks
  SET status = 'processing',
      attempts = attempts + 1,
      updated_at = now()
  WHERE id IN (
    SELECT id FROM public.scheduled_tasks
    WHERE status = 'pending' AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_tasks_updated_at_trigger
BEFORE UPDATE ON public.scheduled_tasks
FOR EACH ROW
EXECUTE FUNCTION update_scheduled_tasks_updated_at();

-- 6. Cron Schedule
-- To secure this, you should ideally use a secret.
-- 1. Set SCHEDULER_SECRET in your Supabase Edge Function secrets.
-- 2. Replace 'YOUR_HARDCODED_SECRET' below with that same secret.
DO $$ 
BEGIN
  PERFORM cron.unschedule('dispatch-scheduled');
EXCEPTION WHEN OTHERS THEN 
  NULL;
END $$;

SELECT cron.schedule('dispatch-scheduled', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://vqskeanwpnvuyxorymib.supabase.co/functions/v1/process-scheduled-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);
