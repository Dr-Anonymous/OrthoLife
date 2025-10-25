import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';
import { createOrGetPatientFolder } from '../_shared/google-drive.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    const timestamp = Date.now().toString().slice(-3);
    return `${dateKey}${timestamp}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, dob, sex, phone, driveId: existingDriveId } = await req.json();

    let patient;

    if (existingDriveId) {
      // Logic for an existing patient whose details might have been edited
      const { data: updatedPatient, error: updateError } = await supabase
        .from('patients')
        .update({ name, dob, sex, phone })
        .eq('drive_id', existingDriveId)
        .select('id, created_at, drive_id')
        .single();

      if (updateError) throw updateError;
      patient = updatedPatient;

    } else {
      // Logic for a new patient or a patient being looked up for the first time
      const { data: existingPatient, error: patientError } = await supabase
        .from('patients')
        .select('id, created_at, drive_id')
        .eq('phone', phone)
        .eq('name', name)
        .single();

      if (patientError && patientError.code !== 'PGRST116') {
        throw patientError;
      }

      if (existingPatient) {
        patient = existingPatient;
      } else { // New patient registration
        const accessToken = await getGoogleAccessToken();
        let driveId = null;
        if (accessToken) {
          driveId = await createOrGetPatientFolder({
            patientName: name,
            accessToken,
            templateId: "1Wm5gXKW1AwVcdQVmlekOSHN60u32QNIoqGpP_NyDlw4", // Prescription template
          });
        } else {
          console.error("Failed to get Google Access Token. Cannot create Drive folder.");
        }

        const newPatientId = await generateIncrementalId(supabase);
        const { data: newPatient, error: newPatientError } = await supabase
          .from('patients')
          .insert({ id: newPatientId, name, dob, sex, phone, drive_id: driveId })
          .select('id, created_at, drive_id')
          .single();

        if (newPatientError) throw newPatientError;
        patient = newPatient;
      }
    }

    if (!patient) {
      throw new Error("Patient could not be found or created.");
    }

    // Create the consultation record
    const { data: consultation, error: newConsultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patient.id,
        status: 'pending',
      })
      .select()
      .single();

    if (newConsultationError) throw newConsultationError;

    return new Response(JSON.stringify({ consultation, driveId: patient.drive_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});