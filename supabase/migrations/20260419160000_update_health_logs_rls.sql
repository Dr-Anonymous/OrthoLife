-- Refining RLS for patient_health_logs to allow deletion
ALTER TABLE public.patient_health_logs ENABLE ROW LEVEL SECURITY;

-- Allow deletion for anonymous users (compatible with Firebase Auth setup)
CREATE POLICY "Allow anonymous delete" ON public.patient_health_logs FOR DELETE TO anon USING (true);
