
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarEvents = await searchCalendarEvents(accessToken, phoneNumber);

    return new Response(JSON.stringify({ calendarEvents }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search calendar events:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchCalendarEvents(accessToken, phoneNumber) {
  try {
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    const searchResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?q=${encodeURIComponent(phoneNumber)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Google Calendar API error:', errorData);
      return [];
    }

    const searchData = await searchResponse.json();
    const matchingEvents = searchData.items || [];

    return matchingEvents.map((event) => ({
      id: event.id,
      start: event.start?.dateTime || event.start?.date,
      description: event.description,
      attachments: event.attachments?.[0]?.fileUrl,
    }));

  } catch (error) {
    console.error('Error in calendar event search:', error);
    return [];
  }
}
