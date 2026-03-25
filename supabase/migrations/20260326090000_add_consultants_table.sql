-- Migration: Add consultants table and associate consultations/config
-- Date: 2026-03-26

-- 1. Create consultants table
CREATE TABLE IF NOT EXISTS public.consultants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text UNIQUE NOT NULL, -- Login phone number (Firebase)
    name text NOT NULL,
    qualifications text,
    specialization text,
    email text,
    photo_url text,
    sign_url text,
    seal_url text,
    bio jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    services jsonb DEFAULT '[]'::jsonb,
    is_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Consultants are viewable by everyone" ON public.consultants
    FOR SELECT USING (true);

CREATE POLICY "Consultants can update their own profile" ON public.consultants
    FOR UPDATE USING (auth.uid()::text = phone); -- Note: Using phone as ID for now since auth.uid() in Supabase might not match Firebase UID easily without custom hook, but for now we follow the "phone match" logic in the plan.

-- 2. Add consultant_id to consultations
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);

-- 3. Add consultant_id to other config tables
ALTER TABLE public.autofill_keywords ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);
ALTER TABLE public.text_shortcuts ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);
ALTER TABLE public.referral_doctors ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.consultants(id);

-- 4. Seed default consultant (Dr. Samuel Manoj Cherukuri)
INSERT INTO public.consultants (
    phone, name, qualifications, specialization, email, 
    photo_url, sign_url, seal_url, is_admin, 
    bio, services
) VALUES (
    '9866812555', 
    'Dr. Samuel Manoj Cherukuri', 
    'MBBS, MS Ortho (Manipal)', 
    'Consultant Orthopaedic, Joint Replacement & Spine Surgeon', 
    'info@ortho.life',
    '/images/doctors/manojBW.jpg',
    '/images/assets/sign.png',
    '/images/assets/seal.png',
    true,
    '{
        "en": "Dr. Manoj brings specialized training from Manipal Hospital to provide advanced musculoskeletal care. His practice blends surgical precision with modern biological treatments, focusing on restoring mobility and quality of life.",
        "te": "డాక్టర్ మనోజ్ గారు మణిపాల్ హాస్పిటల్ నుండి ప్రత్యేక శిక్షణ పొంది, ఎముకలు మరియు కీళ్ల సమస్యలకు అత్యాధునిక చికిత్సను అందిస్తున్నారు. శస్త్రచికిత్స నైపుణ్యంతో పాటు ఆధునిక వైద్య పద్ధతుల కలయికతో మెరుగైన ఫలితాలను అందిస్తారు."
    }',
    '[
        {
            "title": {"en": "Trauma & Fracture Care", "te": "ట్రామా & ఫ్రాక్చర్ కేర్"},
            "description": {"en": "Advanced fixation techniques for complex injuries and fractures.", "te": "క్లిష్టమైన ఎముకల విరుగుడుకు అధునాతన చికిత్స మరియు శస్త్రచికిత్సలు."},
            "icon": "Bone"
        },
        {
            "title": {"en": "Arthroscopy (Keyhole Surgery)", "te": "ఆర్థ్రోస్కోపీ (కీహోల్ సర్జరీ)"},
            "description": {"en": "Minimally invasive ligament and sports injury repair for faster recovery.", "te": "లిగమెంట్ మరియు క్రీడా గాయాలకు అతి తక్కువ కోతతో చేసే అధునాతన శస్త్రచికిత్స."},
            "icon": "Activity"
        },
        {
            "title": {"en": "Joint Replacement", "te": "జాయింట్ రీప్లేస్మెంట్"},
            "description": {"en": "Total Knee and Hip replacements ensuring lasting mobility.", "te": "మోకాలి మరియు తుంటి కీళ్ల మార్పిడి శస్త్రచికిత్సలు (Total Knee & Hip Replacement)."},
            "icon": "User"
        },
        {
            "title": {"en": "Spine Care", "te": "వెన్నెముక (Spine) సంరక్షణ"},
            "description": {"en": "Comprehensive surgical and non-surgical management of back and neck pain.", "te": "నడుము మరియు మెడ నొప్పికి శస్త్రచికిత్స మరియు శస్త్రచికిత్స లేని పరిష్కారాలు."},
            "icon": "Stethoscope"
        },
        {
            "title": {"en": "Regenerative Medicine", "te": "రీజెనరేటివ్ మెడిసిన్"},
            "description": {"en": "PRP (Platelet Rich Plasma) and Viscosupplementation for joint preservation.", "te": "కీళ్ల నొప్పుల నివారణకు PRP (Platelet Rich Plasma) మరియు గుజ్జు (Visco) ఇంజెక్షన్లు."},
            "icon": "Syringe"
        }
    ]'
) ON CONFLICT (phone) DO UPDATE SET is_admin = true;

-- 5. Backfill existing records
DO $$
DECLARE
    default_id uuid;
BEGIN
    SELECT id INTO default_id FROM public.consultants WHERE phone = '9866812555';
    
    UPDATE public.consultations SET consultant_id = default_id WHERE consultant_id IS NULL;
    UPDATE public.autofill_keywords SET consultant_id = default_id WHERE consultant_id IS NULL;
    UPDATE public.text_shortcuts SET consultant_id = default_id WHERE consultant_id IS NULL;
    UPDATE public.referral_doctors SET consultant_id = default_id WHERE consultant_id IS NULL;
END $$;
