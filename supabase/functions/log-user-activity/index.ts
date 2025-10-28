import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { admin } from '../_shared/firebase-admin.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { page_visited } = await req.json();
    const userToken = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (admin.apps.length === 0) {
      throw new Error("Firebase admin SDK not initialized. Check credentials.");
    }

    const decodedToken = await admin.auth().verifyIdToken(userToken);
    const user_phone = decodedToken.phone_number;

    if (!user_phone) {
        throw new Error('Phone number not found in token');
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_activity')
      .insert({ user_phone, page_visited });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
});