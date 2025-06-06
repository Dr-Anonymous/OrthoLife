
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Main server handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { patientData, appointmentData, paymentData } = await req.json();
    console.log('Booking appointment for:', patientData.name, 'at', appointmentData.start);

    const paymentStatus = paymentData.paymentMethod === 'offline' ? 'pending' : 'paid';
    const appointmentId = crypto.randomUUID();

    const accessToken = await getGoogleAccessToken();
    if (accessToken) {
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      const calendarEvent = {
        summary: `Appointment - ${patientData.name}`,
        description: `Patient: ${patientData.name}
Email: ${patientData.email}
Phone: ${patientData.phone}
Address: ${patientData.address}
Service: ${appointmentData.serviceType}
Amount: ₹${appointmentData.amount}
Payment: ${paymentData.paymentMethod === 'offline' ? 'Pay at clinic' : 'Paid online'}
WhatsApp: <a href="https://wa.me/91${patientData.phone}?text=` + encodeURI(`Dear ${patientData.name},\nYour ${appointmentData.serviceType} is scheduled for ${new Date(appointmentData.start).toLocaleString('en-GB', {
          timeZone: 'UTC',
          hour12: true
        })}.`) + `">Send</a>
Appointment ID: ${appointmentId}`,
        start: {
          dateTime: addMinutes(appointmentData.start)
        },
        end: {
          dateTime: addMinutes(appointmentData.end)
        },
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 1440
            },
            {
              method: 'popup',
              minutes: 60
            }
          ]
        }
      };

      const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      });

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Failed to create calendar event:', errorText);
        // Continue response even if calendar fails
      } else {
        const calendarEventData = await calendarResponse.json();
        console.log('Google Calendar event created:', calendarEventData.id);
      }
    } else {
      console.log('No Google Calendar access token available, skipping event creation');
    }

    // Send WhatsApp notification
    try {
      const whatsappResponse = await fetch('https://vqskeanwpnvuyxorymib.supabase.co/functions/v1/send-whatsapp-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          patientData,
          appointmentData,
          appointmentId
        })
      });

      if (whatsappResponse.ok) {
        console.log('WhatsApp notification sent successfully');
      } else {
        console.error('Failed to send WhatsApp notification');
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      appointmentId,
      paymentStatus,
      message: 'Appointment booked and added to Google Calendar!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

function addMinutes(date) {
  return new Date(new Date(date).getTime() - 330 * 60000);
}
