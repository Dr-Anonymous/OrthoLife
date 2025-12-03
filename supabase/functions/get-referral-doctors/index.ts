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
        const { search } = await req.json();

        let query = supabase
            .from('referral_doctors')
            .select('id, name, specialization, phone, address');

        if (search) {
            query = query.or(`name.ilike.%${search}%,specialization.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;

        return new Response(JSON.stringify({ doctors: data }), {
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
