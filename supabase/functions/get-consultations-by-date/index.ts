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
    const { date, patientId } = await req.json();

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

    if (patientId) {
      query = query.eq('patient_id', patientId);
    } else if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      query = query.gte('created_at', targetDate.toISOString()).lt('created_at', nextDay.toISOString());
    } else {
      return new Response(JSON.stringify({ error: 'Either date or patientId must be provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await query;

    if (error) throw error;

    const consultations = await Promise.all(data.map(async (c) => {
      let consultation_data = c.consultation_data;
      if (!consultation_data && c.patient) {
        const { data: lastConsultation, error: lastConsultationError } = await supabase
          .from('consultations')
          .select('consultation_data')
          .eq('patient_id', c.patient.id)
          .eq('status', 'completed')
          .not('consultation_data', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastConsultationError) {
          console.error(`Error fetching last consultation for patient ${c.patient.id}:`, lastConsultationError);
        } else if (lastConsultation) {
          consultation_data = lastConsultation.consultation_data;
        }
      }
      return {
        id: c.id,
        status: c.status,
        consultation_data: consultation_data,
        patient: c.patient,
        created_at: c.created_at,
      };
    }));

    return new Response(JSON.stringify({ consultations }), {
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