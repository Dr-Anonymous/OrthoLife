
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function sendWhatsAppMessage(number: string, message: string, prescriptionUrl?: string) {
  try {
    if (!number || !message) {
      throw new Error('Missing number or message')
    }

    // Phone number formatting
    // 1. Remove non-digits
    let digits = number.replace(/\D/g, '')

    // 2. If length is 10, prepend 91
    if (digits.length === 10) {
      digits = '91' + digits
    }

    // 3. Ensure it starts with +
    const formattedNumber = '+' + digits

    const uniqueId = crypto.randomUUID()
    const firebaseDbUrl = "https://whatsauto-9cf91-default-rtdb.firebaseio.com"
    const url = `${firebaseDbUrl}/${uniqueId}.json`

    const payload = {
      number: formattedNumber,
      message: message,
      prescriptionUrl: prescriptionUrl
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

    return await response.json()
  } catch (error) {
    console.error("Error sending WhatsApp:", error)
    return null
  }
}
