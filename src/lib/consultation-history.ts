import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Fetches the most recent completed consultation and discharge summary *strictly before* the reference date.
 * Resolves against the full linked-patient cluster to preserve continuity for merged records.
 */
export async function fetchRecentHistory(patientId: string, referenceDateIso: string) {
  // Support for Linked Patients: Fetch all IDs in the cluster
  let patientIds = [patientId];
  try {
    const { data: connectedIds } = await supabase.rpc('get_linked_patient_ids', { p_id: patientId });
    if (connectedIds && connectedIds.length > 0) {
      patientIds = connectedIds;
    }
  } catch (err) {
    console.warn('Failed to fetch linked patient IDs for history:', err);
  }

  // 1. Fetch Last Consultation
  const { data: lastConsultation } = await supabase
    .from('consultations')
    .select('consultation_data, created_at, referred_by')
    .in('patient_id', patientIds)
    .lt('created_at', referenceDateIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastOpDate = lastConsultation ? new Date(lastConsultation.created_at) : null;
  // Relax the cutoff for discharge date to account for timezone differences (1 day window)
  const dischargeCutoffDate = new Date(new Date(referenceDateIso).getTime() + (24 * 60 * 60 * 1000)).toISOString();

  // 2. Fetch Last Discharge Summary
  const { data: lastDischarge } = await supabase
    .from('in_patients')
    .select('discharge_date, discharge_summary, procedure_date')
    .in('patient_id', patientIds)
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
 * Generates the "Last visit: ..." string.
 */
export function calculateLastVisitString(lastOpDate: Date | null, lastDischargeDate: Date | null): string {
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
 * Generates autofill data prioritizing the most recent history item (Discharge vs OP).
 */
export function generateAutofillData(
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

      let complaintsText = '';
      if (lastDischarge.procedure_date) {
        const today = new Date();
        const procDate = new Date(lastDischarge.procedure_date);
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

      return {
        complaints: complaintsText,
        diagnosis: course.diagnosis || '',
        procedure: course.procedure ? `${course.procedure} done on ${lastDischarge.procedure_date ? new Date(lastDischarge.procedure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}` : '',
        medications: (discharge.medications || []).map((m: any) => ({ ...m, composition: m.composition || m.name || '' })),
        advice: discharge.post_op_care || '',
        findings: discharge.clinical_notes || course.operation_notes || '',
        followup: discharge.review_date ? new Date(discharge.review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        investigations: '',
        visit_type: currentConsultation.visit_type || 'paid',
        weight: '', bp: '', temperature: '', allergy: '', personalNote: '', referred_to: ''
      };
    } catch (e) {
      console.error("Error parsing discharge summary:", e);
    }
  } else if (lastConsultation && lastConsultation.consultation_data) {
    const data = { ...lastConsultation.consultation_data };
    if (data.medications) {
      data.medications = data.medications.map((m: any) => ({ ...m, composition: m.composition || m.name || '' }));
    }
    return data;
  }
  return null;
}
