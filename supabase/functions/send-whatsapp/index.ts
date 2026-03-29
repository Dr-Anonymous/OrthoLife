
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, sendWhatsAppMessage } from "../_shared/whatsapp.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message, consultant_id } = await req.json()

    // 1. Proceed with Realtime DB write directly
    // (UI logic handles the enabled/disabled state for practitioners)
    const result = await sendWhatsAppMessage(number, message, consultant_id)

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
