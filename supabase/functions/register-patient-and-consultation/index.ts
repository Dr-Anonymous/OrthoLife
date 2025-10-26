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
    const { name, dob, sex, phone, driveId: existingDriveId, force = false } = await req.json();

    // Sanitize phone to last 10 digits
    const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);

    // If a driveId is provided, we're updating an existing patient.
    if (existingDriveId) {
      const { data: updatedPatient, error: updateError } = await supabase
        .from('patients')
        .update({ name, dob, sex, phone: sanitizedPhone })
        .eq('drive_id', existingDriveId)
        .select('id, created_at, drive_id')
        .single();
      if (updateError) throw updateError;

      // Proceed to create a consultation for the updated patient
      const { data: consultation, error: newConsultationError } = await supabase
        .from('consultations')
        .insert({ patient_id: updatedPatient.id, status: 'pending' })
        .select()
        .single();

      if (newConsultationError) throw newConsultationError;

      return new Response(JSON.stringify({
        status: 'success',
        consultation,
        driveId: updatedPatient.drive_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check for existing patients with the same phone number
    const { data: existingPatients, error: patientError } = await supabase
      .from('patients')
      .select('id, name, dob, sex, phone, drive_id')
      .eq('phone', sanitizedPhone);

    if (patientError) throw patientError;

    const newNameLower = name.toLowerCase();
    const newNameParts = newNameLower.split(/\s+/).filter(p => p.length > 0);

    let exactMatch = null;
    const partialMatches: any[] = [];

    if (existingPatients && existingPatients.length > 0) {
      for (const patient of existingPatients) {
        const existingNameLower = patient.name.toLowerCase();

        if (newNameLower === existingNameLower) {
          exactMatch = patient;
          break;
        }

        const existingNameParts = existingNameLower.split(/\s+/).filter(p => p.length > 0);

        const isPartialMatch = newNameParts.some(newPart =>
          existingNameParts.some(existingPart =>
            (newPart.length >= 4 && existingPart.startsWith(newPart)) ||
            (existingPart.length >= 4 && newPart.startsWith(existingPart))
          )
        );

        if (isPartialMatch) {
          partialMatches.push(patient);
        }
      }
    }

    if (exactMatch) {
      return new Response(JSON.stringify({
        status: 'exact_match',
        message: 'A patient with this exact name and phone number already exists.',
        patient: exactMatch
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      });
    }

    if (partialMatches.length > 0 && !force) {
      return new Response(JSON.stringify({
        status: 'partial_match',
        message: 'Found patients with similar names. Please confirm if this is a new patient.',
        matches: partialMatches
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // No matches or user confirmed new patient, proceed with registration
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
      .insert({ id: newPatientId, name, dob, sex, phone: sanitizedPhone, drive_id: driveId })
      .select('id, created_at, drive_id')
      .single();

    if (newPatientError) throw newPatientError;

    if (!newPatient) {
      throw new Error("Patient could not be created.");
    }

    // Create the consultation record for the new patient
    const { data: consultation, error: newConsultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: newPatient.id,
        status: 'pending',
      })
      .select()
      .single();

    if (newConsultationError) throw newConsultationError;

    return new Response(JSON.stringify({
      status: 'success',
      consultation,
      driveId: newPatient.drive_id
    }), {
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