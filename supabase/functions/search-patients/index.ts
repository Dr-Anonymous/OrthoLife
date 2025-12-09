/**
 * @fileoverview This Supabase Edge Function is the central hub for finding and retrieving patient data.
 *
 * @summary It serves as a unified patient search endpoint with three primary modes of operation:
 * 1.  Search by `patientId`: Directly fetches a single patient and their latest consultation from the database.
 * 2.  Search by `searchTerm` and `searchType` ('name' or 'phone'):
 *     - First, it queries the main `patients` database.
 *     - If no results are found for a 'phone' search, it performs a fallback search against legacy
 *       patient records stored in Google Drive.
 *     - This mode is designed to handle cases where a single phone number may be associated with
 *       multiple patients, returning a list for the frontend to handle.
 *
 * @param {string} [patientId] - The unique identifier for a patient. If provided, all other search params are ignored.
 * @param {string} [searchTerm] - The search query (either a name or a phone number).
 * @param {string} [searchType] - The type of search, must be either 'name' or 'phone'.
 *
 * @returns A JSON response containing an array of patient objects or a single patient object,
 *          each merged with their most recent consultation data. The `source` property indicates
 *          whether the data came from 'database' or 'gdrive'.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { corsHeaders } from '../_shared/cors.ts';
import { searchPhoneNumberInDrive } from "../_shared/google-drive.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  // Standard CORS preflight request handling.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchTerm, searchType, patientId } = await req.json();

    // Mode 1: Direct fetch by patientId. This is the most specific search and takes priority.
    if (patientId) {
      const patientData = await getPatientDataById(patientId);
      return new Response(JSON.stringify(patientData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Mode 2: Search by term. Requires both searchTerm and searchType.
    if (!searchTerm || !searchType) {
      return new Response(JSON.stringify({ error: 'searchTerm and searchType are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // First, attempt to find the patient in our primary database.
    let query = supabase.from('patients').select('*');
    if (searchType === 'name') {
      query = query.ilike('name', `%${searchTerm}%`);
    } else if (searchType === 'phone') {
      // Sanitize phone number to the last 10 digits for consistent searching.
      const sanitizedPhone = searchTerm.slice(-10);
      query = query.like('phone', `%${sanitizedPhone}%`);
    }
    const { data: dbData, error: dbError } = await query;

    if (dbError) throw dbError;

    // If we find one or more patients in the database, fetch their latest consultation and return them.
    if (dbData && dbData.length > 0) {
      const patientsWithConsultations = await Promise.all(dbData.map(async (patient) => {
        const { data: lastConsultation } = await supabase
          .from('consultations')
          .select('consultation_data, visit_type, location, language, created_at')
          .eq('patient_id', patient.id)
          .not('consultation_data', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...patient,
          ...lastConsultation?.consultation_data,
          visit_type: lastConsultation?.visit_type,
          location: lastConsultation?.location,
          language: lastConsultation?.language,
          created_at: lastConsultation?.created_at || patient.created_at,
          source: 'database'
        };
      }));

      return new Response(JSON.stringify(patientsWithConsultations), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If the database search yields no results and the search was by phone,
    // trigger the fallback to search legacy records in Google Drive.
    if (searchType === 'phone') {
      const drivePatients = await searchPhoneNumberInDrive(searchTerm);
      // Add the 'source' field to identify these as legacy records.
      const patientsWithSource = drivePatients.map(p => ({ ...p, source: 'gdrive' }));
      return new Response(JSON.stringify(patientsWithSource), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no results are found after all checks, return an empty array.
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Helper function to fetch a single patient by their ID and merge it
 * with their most recent consultation data.
 * @param {string} patientId - The UUID of the patient.
 * @returns A single patient object with their latest consultation data.
 */
async function getPatientDataById(patientId: string) {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw error;

  const { data: lastConsultation } = await supabase
    .from('consultations')
    .select('consultation_data, visit_type, location, language, created_at')
    .eq('patient_id', patient.id)
    .not('consultation_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    ...patient,
    ...lastConsultation?.consultation_data,
    visit_type: lastConsultation?.visit_type,
    location: lastConsultation?.location,
    language: lastConsultation?.language,
    created_at: lastConsultation?.created_at || patient.created_at,
    source: 'database'
  };
}
