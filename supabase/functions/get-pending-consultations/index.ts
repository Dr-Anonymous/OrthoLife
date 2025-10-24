import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { date } = await req.json()
    const targetDate = new Date(date)
    const nextDay = new Date(targetDate)
    nextDay.setDate(targetDate.getDate() + 1)

    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        patients (
          id,
          name,
          dob,
          sex,
          phone
        )
      `)
      .eq('status', 'pending')
      .gte('created_at', targetDate.toISOString())
      .lt('created_at', nextDay.toISOString())

    if (error) throw error

    const consultations = data.map(c => ({
        id: c.id,
        patient_id: c.patients.id,
        patient_name: c.patients.name,
        patient_dob: c.patients.dob,
        patient_sex: c.patients.sex,
        patient_phone: c.patients.phone,
    }))

    return new Response(JSON.stringify({ consultations }), {
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