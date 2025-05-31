
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

    // Create Google Calendar event
    const accessToken = Deno.env.get('GOOGLE_CALENDAR_ACCESS_TOKEN');
    
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
      console.log('No Google Calendar access token found, skipping calendar event creation');
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
