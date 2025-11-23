import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { eventId, phone, serviceType, date } = await req.json();
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      // Send WhatsApp notification if details are provided
      if (phone && serviceType && date) {
        const message = `Your appointment for ${serviceType} on ${new Date(date).toLocaleDateString('en-GB')} has been cancelled.`;
        await sendWhatsAppMessage(phone, message);
      }

      return new Response(JSON.stringify({ success: true, message: 'Appointment cancelled successfully.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const errorData = await response.json();
      console.error('Google Calendar API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to cancel appointment.', details: errorData }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in cancel appointment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
