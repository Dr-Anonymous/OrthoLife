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
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data, error } = await supabase.rpc('search_consultations', {
      name_query: name || null,
      phone_query: phone || null,
      keyword_query: keyword || null,
    });

    if (error) throw error;

    // Group consultations by patient
    const patientsMap = new Map();
    data.forEach(row => {
      if (!patientsMap.has(row.patient_id)) {
        patientsMap.set(row.patient_id, {
          id: row.patient_id,
          name: row.patient_name,
          dob: row.patient_dob,
          sex: row.patient_sex,
          phone: row.patient_phone,
          drive_id: row.patient_drive_id,
          consultations: [],
        });
      }
      patientsMap.get(row.patient_id).consultations.push({
        id: row.consultation_id,
        created_at: row.consultation_created_at,
        status: row.consultation_status,
        consultation_data: row.consultation_data,
        patient: { id: row.patient_id, name: row.patient_name, dob: row.patient_dob, sex: row.patient_sex, phone: row.patient_phone, drive_id: row.patient_drive_id }
      });
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
