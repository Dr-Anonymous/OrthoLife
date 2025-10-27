import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import admin from "https://esm.sh/firebase-admin@11.11.1";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
        clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
        privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

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

    const decodedToken = await admin.auth().verifyIdToken(userToken);
    const user_phone = decodedToken.phone_number;

    if (!user_phone) {
        throw new Error('Phone number not found in token');
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_activity')
      .insert({
        user_phone,
        page_visited,
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
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
