import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

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
    const { id, name, dob, sex, phone, driveId: existingDriveId, force = false } = await req.json();

    // Sanitize phone to last 10 digits
    const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);

    // Check for existing patients with the same phone number
    const { data: existingPatients, error: patientError } = await supabase
      .from('patients')
      .select('id, name, dob, sex, phone, drive_id')
      .eq('phone', sanitizedPhone);

    if (patientError) throw patientError;

    // Helper function to calculate Levenshtein distance
    const levenshteinDistance = (a: string, b: string): number => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) == a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    const normalizeString = (str: string): string => {
      return str.toLowerCase().replace(/[^a-z]/g, '');
    };

    const newNameNormalized = normalizeString(name);
    let bestMatch = null;
    let highestSimilarity = 0;

    if (existingPatients && existingPatients.length > 0) {
      for (const patient of existingPatients) {
        const existingNameNormalized = normalizeString(patient.name);

        // Calculate similarity
        const distance = levenshteinDistance(newNameNormalized, existingNameNormalized);
        const maxLength = Math.max(newNameNormalized.length, existingNameNormalized.length);
        const similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength);

        if (similarity >= 0.6) {
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = patient;
          }
        }
      }
    }

    if (bestMatch) {
      // If a match is found (similarity >= 60%), create a new consultation for that patient
      const { data: consultation, error: newConsultationError } = await supabase
        .from('consultations')
        .insert({ patient_id: bestMatch.id, status: 'pending' })
        .select()
        .single();

      if (newConsultationError) throw newConsultationError;

      return new Response(JSON.stringify({
        status: 'success',
        consultation,
        driveId: bestMatch.drive_id,
        matchType: highestSimilarity === 1 ? 'exact' : 'fuzzy',
        similarity: highestSimilarity
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // No matches, proceed with registration
    const driveId = existingDriveId; // Keep existing driveId if patient is being migrated

    const newPatientId = id || await generateIncrementalId(supabase);
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
        visit_type: 'paid',
        consultation_data: {} // Empty initial consultation data, now that location/language are in columns
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
