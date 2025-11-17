/**
 * @fileoverview This Supabase Edge Function fetches consultation records from the database.
 *
 * @summary This function has dual functionality, operating in one of two modes:
 * 1.  Fetch by `date`: Retrieves all consultations that occurred on a specific calendar date.
 *     This is used to populate daily lists, like on the Patient Registration page.
 * 2.  Fetch by `patientId`: Retrieves the entire consultation history for a single, specific patient.
 *
 * @feature It includes a special fallback logic: if a consultation record is found but its
 *          `consultation_data` is null (e.g., for a newly created but unsaved consultation),
 *          it will attempt to fetch the `consultation_data` from the patient's most recent
 *          *completed* consultation. This ensures that some historical context is always available.
 *
 * @param {string} [date] - The specific date to fetch consultations for, in 'YYYY-MM-DD' format.
 * @param {string} [patientId] - The unique identifier of the patient whose history to fetch.
 *
 * @returns A JSON response containing an array of consultation objects, each including the full
 *          patient record it is associated with.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  // Standard CORS preflight request handling.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date, patientId } = await req.json();

    // The base query selects all necessary fields and joins the patient's data.
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

    // Mode 1: Fetch by patientId for a complete history.
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    // Mode 2: Fetch by a specific date.
    else if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      // Fetches records where created_at is on or after the start of the targetDate
      // and before the start of the next day.
      query = query.gte('created_at', targetDate.toISOString()).lt('created_at', nextDay.toISOString());
    }
    // If neither parameter is provided, it's a bad request.
    else {
      return new Response(JSON.stringify({ error: 'Either date or patientId must be provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Post-process the results to apply the fallback logic.
    const consultations = await Promise.all(data.map(async (c) => {
      let consultation_data = c.consultation_data;
      // If a consultation has no data (e.g., it's new), try to find the last completed one.
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
          // This is not a fatal error; just log it and continue.
          console.error(`Error fetching last consultation for patient ${c.patient.id}:`, lastConsultationError);
        } else if (lastConsultation) {
          // If a previous completed consultation is found, use its data.
          consultation_data = lastConsultation.consultation_data;
        }
      }
      return {
        ...c,
        consultation_data: consultation_data,
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