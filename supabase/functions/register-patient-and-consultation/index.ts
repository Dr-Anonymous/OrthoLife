import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'
import { getGoogleAccessToken } from '../_shared/google-auth.ts';

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

async function createGoogleDriveFolder(folderName: string, accessToken: string): Promise<string | null> {
  try {
    const templateParent = "1-q41-i2W-_1_e-nQ2-Z-B-1_Z-I-e-R-c-x-p-H-l-k-Q";
    const createFolderResp = await fetch(`https://www.googleapis.com/drive/v3/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [templateParent]
      })
    });

    if (createFolderResp.ok) {
      const folderData = await createFolderResp.json();
      return folderData.id;
    } else {
      console.error('Could not create Google Drive folder:', await createFolderResp.text());
      return null;
    }
  } catch (error) {
    console.error('Error creating Google Drive folder:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, dob, sex, phone, driveId: existingDriveId } = await req.json();

    let patient;
    let driveId = existingDriveId || null;

    if (!existingDriveId) {
      const { data: existingPatient, error: patientError } = await supabase
        .from('patients')
        .select('id, created_at, drive_id')
        .eq('phone', phone)
        .eq('name', name)
        .single();

      if (patientError && patientError.code !== 'PGRST116') {
        throw patientError;
      }

      patient = existingPatient;

      if (!patient) { // New patient registration
        const accessToken = await getGoogleAccessToken();
        if (accessToken) {
          driveId = await createGoogleDriveFolder(name, accessToken);
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
    } else {
        const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, created_at, drive_id')
        .eq('drive_id', existingDriveId)
        .single();
        patient = existingPatient;
    }

    if (!patient) {
      throw new Error("Patient could not be found or created.");
    }

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