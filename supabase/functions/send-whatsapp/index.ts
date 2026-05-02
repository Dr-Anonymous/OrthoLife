
/**
 * @fileoverview Supabase Edge Function: send-whatsapp
 * 
 * @description
 * Dispatches WhatsApp messages and media files to patients using shared WhatsApp utility.
 * 
 * @parameters
 * - `number`: Patient's phone number string.
 * - `message`: Body text of message.
 * - `consultant_id`: Opt-in consultant phone number identifier.
 * - `media_url`: Optional absolute URL to a document or image to attach.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, sendWhatsAppMessage, isUuid } from "../_shared/whatsapp.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message, consultant_phone: reqConsultantPhone, consultant_id, media_url } = await req.json()
    let consultant_phone = reqConsultantPhone || consultant_id || "general_notifications"

    if (consultant_phone && isUuid(consultant_phone)) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: c } = await supabase
        .from('consultants')
        .select('phone')
        .eq('id', consultant_phone)
        .single();
      
      if (c?.phone) {
        consultant_phone = c.phone;
      } else {
        console.warn(`[send-whatsapp] Consultant lookup failed for UUID: ${consultant_phone}`);
      }
    }

    // 1. Proceed with Realtime DB write directly
    // (UI logic handles the enabled/disabled state for practitioners)
    const result = await sendWhatsAppMessage(number, message, consultant_phone, media_url)

    if (!result) {
      throw new Error("Failed to send WhatsApp message via shared helper.")
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("send-whatsapp error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
