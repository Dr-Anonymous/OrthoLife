-- Migration: Localize consultant fields (name, qualifications, specialization, address, experience)
-- Date: 2026-03-25

-- 1. Add experience and address columns, and convert name/qualifications/specialization to jsonb
ALTER TABLE public.consultants 
    ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '{"en": "", "te": ""}'::jsonb,
    ALTER COLUMN name TYPE jsonb USING jsonb_build_object('en', name, 'te', ''),
    ALTER COLUMN qualifications TYPE jsonb USING jsonb_build_object('en', qualifications, 'te', ''),
    ALTER COLUMN specialization TYPE jsonb USING jsonb_build_object('en', specialization, 'te', '');

-- 2. Update default consultant (Dr. Samuel Manoj Cherukuri) with Telugu values, Address, and Experience
UPDATE public.consultants 
SET 
    name = '{"en": "Dr. Samuel Manoj Cherukuri", "te": "డాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి"}',
    qualifications = '{"en": "MBBS, MS Ortho (Manipal)", "te": "MBBS, MS Ortho (మణిపాల్)"}',
    specialization = '{"en": "Consultant Orthopaedic, Joint Replacement & Spine Surgeon", "te": "ఆర్థోపెడిక్, జాయింట్ రీప్లేస్మెంట్ & వెన్నెముక శస్త్రచికిత్స నిపుణులు"}',
    experience = '{"en": "8+ years and 5000+ successful surgeries", "te": "8+ ఏళ్ల అనుభవం మరియు 5000+ కి పైగా విజయవంతమైన శస్త్రచికిత్సలు"}',
    address = '{
        "en": "OrthoLife, Road No. 3, R R Nagar, Near RTO office, Kakinada -03",
        "te": "ఆర్థోలైఫ్, రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్, RTO కార్యాలయం దగ్గర, కాకినాడ -03"
    }'
WHERE phone = '9866812555';
