
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
    
    // Define working hours (9 AM to 5 PM)
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(17, 0, 0, 0);

    // Generate available 30-minute slots
    const availableSlots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    // For now, we'll generate slots without checking Google Calendar
    // This provides a working solution while you set up proper Google Calendar OAuth
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

    console.log(`Generated ${availableSlots.length} slots for ${date}`);

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
