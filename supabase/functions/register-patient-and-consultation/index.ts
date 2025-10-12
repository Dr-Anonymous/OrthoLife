import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, dob, sex, phone } = await req.json()

    // 1. Find or create patient
    let { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, created_at')
      .eq('phone', phone)
      .single()

    if (patientError && patientError.code !== 'PGRST116') { // PGRST116: no rows found
      throw patientError
    }

    let isNewPatient = false;
    if (!patient) {
      const { data: newPatient, error: newPatientError } = await supabase
        .from('patients')
        .insert({ name, dob, sex, phone })
        .select('id, created_at')
        .single()

      if (newPatientError) throw newPatientError
      patient = newPatient
      isNewPatient = true
    }

    // 2. Check for recent consultations
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentConsultations, error: consultationError } = await supabase
      .from('consultations')
      .select('id')
      .eq('patient_id', patient.id)
      .gte('created_at', sevenDaysAgo.toISOString())

    if (consultationError) throw consultationError

    // 3. Determine fee status
    const isFreeReview = !isNewPatient && recentConsultations.length > 0;
    const consultationFee = isNewPatient ? 0 : 500; // Example fee

    // 4. Create consultation
    const { data: consultation, error: newConsultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patient.id,
        status: 'pending',
        fee: isFreeReview ? 0 : consultationFee,
      })
      .select()
      .single()

    if (newConsultationError) throw newConsultationError

    return new Response(JSON.stringify({ consultation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})