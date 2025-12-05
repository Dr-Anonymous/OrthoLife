import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { month, year, day, dataType = 'day', includeMonthly = true } = await req.json();

    const monthStartDate = new Date(year, month, 1).toISOString();
    const monthEndDate = new Date(year, month + 1, 0).toISOString();

    if (dataType === 'month') {
      const { data: monthlyData, error: monthlyDataError } = await supabase
        .from('consultations')
        .select(`
          id,
          status,
          created_at,
          consultation_data,
          visit_type,
          location,
          language,
          patient:patients (
            id,
            name,
            dob,
            sex,
            phone,
            drive_id
          )
        `)
        .gte('created_at', monthStartDate)
        .lte('created_at', monthEndDate)
        .order('created_at', { ascending: false });

      if (monthlyDataError) throw monthlyDataError;

      return new Response(JSON.stringify({ monthlyData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Default 'day' data type
    let monthlyCount = null;
    let monthlyData = null;

    if (includeMonthly) {
      const { data: mData, error: monthlyError } = await supabase
        .from('consultations')
        .select('consultation_data, visit_type, location, language')
        .gte('created_at', monthStartDate)
        .lte('created_at', monthEndDate);

      if (monthlyError) throw monthlyError;
      monthlyData = mData;
      monthlyCount = monthlyData.length;
    }

    const dayStartDate = new Date(year, month, day).toISOString();
    const dayEndDate = new Date(year, month, day + 1).toISOString();

    const { data: dailyData, error: dailyError } = await supabase
      .from('consultations')
      .select(`
        id,
        status,
        created_at,
        consultation_data,
        visit_type,
        location,
        language,
        patient:patients (
          id,
          name,
          dob,
          sex,
          phone,
          drive_id
        )
      `)
      .gte('created_at', dayStartDate)
      .lt('created_at', dayEndDate);

    if (dailyError) throw dailyError;

    return new Response(JSON.stringify({ monthlyCount, monthlyStats: monthlyData, dailyData }), {
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