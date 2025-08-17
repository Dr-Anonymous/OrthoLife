import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = await req.json();
    
    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Text and target language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetLanguage === sourceLanguage) {
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables not set');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check cache first using plain text
    const { data: cachedData, error: cacheReadError } = await supabase
      .from('translation_cache')
      .select('translated_text')
      .eq('source_text', text)
      .eq('source_language', sourceLanguage)
      .eq('target_language', targetLanguage)
      .single();

    if (cacheReadError && cacheReadError.code !== 'PGRST116') { // PGRST116: "exact one row not found"
      console.error('Error reading from cache:', cacheReadError);
    }

    if (cachedData) {
      console.log('Returning cached translation');
      return new Response(
        JSON.stringify({ translatedText: cachedData.translated_text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. If not in cache, call Google Translate API
    const googleTranslateApiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!googleTranslateApiKey) {
      console.error('Google Translate API key not found');
      return new Response(
        JSON.stringify({ error: 'Translation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Translating (API): ${text.substring(0, 50)}...`);
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLanguage, target: targetLanguage, format: 'text' }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Translate API error:', errorData);
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    // 3. Store the new translation in the cache
    const { error: cacheWriteError } = await supabase
      .from('translation_cache')
      .insert({
        source_text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        translated_text: translatedText,
      });

    if (cacheWriteError) {
      console.error('Error writing to cache:', cacheWriteError);
    }

    console.log('Translation successful and cached');
    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-content function:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});