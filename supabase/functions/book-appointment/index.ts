
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert appointment times to proper timezone handling
    const appointmentStart = new Date(appointmentData.start);
    const appointmentEnd = new Date(appointmentData.end);

    console.log('Appointment times:', {
      start: appointmentStart.toISOString(),
      end: appointmentEnd.toISOString(),
      startLocal: appointmentStart.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      endLocal: appointmentEnd.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    });

    // Store appointment in database
    const { data: dbData, error: dbError } = await supabase
      .from('appointments')
      .insert({
        patient_name: patientData.name,
        patient_email: patientData.email,
        patient_phone: patientData.phone,
        patient_address: patientData.address,
        appointment_date: appointmentStart.toISOString(),
        appointment_end: appointmentEnd.toISOString(),
        service_type: appointmentData.serviceType,
        amount: appointmentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_status: paymentStatus,
        status: 'confirmed'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save appointment: ${dbError.message}`);
    }

    console.log('Appointment saved to database:', dbData.id);

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
          dateTime: appointmentStart.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: appointmentEnd.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          {
            email: patientData.email,
            displayName: patientData.name
          }
        ],
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
        
        // Update database with calendar event ID
        await supabase
          .from('appointments')
          .update({ calendar_event_id: calendarEventData.id })
          .eq('id', dbData.id);
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
