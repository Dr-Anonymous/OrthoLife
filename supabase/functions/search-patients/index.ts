
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';
import { searchPhoneNumberInDrive } from "../_shared/google-drive.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchTerm, searchType, patientId } = await req.json();

    if (patientId) {
        const patientData = await getPatientDataById(patientId);
        return new Response(JSON.stringify(patientData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    if (!searchTerm || !searchType) {
      return new Response(JSON.stringify({ error: 'searchTerm and searchType are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Search Database
    let query = supabase.from('patients').select('*');
    if (searchType === 'name') {
      query = query.ilike('name', `%${searchTerm}%`);
    } else if (searchType === 'phone') {
      const sanitizedPhone = searchTerm.slice(-10);
      query = query.like('phone', `%${sanitizedPhone}%`);
    }
    const { data: dbData, error: dbError } = await query;

    if (dbError) throw dbError;

    if (dbData && dbData.length > 0) {
      const patientsWithConsultations = await Promise.all(dbData.map(async (patient) => {
        const { data: lastConsultation } = await supabase
          .from('consultations')
          .select('consultation_data')
          .eq('patient_id', patient.id)
          .not('consultation_data', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...patient,
          ...lastConsultation?.consultation_data,
          source: 'database'
        };
      }));

      return new Response(JSON.stringify(patientsWithConsultations), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Fallback to Google Drive if no DB results and searchType is 'phone'
    if (searchType === 'phone') {
      const drivePatients = await searchPhoneNumberInDrive(searchTerm);
      const patientsWithSource = drivePatients.map(p => ({ ...p, source: 'gdrive' }));
      return new Response(JSON.stringify(patientsWithSource), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function getPatientDataById(patientId: string) {
    const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

    if (error) throw error;

    const { data: lastConsultation } = await supabase
        .from('consultations')
        .select('consultation_data')
        .eq('patient_id', patient.id)
        .not('consultation_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    return {
        ...patient,
        ...lastConsultation?.consultation_data,
        source: 'database'
    };
}
