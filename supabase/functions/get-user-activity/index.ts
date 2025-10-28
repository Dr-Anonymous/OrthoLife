import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { year, month, day, view = 'day' } = await req.json();

    let startDate, endDate;

    if (view === 'month') {
      startDate = new Date(year, month, 1).toISOString();
      endDate = new Date(year, month + 1, 1).toISOString();
    } else { // default to 'day' view
      startDate = new Date(year, month, day).toISOString();
      endDate = new Date(year, month, day + 1).toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('user_activity')
      .select('created_at, user_phone, page_visited')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true }); // Order ascending to build trails correctly

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
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