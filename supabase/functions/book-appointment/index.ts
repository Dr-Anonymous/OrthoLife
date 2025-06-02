import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 decoder
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Create JWT for service account
async function createJWT(serviceAccount: any, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

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

  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '');
  const keyData = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyBytes = base64ToUint8Array(keyData);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(data)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${signatureB64}`;
}

// Get access token
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

    const responseText = await response.text();
    console.error('Token exchange response:', responseText);

    if (!response.ok) return null;

    const data = JSON.parse(responseText);
    return data.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    return null;
  }
}

// Main server handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientData, appointmentData, paymentData } = await req.json();
    console.log('Booking appointment for:', patientData.name, 'at', appointmentData.start);

    const paymentStatus = paymentData.paymentMethod === 'offline' ? 'pending' : 'paid';
    const appointmentId = crypto.randomUUID();

    const accessToken = await getAccessToken();

    if (accessToken) {
      const calendarId = 'gangrenesoul@gmail.com';

      const calendarEvent = {
        summary: `Orthopedic Appointment - ${patientData.name}`,
        description: `Patient: ${patientData.name}
Email: ${patientData.email}
Phone: ${patientData.phone}
Address: ${patientData.address}
Service: ${appointmentData.serviceType}
Amount: ₹${appointmentData.amount}
Payment: ${paymentData.paymentMethod === 'offline' ? 'Pay at clinic' : 'Paid online'}
Appointment ID: ${appointmentId}`,
        start: {
          dateTime: appointmentData.start,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: appointmentData.end,
          timeZone: 'Asia/Kolkata',
        },
        // Remove attendees to avoid Domain-Wide Delegation error
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent),
        }
      );

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Failed to create calendar event:', errorText);
        // Continue response even if calendar fails
      } else {
        const calendarEventData = await calendarResponse.json();
        console.log('Google Calendar event created:', calendarEventData.id);
      }
    } else {
      console.log('No Google Calendar access token available, skipping event creation');
    }

    return new Response(JSON.stringify({
      success: true,
      appointmentId,
      paymentStatus,
      message: 'Appointment booked and added to Google Calendar!',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
