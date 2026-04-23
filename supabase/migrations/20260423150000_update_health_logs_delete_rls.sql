-- Expand delete policy to authenticated users
DROP POLICY IF EXISTS "Allow anonymous delete" ON public.patient_health_logs;
CREATE POLICY "Allow public and authenticated delete" ON public.patient_health_logs 
FOR DELETE TO anon, authenticated
USING (true);
