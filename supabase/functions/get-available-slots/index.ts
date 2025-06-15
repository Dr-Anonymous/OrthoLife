import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const CALENDAR_ID = Deno.env.get('GOOGLE_CALENDAR_ID');
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
// Convert IST date to UTC for Google Calendar API
function istToUTC(istDate) {
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}
// Convert UTC date to IST for local display
function utcToIST(utcDate) {
  return new Date(utcDate.getTime() + IST_OFFSET_MS);
}
// Create a date in IST timezone
function createISTDate(dateStr, hours = 0, minutes = 0) {
  const date = new Date(dateStr);
  // Set time in IST
  date.setHours(hours, minutes, 0, 0);
  return date;
}
function generatePotentialSlots(date) {
  //console.log('Generating slots for date:', date);
  // Create start and end times in IST
  const startTime = createISTDate(date, 9, 0); // 9:00 AM IST
  const endTime = createISTDate(date, 20, 0); // 8:00 PM IST
  const potentialSlots = [];
  const slotDuration = 15 * 60 * 1000; // slot duration -- 15 minutes
  for(let time = startTime.getTime(); time < endTime.getTime(); time += slotDuration){
    const slotStart = new Date(time);
    const slotEnd = new Date(time + slotDuration);
    // Skip lunch hour (12:30 PM to 1:30 PM IST)
    const hours = slotStart.getHours();
    const minutes = slotStart.getMinutes();
    if (hours === 12 && minutes >= 30 || hours === 13 && minutes < 30 || hours === 17 || hours === 18 || hours === 19 && minutes < 30) {
      continue;
    }
    // Convert to UTC for Google Calendar API comparison
    const slotStartUTC = istToUTC(slotStart);
    const slotEndUTC = istToUTC(slotEnd);
    potentialSlots.push({
      // Store both IST (for display) and UTC (for API comparison)
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
  //console.log(`Generated ${potentialSlots.length} potential slots`);
  return potentialSlots;
}
async function fetchCalendarEvents(accessToken, date) {
  // Create IST start/end times for the day, then convert to UTC for API
  const dayStartIST = createISTDate(date, 0, 0);
  const dayEndIST = createISTDate(date, 23, 59);
  const timeMin = istToUTC(dayStartIST).toISOString();
  const timeMax = istToUTC(dayEndIST).toISOString();
  //console.log(`Fetching calendar events from ${timeMin} to ${timeMax} (UTC)`);
  //console.log(`IST equivalent: ${dayStartIST.toISOString()} to ${dayEndIST.toISOString()}`);
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?` + `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch calendar events:', errorText);
    throw new Error('Failed to fetch calendar events');
  }
  return await response.json();
}
function filterAvailableSlots(potentialSlots, existingEvents) {
  //console.log(`Checking ${potentialSlots.length} slots against ${existingEvents.length} events`);
  const availableSlots = potentialSlots.filter((slot)=>{
    // Use UTC times for comparison with Google Calendar events
    const slotStartUTC = new Date(slot.startUTC);
    const slotEndUTC = new Date(slot.endUTC);
    const hasConflict = existingEvents.some((event)=>{
      if (!event.start || !event.end) return false;
      // Google Calendar events are already in UTC
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      // Check for overlap
      const overlap = slotStartUTC < eventEnd && slotEndUTC > eventStart;
      if (overlap) {
      //console.log(`Conflict found: Slot ${slot.display} (${slot.startUTC}) conflicts with event "${event.summary}" (${eventStart.toISOString()})`);
      }
      return overlap;
    });
    return !hasConflict;
  });
  // Return only IST times for frontend (remove UTC times)
  return availableSlots.map((slot)=>({
      start: slot.startIST,
      end: slot.endIST,
      display: slot.display
    }));
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { date } = await req.json();
    if (!date) {
      throw new Error('Date is required');
    }
    //console.log('Fetching slots for date:', date);
    // Generate potential slots
    const potentialSlots = generatePotentialSlots(date);
    // Get Google Calendar access token
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      console.log('No Google Calendar access token available, returning all potential slots');
      return new Response(JSON.stringify({
        slots: potentialSlots.map((slot)=>({
            start: slot.startIST,
            end: slot.endIST,
            display: slot.display
          })),
        warning: 'Calendar sync unavailable - all slots shown as available'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch calendar events
    let calendarData;
    try {
      calendarData = await fetchCalendarEvents(accessToken, date);
    } catch (error) {
      console.error('Calendar fetch failed:', error);
      return new Response(JSON.stringify({
        slots: potentialSlots.map((slot)=>({
            start: slot.startIST,
            end: slot.endIST,
            display: slot.display
          })),
        warning: 'Calendar sync failed - all slots shown as available'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const existingEvents = calendarData.items || [];
    //console.log(`Found ${existingEvents.length} existing events`);
    // Filter available slots
    const availableSlots = filterAvailableSlots(potentialSlots, existingEvents);
    //console.log(`Returning ${availableSlots.length} available slots out of ${potentialSlots.length} potential slots`);
    return new Response(JSON.stringify({
      slots: availableSlots,
      totalPotentialSlots: potentialSlots.length,
      existingEventsCount: existingEvents.length
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return new Response(JSON.stringify({
      error: error.message,
      slots: []
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
