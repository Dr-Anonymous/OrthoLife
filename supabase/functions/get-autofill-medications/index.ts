import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, language = 'en' } = await req.json();
    const cleanedText = text.toLowerCase().replace(/[.,]/g, '');
    const medicationIds = new Set<number>();
    const adviceTexts = new Set<string>();

    const adviceColumn = language === 'te' ? 'advice_te' : 'advice';
    const { data: keywordMappings, error: keywordsError } = await supabase
      .from('autofill_keywords')
      .select(`keywords, medication_ids, ${adviceColumn}`);

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      return new Response(JSON.stringify({ medications: [], advice: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (keywordMappings) {
      for (const mapping of keywordMappings) {
        if (mapping.keywords) {
          for (const keyword of mapping.keywords) {
            const cleanedKeyword = keyword.toLowerCase().replace(/[.,]/g, '');
            if (cleanedText.includes(cleanedKeyword)) {
              if (mapping.medication_ids) {
                  for (const id of mapping.medication_ids) {
                    medicationIds.add(id);
                  }
              }
              const advice = mapping[adviceColumn];
              if (advice) {
                adviceTexts.add(advice);
              }
              break;
            }
          }
        }
      }
    }

    let medications = [];
    if (medicationIds.size > 0) {
      const medicationColumns = language === 'te'
        ? 'id, name, dose, freq_morning, freq_noon, freq_night, duration, instructions:instructions_te, frequency:frequency_te, notes:notes_te'
        : 'id, name, dose, freq_morning, freq_noon, freq_night, duration, instructions, frequency, notes';

      const { data, error } = await supabase
        .from('saved_medications')
        .select(medicationColumns)
        .in('id', Array.from(medicationIds));

      if (error) {
        console.error('Error fetching medications:', error);
      } else {
        medications = data;
      }
    }

    const response = {
      medications,
      advice: Array.from(adviceTexts).join('\n'),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
