import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

async function generateIncrementalId(supabaseClient) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}${mm}${dd}`;
  try {
    const { data, error } = await supabaseClient.rpc('increment_patient_counter', {
      input_date_key: dateKey
    });
    if (error) throw error;
    const counter = data || 1;
    return `${dateKey}${counter}`;
  } catch (error) {
    console.error('Error generating incremental ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-3);
    return `${dateKey}${timestamp}`;
  }
}


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

    const isNewPatient = !patient;
    if (isNewPatient) {
      const newPatientId = await generateIncrementalId(supabase);
      const { data: newPatient, error: newPatientError } = await supabase
        .from('patients')
        .insert({ id: newPatientId, name, dob, sex, phone })
        .select('id, created_at')
        .single()

      if (newPatientError) throw newPatientError
      patient = newPatient
    }

    let isFreeReview = false;
    if (!isNewPatient) {
      // This is an existing patient. Check if they are eligible for a free review.
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: recentConsultations, error: consultationError } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patient.id)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (consultationError) throw consultationError

      if (recentConsultations && recentConsultations.length > 0) {
          isFreeReview = true;
      }
    }

    // 3. Determine fee
    const consultationFee = isFreeReview ? 0 : 500;

    // 4. Create consultation
    const { data: consultation, error: newConsultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patient.id,
        status: 'pending',
        fee: consultationFee,
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