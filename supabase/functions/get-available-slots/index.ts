
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
    console.log('Fetching slots for date:', date);
    
    // Define working hours (9 AM to 5 PM)
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(17, 0, 0, 0);

    // Generate potential 30-minute slots
    const potentialSlots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    for (let time = startTime.getTime(); time < endTime.getTime(); time += slotDuration) {
      const slotStart = new Date(time);
      const slotEnd = new Date(time + slotDuration);
      
      // Skip lunch hour (12:30 PM to 1:30 PM)
      if (slotStart.getHours() === 12 && slotStart.getMinutes() >= 30) {
        continue;
      }
      if (slotStart.getHours() === 13 && slotStart.getMinutes() < 30) {
        continue;
      }

      potentialSlots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        display: slotStart.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      });
    }

    // Get Google Calendar access token
    const accessToken = Deno.env.get('GOOGLE_CALENDAR_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.log('No Google Calendar access token found, returning all potential slots');
      return new Response(JSON.stringify({ slots: potentialSlots }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch events from Google Calendar for the specified date
    const calendarId = 'primary';
    const timeMin = startTime.toISOString();
    const timeMax = endTime.toISOString();

    console.log('Checking Google Calendar from', timeMin, 'to', timeMax);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!calendarResponse.ok) {
      console.error('Failed to fetch calendar events:', await calendarResponse.text());
      // Fallback to returning all potential slots if calendar check fails
      return new Response(JSON.stringify({ slots: potentialSlots }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarData = await calendarResponse.json();
    const existingEvents = calendarData.items || [];
    
    console.log(`Found ${existingEvents.length} existing events`);

    // Filter out slots that conflict with existing calendar events
    const availableSlots = potentialSlots.filter(slot => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);

      // Check if this slot conflicts with any existing event
      const hasConflict = existingEvents.some(event => {
        if (!event.start || !event.end) return false;
        
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        // Check for overlap: slot starts before event ends AND slot ends after event starts
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      return !hasConflict;
    });

    console.log(`Generated ${availableSlots.length} available slots out of ${potentialSlots.length} potential slots`);

    return new Response(JSON.stringify({ slots: availableSlots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      slots: [] // Return empty slots array as fallback
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
