import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Diagnostics calendar ID for home collection appointments
const DIAGNOSTICS_CALENDAR_ID = '875a1e9d09f8c9bf9eca113cef0b24c6f06447b70cd0d544ab96757cb16e38d7@group.calendar.google.com';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

// Convert IST date to UTC for Google Calendar API
function istToUTC(istDate: Date): Date {
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}

// Convert UTC date to IST for local display
function utcToIST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + IST_OFFSET_MS);
}

// Create a date in IST timezone
function createISTDate(dateStr: string, hours = 0, minutes = 0): Date {
  const date = new Date(dateStr);
  // Set time in IST
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function generatePotentialSlots(date: string) {
  console.log('Generating diagnostics slots for date:', date);
  
  // Create start and end times in IST (for home collection: 7 AM to 11 AM and 4 PM to 7 PM)
  const morningStartTime = createISTDate(date, 7, 0); // 7:00 AM IST
  const morningEndTime = createISTDate(date, 11, 0); // 11:00 AM IST
  const eveningStartTime = createISTDate(date, 16, 0); // 4:00 PM IST
  const eveningEndTime = createISTDate(date, 19, 0); // 7:00 PM IST
  
  const potentialSlots = [];
  const slotDuration = 30 * 60 * 1000; // 30 minutes duration for home collection
  
  // Generate morning slots
  for (let time = morningStartTime.getTime(); time < morningEndTime.getTime(); time += slotDuration) {
    const slotStart = new Date(time);
    const slotEnd = new Date(time + slotDuration);
    
    // Convert to UTC for Google Calendar API comparison
    const slotStartUTC = istToUTC(slotStart);
    const slotEndUTC = istToUTC(slotEnd);
    
    potentialSlots.push({
      startIST: slotStart.toISOString(),
      endIST: slotEnd.toISOString(),
      startUTC: slotStartUTC.toISOString(),
      endUTC: slotEndUTC.toISOString(),
      display: slotStart.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    });
  }
  
  // Generate evening slots
  for (let time = eveningStartTime.getTime(); time < eveningEndTime.getTime(); time += slotDuration) {
    const slotStart = new Date(time);
    const slotEnd = new Date(time + slotDuration);
    
    // Convert to UTC for Google Calendar API comparison
    const slotStartUTC = istToUTC(slotStart);
    const slotEndUTC = istToUTC(slotEnd);
    
    potentialSlots.push({
      startIST: slotStart.toISOString(),
      endIST: slotEnd.toISOString(),
      startUTC: slotStartUTC.toISOString(),
      endUTC: slotEndUTC.toISOString(),
      display: slotStart.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    });
  }
  
  console.log(`Generated ${potentialSlots.length} potential diagnostics slots`);
  return potentialSlots;
}

async function fetchCalendarEvents(accessToken: string, date: string) {
  // Create IST start/end times for the day, then convert to UTC for API
  const dayStartIST = createISTDate(date, 0, 0);
  const dayEndIST = createISTDate(date, 23, 59);
  
  const timeMin = istToUTC(dayStartIST).toISOString();
  const timeMax = istToUTC(dayEndIST).toISOString();
  
  console.log(`Fetching diagnostics calendar events from ${timeMin} to ${timeMax} (UTC)`);
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${DIAGNOSTICS_CALENDAR_ID}/events?` +
    `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch diagnostics calendar events:', errorText);
    throw new Error('Failed to fetch diagnostics calendar events');
  }

  return await response.json();
}

function filterAvailableSlots(potentialSlots: any[], existingEvents: any[]) {
  console.log(`Checking ${potentialSlots.length} diagnostics slots against ${existingEvents.length} events`);
  
  const availableSlots = potentialSlots.filter((slot) => {
    // Use UTC times for comparison with Google Calendar events
    const slotStartUTC = new Date(slot.startUTC);
    const slotEndUTC = new Date(slot.endUTC);
    
    const hasConflict = existingEvents.some((event) => {
      if (!event.start || !event.end) return false;
      
      // Google Calendar events are already in UTC
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      // Check for overlap
      const overlap = slotStartUTC < eventEnd && slotEndUTC > eventStart;
      
      if (overlap) {
        console.log(`Conflict found: Slot ${slot.display} (${slot.startUTC}) conflicts with event "${event.summary}" (${eventStart.toISOString()})`);
      }
      
      return overlap;
    });
    
    return !hasConflict;
  });

  // Return only IST times for frontend (remove UTC times)
  return availableSlots.map((slot) => ({
    start: slot.startIST,
    end: slot.endIST,
    display: slot.display
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date } = await req.json();
    
    if (!date) {
      throw new Error('Date is required');
    }

    console.log('Fetching diagnostics slots for date:', date);

    // Generate potential slots for diagnostics
    const potentialSlots = generatePotentialSlots(date);

    // Get Google Calendar access token
    const accessToken = await getGoogleAccessToken();
    
    if (!accessToken) {
      console.log('No Google Calendar access token available, returning all potential diagnostics slots');
      return new Response(JSON.stringify({
        slots: potentialSlots.map((slot) => ({
          start: slot.startIST,
          end: slot.endIST,
          display: slot.display
        })),
        warning: 'Calendar sync unavailable - all slots shown as available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch calendar events
    let calendarData;
    try {
      calendarData = await fetchCalendarEvents(accessToken, date);
    } catch (error) {
      console.error('Diagnostics calendar fetch failed:', error);
      return new Response(JSON.stringify({
        slots: potentialSlots.map((slot) => ({
          start: slot.startIST,
          end: slot.endIST,
          display: slot.display
        })),
        warning: 'Calendar sync failed - all slots shown as available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const existingEvents = calendarData.items || [];
    console.log(`Found ${existingEvents.length} existing diagnostics events`);

    // Filter available slots
    const availableSlots = filterAvailableSlots(potentialSlots, existingEvents);
    
    console.log(`Returning ${availableSlots.length} available diagnostics slots out of ${potentialSlots.length} potential slots`);

    return new Response(JSON.stringify({
      slots: availableSlots,
      totalPotentialSlots: potentialSlots.length,
      existingEventsCount: existingEvents.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching available diagnostics slots:', error);
    return new Response(JSON.stringify({
      error: error.message,
      slots: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});