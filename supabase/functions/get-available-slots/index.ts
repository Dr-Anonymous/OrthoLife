
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date } = await req.json();
    
    // Get Google Calendar API credentials
    const calendarId = 'primary'; // Use primary calendar
    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    
    if (!apiKey) {
      throw new Error('Google Calendar API key not configured');
    }

    // Define working hours (9 AM to 5 PM)
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(17, 0, 0, 0);

    // Fetch existing events for the day
    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      `timeMin=${startTime.toISOString()}&` +
      `timeMax=${endTime.toISOString()}&` +
      `key=${apiKey}`
    );

    if (!eventsResponse.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const eventsData = await eventsResponse.json();
    const bookedSlots = eventsData.items || [];

    // Generate available 30-minute slots
    const availableSlots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    for (let time = startTime.getTime(); time < endTime.getTime(); time += slotDuration) {
      const slotStart = new Date(time);
      const slotEnd = new Date(time + slotDuration);
      
      // Check if slot conflicts with existing events
      const isBooked = bookedSlots.some((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        return (slotStart < eventEnd && slotEnd > eventStart);
      });

      if (!isBooked) {
        availableSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          display: slotStart.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        });
      }
    }

    return new Response(JSON.stringify({ slots: availableSlots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
