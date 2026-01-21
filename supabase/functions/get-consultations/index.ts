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
import { format, formatDistanceToNow } from "npm:date-fns@2.30.0"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req: any) => {
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
        status,
        consultation_data,
        visit_type,
        location,
        language,
        created_at,
        patient:patients (
          id,
          name,
          dob,
          sex,
          phone,
          drive_id,
          is_dob_estimated
        )
      `)
      .order('created_at', { ascending: false });

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
    const consultations = await Promise.all(data.map(async (c: any) => {
      let consultation_data = c.consultation_data;

      // We need to fetch last visit info to generate the string, regardless of whether we autofill or not.
      // 1. Fetch Last Completed Consultation (relative to this consultation's created_at)
      const { data: lastConsultation } = await supabase
        .from('consultations')
        .select('consultation_data, created_at')
        .eq('patient_id', c.patient.id)
        .eq('status', 'completed')
        .lt('created_at', c.created_at) // Strictly before this one
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Fetch Last Discharge Summary
      const { data: lastDischarge } = await supabase
        .from('in_patients')
        .select('discharge_date, discharge_summary, procedure_date')
        .eq('patient_id', c.patient.id)
        .eq('status', 'discharged')
        .not('discharge_summary', 'is', null)
        // Simple approach: Latest discharge.
        .order('discharge_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastOpDate = lastConsultation ? new Date(lastConsultation.created_at) : null;
      const lastDischargeDate = lastDischarge ? new Date(lastDischarge.discharge_date) : null;

      let lastVisitDateString = 'First Consultation';

      // Logic to calculate String
      if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate)) {
        const d = new Date(lastDischarge.discharge_date);
        lastVisitDateString = `Discharge: ${formatDistanceToNow(d, { addSuffix: true })} (${format(d, 'dd MMM yyyy')})`;
      } else if (lastOpDate) {
        lastVisitDateString = `${formatDistanceToNow(lastOpDate, { addSuffix: true })} (${format(lastOpDate, 'dd MMM yyyy')})`;
      }

      // Logic to Autofill (Only if no data)
      if (!consultation_data && c.patient) {
        if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate)) {
          // ... autofill logic ...
          try {
            const summary: any = lastDischarge.discharge_summary;
            const course = summary.course_details || {};
            const discharge = summary.discharge_data || {};
            // Post op days calculation
            let complaintsText = '';
            if (lastDischarge.procedure_date) {
              const diffTime = Math.abs(new Date().getTime() - new Date(lastDischarge.procedure_date).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              complaintsText = `${diffDays} days post-operative case.`;
            }
            // Map fields
            consultation_data = {
              complaints: complaintsText,
              diagnosis: course.diagnosis || '',
              procedure: course.procedure ? `${course.procedure} done on ${lastDischarge.procedure_date ? new Date(lastDischarge.procedure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}` : '',
              medications: discharge.medications || [],
              advice: discharge.post_op_care || '',
              findings: discharge.clinical_notes || '',
              followup: discharge.review_date ? new Date(discharge.review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
              investigations: '',
              visit_type: c.visit_type || 'paid',
              weight: '', bp: '', temperature: '', allergy: '', personalNote: '', referred_to: ''
            };
          } catch (e) { console.error("Error parsing discharge summary:", e); }
        } else if (lastConsultation) {
          consultation_data = lastConsultation.consultation_data;
        }
      }
      return {
        ...c,
        consultation_data: consultation_data,
        last_visit_date: lastVisitDateString
      };
    }));

    return new Response(JSON.stringify({ consultations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})