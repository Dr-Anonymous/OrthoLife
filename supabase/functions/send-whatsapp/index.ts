
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message } = await req.json()

    if (!number || !message) {
      throw new Error('Missing number or message')
    }

    // Phone number formatting
    // 1. Remove non-digits
    let formattedNumber = number.replace(/\D/g, '')

    // 2. If length is 10, prepend 91.
    // If length is > 10, assume country code is present.
    // If length < 10, it's likely invalid, but we'll pass it to let the app handle/fail it.
    if (formattedNumber.length === 10) {
      formattedNumber = '91' + formattedNumber
    }

    const uniqueId = crypto.randomUUID()
    const firebaseDbUrl = "https://whatsauto-9cf91-default-rtdb.firebaseio.com"
    const url = `${firebaseDbUrl}/${uniqueId}.json`

    const payload = {
      number: formattedNumber,
      message: message
    }

    const response = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Firebase error:', errorText)
      throw new Error(`Failed to send to Firebase: ${response.statusText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ success: true, id: uniqueId, data }),
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
