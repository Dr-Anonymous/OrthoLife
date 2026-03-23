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
    if (currentLocation && lastPaidConsultation.location && lastPaidConsultation.location.toLowerCase() !== currentLocation.toLowerCase()) {
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
    const { id, name, dob, sex, phone, secondary_phone, driveId: existingDriveId, location, is_dob_estimated, referred_by, language, free_visit_duration_days } = await req.json();
    const freeDuration = free_visit_duration_days ? Number(free_visit_duration_days) : 14;

    // Sanitize phone and support matching both full international form and legacy last-10 form.
    const sanitizedPhone = sanitizePhoneNumber(phone);
    const legacyPhone = sanitizedPhone.length > 10 ? sanitizedPhone.slice(-10) : sanitizedPhone;
    const phoneCandidates = Array.from(new Set([sanitizedPhone, legacyPhone].filter(Boolean)));
    const searchablePhone = sanitizedPhone.length >= 10 ? sanitizedPhone.slice(-10) : sanitizedPhone;

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
      return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const isDuplicateKeyError = (error: unknown): boolean => {
      const typedError = error as { code?: string; message?: string; constraint?: string } | null;
      return typedError?.code === '23505' ||
        typedError?.constraint === 'patients_pkey' ||
        typedError?.message?.includes('duplicate key value violates unique constraint "patients_pkey"') === true;
    };

    const findExistingPatientsByPhone = async () => {
      const queries = [];

      if (phoneCandidates.length > 0) {
        queries.push(
          supabase
            .from('patients')
            .select('id, name, dob, sex, phone, drive_id')
            .in('phone', phoneCandidates),
          supabase
            .from('patients')
            .select('id, name, dob, sex, phone, drive_id')
            .in('secondary_phone', phoneCandidates),
        );
      }

      if (searchablePhone) {
        queries.push(
          supabase
            .from('patients')
            .select('id, name, dob, sex, phone, drive_id')
            .like('phone', `%${searchablePhone}`),
          supabase
            .from('patients')
            .select('id, name, dob, sex, phone, drive_id')
            .like('secondary_phone', `%${searchablePhone}`),
        );
      }

      const results = await Promise.all(queries);
      const patients = [];

      for (const result of results) {
        if (result.error) throw result.error;
        patients.push(...(result.data || []));
      }

      return Array.from(new Map(patients.map((patient) => [patient.id, patient])).values());
    };

    const calculateSimilarity = (incomingName: string, existingName: string): number => {
      const normalizedIncomingName = normalizeString(incomingName);
      const normalizedExistingName = normalizeString(existingName);
      const distance = levenshteinDistance(normalizedIncomingName, normalizedExistingName);
      const maxLength = Math.max(normalizedIncomingName.length, normalizedExistingName.length);
      return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    };

    const findBestPatientMatch = async () => {
      if (id) {
        const { data: patientById, error: idError } = await supabase
          .from('patients')
          .select('id, name, dob, sex, phone, drive_id')
          .eq('id', id)
          .maybeSingle();

        if (idError) throw idError;
        if (patientById) {
          return { patient: patientById, similarity: 1 };
        }
      }

      const phoneMatches = await findExistingPatientsByPhone();
      let bestPhoneMatch = null;
      let bestPhoneSimilarity = 0;

      for (const patient of phoneMatches) {
        if (sex && patient.sex && sex.toLowerCase() !== patient.sex.toLowerCase()) {
          continue;
        }

        const similarity = calculateSimilarity(name, patient.name);
        if (similarity >= 0.6 && similarity > bestPhoneSimilarity) {
          bestPhoneSimilarity = similarity;
          bestPhoneMatch = patient;
        }
      }

      if (bestPhoneMatch) {
        return { patient: bestPhoneMatch, similarity: bestPhoneSimilarity };
      }

      const { data: nameMatches, error: nameError } = await supabase
        .from('patients')
        .select('id, name, dob, sex, phone, drive_id')
        .ilike('name', `%${name}%`)
        .limit(5);

      if (nameError) throw nameError;

      let bestNameMatch = null;
      let bestNameSimilarity = 0;
      for (const patient of nameMatches || []) {
        if (sex && patient.sex && sex.toLowerCase() !== patient.sex.toLowerCase()) {
          continue;
        }

        const similarity = calculateSimilarity(name, patient.name);
        if (similarity >= 0.8 && similarity > bestNameSimilarity) {
          bestNameSimilarity = similarity;
          bestNameMatch = patient;
        }
      }

      if (bestNameMatch) {
        return { patient: bestNameMatch, similarity: bestNameSimilarity };
      }

      return { patient: null, similarity: 0 };
    };

    const createConsultationForPatient = async (patient: { id: string | number; name: string; drive_id: string | null }, similarity: number) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: existingConsultations } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patient.id)
        .ilike('location', location)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (existingConsultations && existingConsultations.length > 0) {
        return new Response(JSON.stringify({
          status: 'error',
          message: `Consultation already booked for ${patient.name} today at ${location}.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const visitTypePromise = getVisitType(supabase, patient.id, location, freeDuration);
      const languagePromise = language
        ? Promise.resolve(language)
        : getLastLanguage(supabase, patient.id);

      const [visitType, finalLanguage] = await Promise.all([visitTypePromise, languagePromise]);

      const { data: consultation, error: newConsultationError } = await supabase
        .from('consultations')
        .insert({
          patient_id: patient.id,
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
        driveId: patient.drive_id,
        matchType: similarity === 1 ? 'exact' : 'fuzzy',
        similarity
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    };

    const newNameNormalized = normalizeString(name);
    if (!newNameNormalized) {
      throw new Error('Patient name is required.');
    }

    const { patient: bestMatch, similarity: highestSimilarity } = await findBestPatientMatch();

    if (bestMatch) {
      return await createConsultationForPatient(bestMatch, highestSimilarity);
    }

    // No matches, proceed with registration
    const driveId = existingDriveId; // Keep existing driveId if patient is being migrated

    const newPatientId = id || await generateIncrementalId(supabase);
    const { data: newPatient, error: newPatientError } = await supabase
      .from('patients')
      .insert({
        id: newPatientId,
        name,
        dob,
        sex,
        phone: sanitizedPhone,
        secondary_phone: secondary_phone ? sanitizePhoneNumber(secondary_phone) : null,
        drive_id: driveId,
        is_dob_estimated: is_dob_estimated ?? true
      })
      .select('id, created_at, drive_id')
      .single();

    if (newPatientError) {
      if (!isDuplicateKeyError(newPatientError)) {
        throw newPatientError;
      }

      const recoveredMatch = await findBestPatientMatch();
      if (recoveredMatch.patient) {
        return await createConsultationForPatient(recoveredMatch.patient, recoveredMatch.similarity || 1);
      }

      throw newPatientError;
    }

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
        // consultation_data: {}, // Allow default NULL or explicitly set null
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
