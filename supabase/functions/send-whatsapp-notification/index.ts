
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to format date for Indian timezone display
function formatIndianDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Function to send WhatsApp message using baileys
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    // Note: This is a simplified example. In a real implementation, you would need to:
    // 1. Set up a persistent WebSocket connection to WhatsApp
    // 2. Handle authentication and QR code scanning
    // 3. Manage connection state
    
    console.log(`Attempting to send WhatsApp message to ${phoneNumber}`);
    console.log(`Message: ${message}`);
    
    // For now, we'll simulate sending the message
    // In a real implementation, you would use baileys library here
    
    // Placeholder for baileys integration
    // const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    // const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    // const sock = makeWASocket({ auth: state });
    // await sock.sendMessage(`${phoneNumber}@s.whatsapp.net`, { text: message });
    
    console.log('WhatsApp message sent successfully (simulated)');
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientData, appointmentData, appointmentId } = await req.json();
    
    console.log('Sending WhatsApp notification for appointment:', appointmentId);

    // Format the appointment time in Indian timezone
    const appointmentTime = formatIndianDateTime(appointmentData.start);
    
    // Create WhatsApp message
    const message = `🏥 *Appointment Confirmation*

Hello ${patientData.name},

Your appointment has been confirmed!

📅 *Date & Time:* ${appointmentTime}
🩺 *Service:* ${appointmentData.serviceType}
💰 *Fee:* ₹${appointmentData.amount}
🆔 *Appointment ID:* ${appointmentId}

📍 *Clinic Address:*
Dr. Orthopedic Clinic
123 Medical Street
City, State 12345

📞 *Contact:* +91-9876543210

Please arrive 15 minutes early for your appointment.

Thank you for choosing our clinic! 🙏`;

    // Format phone number (ensure it starts with country code)
    let phoneNumber = patientData.phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneNumber.startsWith('91')) {
      phoneNumber = phoneNumber;
    } else if (phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    // Send WhatsApp message
    const messageSent = await sendWhatsAppMessage(phoneNumber, message);

    if (messageSent) {
      return new Response(JSON.stringify({
        success: true,
        message: 'WhatsApp notification sent successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to send WhatsApp notification'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    console.error('Error in WhatsApp notification function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
