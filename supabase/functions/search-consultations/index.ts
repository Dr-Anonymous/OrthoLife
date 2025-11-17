// this is the master search function used by Consultation.tsx- it can accept name, phone number or keyword input.
//it searches through the whole database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, phone, keyword } = await req.json();

    if (!name && !phone && !keyword) {
      return new Response(JSON.stringify({ error: 'At least one search parameter (name, phone, or keyword) must be provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let query = supabase
      .from('consultations')
      .select(`
        id,
        status,
        consultation_data,
        created_at,
        patient:patients (
          id,
          name,
          dob,
          sex,
          phone,
          drive_id
        )
      `);

    if (name) {
      query = query.ilike('patients.name', `%${name}%`);
    }

    if (phone) {
      const cleanedPhone = phone.slice(-10);
      query = query.like('patients.phone', `%${cleanedPhone}%`);
    }

    if (keyword) {
      // Perform a case-insensitive search across all values in the JSONB object
      query = query.ilike('consultation_data::text', `%${keyword}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Group consultations by patient
    const patientsMap = new Map();
    data.forEach(consultation => {
      const patient = consultation.patient;
      if (!patientsMap.has(patient.id)) {
        patientsMap.set(patient.id, {
          ...patient,
          consultations: [],
        });
      }
      // Since the patient object is nested in the consultation, we remove it before pushing
      const { patient: _, ...consultationData } = consultation;
      patientsMap.get(patient.id).consultations.push(consultationData);
    });

    const results = Array.from(patientsMap.values());

    return new Response(JSON.stringify({ results }), {
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
