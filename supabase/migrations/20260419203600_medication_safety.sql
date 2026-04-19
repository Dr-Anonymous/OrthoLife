ALTER TABLE public.saved_medications
  ADD COLUMN IF NOT EXISTS contraindications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interactions      jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_saved_meds_contraindications ON public.saved_medications USING GIN (contraindications);
CREATE INDEX IF NOT EXISTS idx_saved_meds_interactions ON public.saved_medications USING GIN (interactions);
