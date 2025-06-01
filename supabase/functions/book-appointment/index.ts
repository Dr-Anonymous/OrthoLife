import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to decode base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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
  
  // Clean and format the private key
  const privateKeyPem = serviceAccount.private_key
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '');
  
  // Extract the base64 content between the headers
  const keyData = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Import the private key
  const keyBytes = base64ToUint8Array(keyData);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
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
    const { patientData, appointmentData, paymentData } = await req.json();
    console.log('Booking appointment for:', patientData.name, 'at', appointmentData.start);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Determine payment status and method
    const paymentStatus = paymentData.paymentMethod === 'offline' ? 'pending' : 'paid';
    const paymentId = paymentData.paymentId || null;

    // Store patient registration and appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_name: patientData.name,
        patient_email: patientData.email,
        patient_phone: patientData.phone,
        patient_address: patientData.address,
        appointment_date: appointmentData.start,
        appointment_end: appointmentData.end,
        service_type: appointmentData.serviceType,
        payment_id: paymentId,
        payment_status: paymentStatus,
        payment_method: paymentData.paymentMethod || 'online',
        amount: appointmentData.amount,
        status: 'confirmed'
      })
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to store appointment: ${appointmentError.message}`);
    }

    console.log('Appointment stored in database with ID:', appointment.id);

    // Create Google Calendar event using service account
    const accessToken = await getAccessToken();
    
    if (accessToken) {
      console.log('Creating Google Calendar event...');
      
      const calendarId = 'primary';
      const calendarEvent = {
        summary: `Orthopedic Appointment - ${patientData.name}`,
        description: `Patient: ${patientData.name}
Email: ${patientData.email}
Phone: ${patientData.phone}
Address: ${patientData.address}
Service: ${appointmentData.serviceType}
Amount: ₹${appointmentData.amount}
Payment: ${paymentData.paymentMethod === 'offline' ? 'Pay at clinic' : 'Paid online'}
Appointment ID: ${appointment.id}`,
        start: {
          dateTime: appointmentData.start,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: appointmentData.end,
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
            { method: 'email', minutes: 1440 }, // 24 hours before
            { method: 'popup', minutes: 60 },   // 1 hour before
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

      if (calendarResponse.ok) {
        const calendarEventData = await calendarResponse.json();
        console.log('Google Calendar event created:', calendarEventData.id);
        
        // Update appointment record with calendar event ID
        await supabase
          .from('appointments')
          .update({ calendar_event_id: calendarEventData.id })
          .eq('id', appointment.id);
          
      } else {
        const errorText = await calendarResponse.text();
        console.error('Failed to create calendar event:', errorText);
        // Don't fail the appointment booking if calendar creation fails
      }
    } else {
      console.log('No Google Calendar access token available, skipping calendar event creation');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      appointmentId: appointment.id,
      paymentStatus: paymentStatus,
      message: 'Appointment booked successfully!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
