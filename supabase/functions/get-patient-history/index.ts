import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { patient_id } = await req.json()

    if (!patient_id) {
      throw new Error("patient_id is required.");
    }

    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        created_at,
        status,
        consultation_data
      `)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (error) throw error

    return new Response(JSON.stringify({ history: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
