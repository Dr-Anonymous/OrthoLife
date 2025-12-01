
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, sendWhatsAppMessage } from "../_shared/whatsapp.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message } = await req.json()

    const baseUrl = 'https://ortho.life';
    const cleanNumber = number.replace(/\D/g, '');
    const prescriptionUrl = `${baseUrl}/prescription-view/${number}`;

    const result = await sendWhatsAppMessage(number, message, prescriptionUrl)

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
