import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { patientData, appointmentData, paymentData, eventId } = await req.json();
    const isReschedule = !!eventId;
    //console.log('Booking appointment for:', patientData.name, 'at', appointmentData.start);
    const paymentStatus = paymentData.paymentMethod === 'offline' ? 'pending' : 'paid';
    const dob = patientData.dateOfBirth ? '\nDOB: ' + new Date(patientData.dateOfBirth).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata'
    }) : "";
    const myMail = patientData.email && patientData.email.trim() ? `\nEmail: ${patientData.email}` : "";
    const appointmentId = crypto.randomUUID();
    const message = encodeURI(`Dear ${patientData.name},\nYour ${appointmentData.serviceType} is scheduled at ${new Date(appointmentData.start).toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour12: true,
      timeStyle: 'short'
    })} on ${new Date(appointmentData.start).toLocaleDateString('en-GB', {
      timeZone: 'UTC'
    })}.`);
    const accessToken = await getGoogleAccessToken();
    if (accessToken) {
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      const calendarEvent = {
        summary: patientData.name,
        description: `Patient: ${patientData.name}` + dob + myMail + `\nPhone: ${patientData.phone}
Address: ${patientData.address}
Service: ${appointmentData.serviceType}
Amount: ₹${appointmentData.amount}
Payment: ${paymentData.paymentMethod === 'offline' ? 'Pay at clinic' : 'Paid online'}
WhatsApp: <a href="https://wa.me/91${patientData.phone}?text=` + message + `">Send</a>
SMS: <a href="sms:${patientData.phone}?body=` + message + `">Send</a>`,
        start: {
          dateTime: addMinutes(appointmentData.start)
        },
        end: {
          dateTime: addMinutes(appointmentData.end)
        }
      };

      const apiUrl = isReschedule
        ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`
        : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

      const method = isReschedule ? 'PUT' : 'POST';

      const calendarResponse = await fetch(apiUrl, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      });
      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error(`Failed to ${isReschedule ? 'update' : 'create'} calendar event:`, errorText);
      // Continue response even if calendar fails
      } else {
        const calendarEventData = await calendarResponse.json();
        console.log(`Google Calendar event ${isReschedule ? 'updated' : 'created'}:`, calendarEventData.id);
      }
    } else {
      console.log('No Google Calendar access token available, skipping event creation');
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
