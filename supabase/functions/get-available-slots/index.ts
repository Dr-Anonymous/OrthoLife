
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to generate JWT for service account
async function createJWT(serviceAccount: any, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${headerB64}.${payloadB64}`;
  
  // Import the private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(privateKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    encoder.encode(data)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${signatureB64}`;
}

// Function to get access token using service account
async function getAccessToken(): Promise<string | null> {
  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      console.log('No service account key found');
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    const jwt = await createJWT(serviceAccount, scopes);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      console.error('Failed to get access token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    return null;
  }
}

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

    // Get Google Calendar access token using service account
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.log('No Google Calendar access token available, returning all potential slots');
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
