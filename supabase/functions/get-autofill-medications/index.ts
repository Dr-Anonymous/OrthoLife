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
    const { text } = await req.json();
    const words = text.toLowerCase().split(/\s+/);
    const medicationIds = new Set<number>();

    const { data: keywordMappings, error: keywordsError } = await supabase
      .from('autofill_keywords')
      .select('keywords, medication_ids');

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (keywordMappings) {
      for (const word of words) {
        for (const mapping of keywordMappings) {
          if (mapping.keywords && mapping.keywords.includes(word)) {
            for (const id of mapping.medication_ids) {
              medicationIds.add(id);
            }
          }
        }
      }
    }

    if (medicationIds.size === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('saved_medications')
      .select('*')
      .in('id', Array.from(medicationIds));

    if (error) {
      console.error('Error fetching medications:', error);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
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