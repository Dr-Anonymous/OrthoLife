import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { keywords, medications, advice, advice_te } = await req.json();

    if (!keywords || keywords.length === 0 || !medications || medications.length === 0) {
      return new Response(JSON.stringify({ error: 'Keywords and medications are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, save the medications and get their IDs
    const savedMedicationIds = [];
    for (const med of medications) {
      // Check if the medication already exists
      let { data: existingMed, error: selectError } = await supabase
        .from('saved_medications')
        .select('id')
        .eq('name', med.name)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116: Not found
        throw selectError;
      }

      if (existingMed) {
        savedMedicationIds.push(existingMed.id);
      } else {
        const { data: newMed, error: insertError } = await supabase
          .from('saved_medications')
          .insert({
            name: med.name,
            dose: med.dose,
            freq_morning: med.freqMorning,
            freq_noon: med.freqNoon,
            freq_night: med.freqNight,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            notes: med.notes,
            instructions_te: med.instructions_te,
            frequency_te: med.frequency_te,
            notes_te: med.notes_te,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        savedMedicationIds.push(newMed.id);
      }
    }

    // Now, create the autofill keyword entry
    const { data, error } = await supabase
      .from('autofill_keywords')
      .insert({
        keywords: keywords,
        medication_ids: savedMedicationIds,
        advice: advice,
         advice_te: advice_te,
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-autofill-bundle function:', error);
    return new Response(JSON.stringify({ error: 'Failed to save bundle.', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
