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
    const { date, patientId, action, hospital, consultant_id: consultantId } = await req.json();

    // MODE 1 & 2: Fetch Consultations (List History or Daily List)
    const result = await fetchConsultations(date, patientId, hospital, consultantId);
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
 * - optional hospital scoping in date mode
 */
async function fetchConsultations(date?: string, patientId?: string, hospital?: string, consultantId?: string) {
  if (!consultantId && !patientId) {
    console.log('[get-consultations] No consultantId provided and no patientId - returning empty list');
    return { consultations: [] };
  }

  let query = supabase
    .from('consultations')
    .select(`
      id, status, consultation_data, visit_type, location, language, created_at, duration,
      procedure_fee, procedure_consultant_cut, referral_amount, referred_by, consultant_id,
      investigations, radiology_findings, radiology_images,
      consultant:consultants (name),
      patient:patients (
        id, name, dob, sex, phone, drive_id, is_dob_estimated, secondary_phone,
        occupation, blood_group, hometown
      )
    `)
    .order('created_at', { ascending: false });

  if (consultantId) {
    query = query.eq('consultant_id', consultantId);
  } else if (!patientId) {
    // This part is now redundant due to the check at the top, but keeping it for safety
    return { consultations: [] };
  }

  if (patientId) {
    // query = query.eq('patient_id', patientId);
    // Support for Linked Patients: Fetch all IDs belonging to this patient's cluster
    const { data: connectedIds, error: rpcError } = await supabase
      .rpc('get_linked_patient_ids', { p_id: patientId });

    if (rpcError) {
      console.error('Error fetching linked patients:', rpcError);
      // Fallback to single ID if RPC fails (though it shouldn't)
      query = query.eq('patient_id', patientId);
    } else if (connectedIds && connectedIds.length > 0) {
      query = query.in('patient_id', connectedIds);
    } else {
      query = query.eq('patient_id', patientId);
    }
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

  // Enforce hospital scoping on date-based list views.
  // Keep legacy records with null location visible across hospitals, matching existing UI behavior.
  const scopedData = (date && hospital)
    ? data.filter((c: any) => !c.location || c.location.toLowerCase() === String(hospital).toLowerCase())
    : data;

  // Post-process: Add last_visit_date string and Autofill data if needed
  const consultations = await Promise.all(scopedData.map(async (c: any) => {
    // 1. Fetch History relative to THIS consultation
    const { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate } = await fetchRecentHistory(c.patient.id, c.created_at);

    // 2. Calculate Display String
    const lastVisitDateString = calculateLastVisitString(lastOpDate, lastDischargeDate);

    // 3. Autofill Logic (if data is missing/empty)
    let consultation_data = c.consultation_data;
    if ((!consultation_data || (typeof consultation_data === 'object' && Object.keys(consultation_data).length === 0)) && c.patient) {
      consultation_data = generateAutofillData(c, lastConsultation, lastDischarge, lastOpDate, lastDischargeDate);
    }

    // 4. Autofill Referred By if missing (only if we are also autofilling data or it's just missing)
    // Actually, if it's a new consultation (implied by !c.consultation_data), we should carry over referred_by.
    let referred_by = c.referred_by;
    if (!referred_by && !c.consultation_data && lastConsultation && lastConsultation.referred_by) {
      referred_by = lastConsultation.referred_by;
    }

    return {
      ...c,
      consultation_data,
      referred_by,
      last_visit_date: lastVisitDateString
    };
  }));

  return { consultations };
}

/**
 * Helper: Fetches the most recent completed consultation and discharge summary *strictly before* the reference date.
 *
 * Notes:
 * - History is resolved against the full linked-patient cluster, not only the current patient row.
 * - This allows merged/linked records to preserve continuity in "last visit" and autofill behavior.
 */
async function fetchRecentHistory(patientId: string, referenceDateIso: string) {
  // Support for Linked Patients: Fetch all IDs
  let patientIds = [patientId];
  const { data: connectedIds } = await supabase.rpc('get_linked_patient_ids', { p_id: patientId });
  if (connectedIds && connectedIds.length > 0) {
    patientIds = connectedIds;
  }

  // 1. Fetch Recent Consultations (Any status, meant to capture "Last Visit")
  const { data: consultations } = await supabase
    .from('consultations')
    .select('consultation_data, created_at, referred_by, consultant_id, investigations, radiology_findings')
    .in('patient_id', patientIds) // Use IN instead of EQ
    .lt('created_at', referenceDateIso)
    .order('created_at', { ascending: false })
    .limit(3);

  let lastConsultation = null;
  if (consultations && consultations.length > 0) {
    const hasData = (c: any) => {
      if (!c) return false;
      if (c.investigations && c.investigations.trim() !== '') return true;
      if (c.radiology_findings && c.radiology_findings.trim() !== '') return true;

      const data = c.consultation_data;
      if (!data || typeof data !== 'object') return false;

      const hasComplaints = typeof data.complaints === 'string' && data.complaints.trim() !== '';
      const hasFindings = typeof data.findings === 'string' && data.findings.trim() !== '';
      const hasDiagnosis = typeof data.diagnosis === 'string' && data.diagnosis.trim() !== '';
      const hasAdvice = typeof data.advice === 'string' && data.advice.trim() !== '';
      const hasProcedure = typeof data.procedure === 'string' && data.procedure.trim() !== '';
      const hasOrthotics = typeof data.orthotics === 'string' && data.orthotics.trim() !== '';
      const hasMedications = Array.isArray(data.medications) && data.medications.length > 0;

      return hasComplaints || hasFindings || hasDiagnosis || hasAdvice || hasProcedure || hasOrthotics || hasMedications;
    };

    lastConsultation = consultations.find(hasData) || consultations[0];
  }

  // DEBUG: Inspect ALL InPatients records for this user (to see why filter failed)
  // if (patientId) {
  //   const { data: allInPatients } = await supabase
  //     .from('in_patients')
  //     .select('id, status, discharge_date, discharge_summary')
  //     .in('patient_id', patientIds);
  //   console.log(`[RecentHistory] Raw InPatients for ${patientIds}:`, JSON.stringify(allInPatients));
  // }

  const lastOpDate = lastConsultation ? new Date(lastConsultation.created_at) : null;
  // Relax the cutoff for discharge date to account for timezone differences
  const dischargeCutoffDate = new Date(new Date(referenceDateIso).getTime() + (24 * 60 * 60 * 1000)).toISOString();

  // 2. Fetch Last Discharge Summary
  const { data: lastDischarge } = await supabase
    .from('in_patients')
    .select('discharge_date, discharge_summary, procedure_date, consultant_id')
    .in('patient_id', patientIds) // Use IN instead of EQ
    .eq('status', 'discharged')
    .not('discharge_summary', 'is', null)
    .lt('discharge_date', dischargeCutoffDate)
    .order('discharge_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastDischargeDate = lastDischarge && lastDischarge.discharge_date ? new Date(lastDischarge.discharge_date) : null;

  return { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate };
}

/**
 * Helper: Generates the "Last visit: ..." string.
 */
function calculateLastVisitString(lastOpDate: Date | null, lastDischargeDate: Date | null): string {
  const lastDischargeDay = lastDischargeDate ? format(lastDischargeDate, 'yyyy-MM-dd') : null;
  const lastOpDay = lastOpDate ? format(lastOpDate, 'yyyy-MM-dd') : null;

  // Prefer Discharge if it's more recent OR on the same day as the last visit
  if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate || lastDischargeDay === lastOpDay)) {
    return `Discharged ${formatDistanceToNow(lastDischargeDate, { addSuffix: true })} (${format(lastDischargeDate, 'dd MMM yyyy')})`;
  } else if (lastOpDate) {
    return `Visited ${formatDistanceToNow(lastOpDate, { addSuffix: true })} (${format(lastOpDate, 'dd MMM yyyy')})`;
  }
  return 'First Consultation';
}

/**
 * Removes bracketed text from strings.
 */
function removeBracketedText(text: string): string {
  if (!text) return '';
  return text.replace(/[ \t]*\(.*?\)[ \t]*/g, ' ').trim();
}

/**
 * Replicates the clinical data cleaning logic for the Edge Function.
 */
function cleanConsultationData(data: any, keepBrackets: boolean = false): any {
  if (!data) return data;

  const process = (text: any) => keepBrackets ? (text || '') : removeBracketedText(text);

  const cleanMedication = (med: any) => ({
    ...med,
    composition: process(med.composition || med.name),
    dose: process(med.dose),
    frequency: process(med.frequency),
    frequency_te: process(med.frequency_te),
    duration: process(med.duration),
    duration_te: process(med.duration_te),
    instructions: process(med.instructions),
    instructions_te: process(med.instructions_te),
    notes: process(med.notes),
    notes_te: process(med.notes_te),
  });

  const hasReferredToListField = 'referred_to_list' in data && Array.isArray(data.referred_to_list);
  const referredToList = hasReferredToListField
    ? data.referred_to_list.map((s: string) => process(s)).filter((s: string) => s && s.trim().length > 0)
    : [];

  const referredToString = hasReferredToListField
    ? (referredToList.length > 0 ? referredToList.map((s: string) => `• ${s}`).join('\n') : '')
    : process(data.referred_to);

  return {
    ...data,
    complaints: process(data.complaints),
    findings: process(data.findings),
    investigations: process(data.investigations),
    diagnosis: process(data.diagnosis),
    advice: process(data.advice),
    advice_te: process(data.advice_te),
    followup: process(data.followup),
    followup_te: process(data.followup_te),
    referred_by: process(data.referred_by),
    medications: (data.medications?.map(cleanMedication) || []).filter((m: any) => m.composition && m.composition.trim().length > 0),
    procedure: process(data.procedure),
    referred_to: referredToString,
    referred_to_list: referredToList,
    weight: process(data.weight),
    height: process(data.height),
    pulse: process(data.pulse),
    spo2: process(data.spo2),
    bp: process(data.bp),
    temperature: process(data.temperature),
    allergy: process(data.allergy),
    medicalHistory: process(data.medicalHistory),
    familyHistory: process(data.familyHistory),
    occupation: process(data.occupation),
    blood_group: process(data.blood_group),
    orthotics: process(data.orthotics),
    orthotics_te: process(data.orthotics_te),
    radiology_findings: process(data.radiology_findings),
    personalNote: process(data.personalNote),
  };
}

/**
 * Helper: Generates autofill data from history.
 *
 * Precedence:
 * 1) Most recent discharge summary (if newer than last OP visit)
 * 2) Most recent consultation_data
 * 3) null (no autofill)
 */
function generateAutofillData(
  currentConsultation: any,
  lastConsultation: any,
  lastDischarge: any,
  lastOpDate: Date | null,
  lastDischargeDate: Date | null
) {
  // Priority: Discharge Summary (if more recent or same day) > Last Consultation
  const lastDischargeDay = lastDischargeDate ? format(lastDischargeDate, 'yyyy-MM-dd') : null;
  const lastOpDay = lastOpDate ? format(lastOpDate, 'yyyy-MM-dd') : null;

  if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate || lastDischargeDay === lastOpDay)) {
    try {
      const summary: any = lastDischarge.discharge_summary;
      const course = summary.course_details || {};
      const discharge = summary.discharge_data || {};

      // Calculate post-op days (POD 0 = day of procedure, POD 1 = day after procedure)
      let complaintsText = '';
      if (lastDischarge.procedure_date) {
        const today = new Date();
        const procDate = new Date(lastDischarge.procedure_date);
        // Normalize both to start of day to get accurate day difference
        today.setHours(0, 0, 0, 0);
        procDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - procDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          complaintsText = `Post-operative case (POD 0).`;
        } else {
          complaintsText = `${diffDays} day${diffDays === 1 ? '' : 's'} post-operative case.`;
        }
      }

      const autofillData = {
        complaints: complaintsText,
        diagnosis: course.diagnosis || '',
        procedure: course.procedure ? `${course.procedure} done on ${lastDischarge.procedure_date ? new Date(lastDischarge.procedure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}` : '',
        medications: discharge.medications || [],
        advice: discharge.post_op_care || '',
        findings: discharge.clinical_notes || course.operation_notes || '',
        followup: discharge.review_date ? new Date(discharge.review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        investigations: '',
        visit_type: currentConsultation.visit_type || 'paid',
        weight: '',
        bp: '',
        temperature: '',
        allergy: '',
        personalNote: '',
        referred_to: '',
        procedure_fee: '',
        procedure_consultant_cut: '',
        referral_amount: '',
        referred_by: '',
        affordabilityPreference: 'none',
        certificates: [],
        receipts: []
      };

      const isDifferentConsultant = !!lastDischarge.consultant_id && !!currentConsultation.consultant_id && lastDischarge.consultant_id !== currentConsultation.consultant_id;
      return cleanConsultationData(autofillData, !isDifferentConsultant);
    } catch (e) {
      console.error("Error parsing discharge summary:", e);
    }
  } else if (lastConsultation && lastConsultation.consultation_data) {
    const data = {
      ...lastConsultation.consultation_data,
      investigations: lastConsultation.investigations || '',
      radiology_findings: lastConsultation.radiology_findings || '',
    };
    const isDifferentConsultant = !!lastConsultation.consultant_id && !!currentConsultation.consultant_id && lastConsultation.consultant_id !== currentConsultation.consultant_id;

    if (isDifferentConsultant) {
      data.personalNote = '';
      data.procedure_fee = '';
      data.procedure_consultant_cut = '';
      data.referral_amount = '';
      data.referred_by = '';
      data.affordabilityPreference = 'none';
      data.certificates = [];
      data.receipts = [];
    }

    return cleanConsultationData(data, !isDifferentConsultant);
  }
  return null;
}
