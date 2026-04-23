-- Refactor patient_health_logs to use patient_id exclusively
ALTER TABLE public.patient_health_logs DROP COLUMN phone;
ALTER TABLE public.patient_health_logs ALTER COLUMN patient_id SET NOT NULL;

-- Index for performance on patient-specific trend queries
CREATE INDEX IF NOT EXISTS idx_patient_health_logs_patient_id ON public.patient_health_logs(patient_id);
