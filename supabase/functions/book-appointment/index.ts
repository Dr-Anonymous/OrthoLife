
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientData, appointmentData, paymentData } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

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
        payment_id: paymentData.paymentId,
        payment_status: 'paid',
        amount: appointmentData.amount,
        status: 'confirmed'
      })
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to store appointment: ${appointmentError.message}`);
    }

    // Create Google Calendar event
    const calendarId = 'primary';
    const accessToken = Deno.env.get('GOOGLE_CALENDAR_ACCESS_TOKEN');
    
    if (accessToken) {
      const calendarEvent = {
        summary: `Appointment - ${patientData.name}`,
        description: `Patient: ${patientData.name}\nPhone: ${patientData.phone}\nService: ${appointmentData.serviceType}`,
        start: {
          dateTime: appointmentData.start,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: appointmentData.end,
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          { email: patientData.email }
        ]
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
        console.error('Failed to create calendar event');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      appointmentId: appointment.id,
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
