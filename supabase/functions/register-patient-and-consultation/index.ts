import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { sanitizePhoneNumber } from "../_shared/phone-utils.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
async function generateIncrementalId(supabaseClient: SupabaseClient) {
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

// Helper to determine visit type based on 14-day rule (or hospital specific)
async function getVisitType(supabaseClient: SupabaseClient, patientId: string | number, currentLocation: string, freeVisitDurationDays = 14) {
  const { data: lastPaidConsultation, error } = await supabaseClient
    .from('consultations')
    .select('created_at, location')
    .eq('patient_id', patientId)
    .eq('visit_type', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && lastPaidConsultation) {
    // Rule 1: Different location = Paid
    if (currentLocation && lastPaidConsultation.location && lastPaidConsultation.location !== currentLocation) {
      return 'paid';
    }

    const lastDate = new Date(lastPaidConsultation.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= freeVisitDurationDays) {
      // Rule 2: Only 1 free visit allowed within the window
      const { count, error: countError } = await supabaseClient
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .eq('visit_type', 'free')
        .gt('created_at', lastPaidConsultation.created_at);

      if (!countError && count !== null && count >= 1) {
        return 'paid';
      }

      return 'free';
    }
  }
  return 'paid';
}

// Helper to get last used language
async function getLastLanguage(supabaseClient: SupabaseClient, patientId: string | number) {
  const { data, error } = await supabaseClient
    .from('consultations')
    .select('language')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data?.language) {
    return data.language;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id, name, dob, sex, phone, driveId: existingDriveId, location, is_dob_estimated, referred_by, language, free_visit_duration_days } = await req.json();
    const freeDuration = free_visit_duration_days ? Number(free_visit_duration_days) : 14;

    // Sanitize phone to last 10 digits
    const sanitizedPhone = sanitizePhoneNumber(phone);

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
        // Strict sex check: if sex is provided and different, it's a different patient
        if (sex && patient.sex && sex.toLowerCase() !== patient.sex.toLowerCase()) {
          continue;
        }

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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Check for duplicate consultation for this patient today at this location
      const { data: existingConsultations } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', bestMatch.id)
        .eq('location', location)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (existingConsultations && existingConsultations.length > 0) {
        return new Response(JSON.stringify({
          status: 'error',
          message: `Consultation already booked for ${bestMatch.name} today at ${location}.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          // Return 200 so the client can parse the custom message easily
          status: 200,
        });
      }

      // Determine fields efficiently by running in parallel
      const visitTypePromise = getVisitType(supabase, bestMatch.id, location, freeDuration);

      const languagePromise = language
        ? Promise.resolve(language)
        : getLastLanguage(supabase, bestMatch.id);

      const [visitType, finalLanguage] = await Promise.all([visitTypePromise, languagePromise]);

      const { data: consultation, error: newConsultationError } = await supabase
        .from('consultations')
        .insert({
          patient_id: bestMatch.id,
          status: 'pending',
          location: location,
          visit_type: visitType,
          referred_by: referred_by,
          language: finalLanguage
        })
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
      .insert({ id: newPatientId, name, dob, sex, phone: sanitizedPhone, drive_id: driveId, is_dob_estimated: is_dob_estimated ?? true })
      .select('id, created_at, drive_id')
      .single();

    if (newPatientError) throw newPatientError;

    if (!newPatient) {
      throw new Error("Patient could not be created.");
    }

    // New patient => First visit => Paid (unless overridden, but logic dictates new patient has no history)
    // New patient => Language is provided or default (null)

    // Create the consultation record for the new patient
    const { data: consultation, error: newConsultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: newPatient.id,
        status: 'pending',
        visit_type: 'paid',
        consultation_data: {},
        location: location,
        referred_by: referred_by,
        language: language
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
    return new Response(JSON.stringify({
      status: 'error',
      message: (error as Error).message || 'An unexpected error occurred.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
