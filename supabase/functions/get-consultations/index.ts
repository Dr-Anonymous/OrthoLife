/**
 * @fileoverview Supabase Edge Function: get-consultations
 * 
 * @description
 * This function retrieves consultation records. It supports two modes of operation:
 * 1. Fetch by Date: Returns all consultations for a specific calendar date (for daily lists).
 * 2. Fetch by Patient ID: Returns the full consultation history for a specific patient.
 * 
 * @features
 * - Autofill: For new/empty consultations, it pre-fills data from the *most recent* history (Discharge Summary or Previous Consultation).
 * - Last Visit Display: Calculates a user-friendly string (e.g., "Last visit: 2 days ago") for UI display.
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date, patientId, action } = await req.json();

    // MODE 1 & 2: Fetch Consultations (List History or Daily List)
    const result = await fetchConsultations(date, patientId);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})



/**
 * Fetches consultations based on date or patientId, and enriches them with:
 * - last_visit_date string
 * - autofilled consultation_data (if empty)
 */
async function fetchConsultations(date?: string, patientId?: string) {
  let query = supabase
    .from('consultations')
    .select(`
      id, status, consultation_data, visit_type, location, language, created_at, duration,
      procedure_fee, procedure_consultant_cut, referral_amount, referred_by,
      patient:patients (
        id, name, dob, sex, phone, drive_id, is_dob_estimated
      )
    `)
    .order('created_at', { ascending: false });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  } else if (date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);
    query = query.gte('created_at', targetDate.toISOString()).lt('created_at', nextDay.toISOString());
  } else {
    throw new Error('Either date or patientId must be provided');
  }

  const { data, error } = await query;
  if (error) throw error;

  // Post-process: Add last_visit_date string and Autofill data if needed
  const consultations = await Promise.all(data.map(async (c: any) => {
    // 1. Fetch History relative to THIS consultation
    const { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate } = await fetchRecentHistory(c.patient.id, c.created_at);

    // 2. Calculate Display String
    const lastVisitDateString = calculateLastVisitString(lastOpDate, lastDischargeDate);

    // 3. Autofill Logic (if data is missing/empty)
    let consultation_data = c.consultation_data;
    if (!consultation_data && c.patient) {
      consultation_data = generateAutofillData(c, lastConsultation, lastDischarge, lastOpDate, lastDischargeDate);
    }

    return {
      ...c,
      consultation_data,
      last_visit_date: lastVisitDateString
    };
  }));

  return { consultations };
}

/**
 * Helper: Fetches the most recent completed consultation and discharge summary *strictly before* the reference date.
 */
async function fetchRecentHistory(patientId: string, referenceDateIso: string) {
  // 1. Fetch Last Consultation (Any status, meant to capture "Last Visit")
  const { data: lastConsultation } = await supabase
    .from('consultations')
    .select('consultation_data, created_at')
    .eq('patient_id', patientId)
    .lt('created_at', referenceDateIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // DEBUG: Inspect ALL InPatients records for this user (to see why filter failed)
  if (patientId) {
    const { data: allInPatients } = await supabase
      .from('in_patients')
      .select('id, status, discharge_date, discharge_summary')
      .eq('patient_id', patientId);

    console.log(`[RecentHistory] Raw InPatients for ${patientId}:`, JSON.stringify(allInPatients));
  }

  // 2. Fetch Last Discharge Summary
  const { data: lastDischarge } = await supabase
    .from('in_patients')
    .select('discharge_date, discharge_summary, procedure_date')
    .eq('patient_id', patientId)
    .eq('status', 'discharged')
    .not('discharge_summary', 'is', null)
    .lt('discharge_date', referenceDateIso)
    .order('discharge_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastOpDate = lastConsultation ? new Date(lastConsultation.created_at) : null;
  const lastDischargeDate = lastDischarge && lastDischarge.discharge_date ? new Date(lastDischarge.discharge_date) : null;

  return { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate };
}

/**
 * Helper: Generates the "Last visit: ..." string.
 */
function calculateLastVisitString(lastOpDate: Date | null, lastDischargeDate: Date | null): string {
  if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate)) {
    return `Discharged ${formatDistanceToNow(lastDischargeDate, { addSuffix: true })} (${format(lastDischargeDate, 'dd MMM yyyy')})`;
  } else if (lastOpDate) {
    return `Visited ${formatDistanceToNow(lastOpDate, { addSuffix: true })} (${format(lastOpDate, 'dd MMM yyyy')})`;
  }
  return 'First Consultation';
}

/**
 * Helper: Generates autofill data from history.
 */
function generateAutofillData(
  currentConsultation: any,
  lastConsultation: any,
  lastDischarge: any,
  lastOpDate: Date | null,
  lastDischargeDate: Date | null
) {
  // Priority: Discharge Summary (if more recent) > Last Consultation
  if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate)) {
    try {
      const summary: any = lastDischarge.discharge_summary;
      const course = summary.course_details || {};
      const discharge = summary.discharge_data || {};

      // Calculate post-op days
      let complaintsText = '';
      if (lastDischarge.procedure_date) {
        const diffTime = Math.abs(new Date().getTime() - new Date(lastDischarge.procedure_date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        complaintsText = `${diffDays} days post-operative case.`;
      }

      return {
        complaints: complaintsText,
        diagnosis: course.diagnosis || '',
        procedure: course.procedure ? `${course.procedure} done on ${lastDischarge.procedure_date ? new Date(lastDischarge.procedure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}` : '',
        medications: discharge.medications || [],
        advice: discharge.post_op_care || '',
        findings: discharge.clinical_notes || '',
        followup: discharge.review_date ? new Date(discharge.review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        investigations: '',
        visit_type: currentConsultation.visit_type || 'paid',
        weight: '', bp: '', temperature: '', allergy: '', personalNote: '', referred_to: ''
      };
    } catch (e) {
      console.error("Error parsing discharge summary:", e);
    }
  } else if (lastConsultation && lastConsultation.consultation_data) {
    return lastConsultation.consultation_data;
  }
  return null;
}