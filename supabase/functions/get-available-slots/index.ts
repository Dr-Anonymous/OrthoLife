
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

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
    
    // Parse the date as YYYY-MM-DD and create it in Indian timezone
    const [year, month, day] = date.split('-').map(Number);
    
    // Create the date at midnight in Indian timezone
    // Indian timezone is UTC+5:30, so we need to subtract 5.5 hours to get UTC
    const selectedDateIST = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    // Convert to UTC by adjusting for Indian timezone offset
    const selectedDateUTC = new Date(selectedDateIST.getTime() - (5.5 * 60 * 60 * 1000));
    
    // Define working hours in UTC (9 AM to 5 PM IST = 3:30 AM to 11:30 AM UTC)
    const startTimeUTC = new Date(selectedDateUTC);
    startTimeUTC.setUTCHours(3, 30, 0, 0); // 9:00 AM IST = 3:30 AM UTC
    
    const endTimeUTC = new Date(selectedDateUTC);
    endTimeUTC.setUTCHours(11, 30, 0, 0); // 5:00 PM IST = 11:30 AM UTC

    console.log('Working hours in UTC:', startTimeUTC.toISOString(), 'to', endTimeUTC.toISOString());

    // Generate potential 30-minute slots
    const potentialSlots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    for (let time = startTimeUTC.getTime(); time < endTimeUTC.getTime(); time += slotDuration) {
      const slotStartUTC = new Date(time);
      const slotEndUTC = new Date(time + slotDuration);
      
      // Convert to IST for display and lunch hour check
      const slotStartIST = new Date(slotStartUTC.getTime() + (5.5 * 60 * 60 * 1000));
      
      // Skip lunch hour (12:30 PM to 1:30 PM IST)
      if ((slotStartIST.getHours() === 12 && slotStartIST.getMinutes() >= 30) ||
          (slotStartIST.getHours() === 13 && slotStartIST.getMinutes() < 30)) {
        continue;
      }

      potentialSlots.push({
        start: slotStartUTC.toISOString(),
        end: slotEndUTC.toISOString(),
        display: slotStartIST.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })
      });
    }

    console.log(`Generated ${potentialSlots.length} potential slots`);

    // Get Google Calendar access token using shared utility
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      console.log('No Google Calendar access token available, returning all potential slots');
      return new Response(JSON.stringify({ slots: potentialSlots }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch events from Google Calendar for the specified date
    const calendarId = 'primary';
    const timeMin = startTimeUTC.toISOString();
    const timeMax = endTimeUTC.toISOString();

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
      const errorText = await calendarResponse.text();
      console.error('Failed to fetch calendar events:', errorText);
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
