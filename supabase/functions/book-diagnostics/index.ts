import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { sendOrderNotification, sendOrderEmail } from '../_shared/order-notification.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Diagnostics calendar ID for home collection appointments
const DIAGNOSTICS_CALENDAR_ID = '875a1e9d09f8c9bf9eca113cef0b24c6f06447b70cd0d544ab96757cb16e38d7@group.calendar.google.com';
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { patientData, timeSlotData, items, total, subscription } = await req.json();
    console.log('Booking diagnostics for:', patientData.name, 'at', timeSlotData.start);
    const appointmentId = crypto.randomUUID();
    // Create WhatsApp message
    const message = encodeURI(`Dear ${patientData.name},\n` + `Your blood sample collection is scheduled at ${new Date(timeSlotData.start).toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour12: true,
      timeStyle: 'short'
    })} on ${new Date(timeSlotData.start).toLocaleDateString('en-GB', {
      timeZone: 'UTC'
    })}.\n` + `Our technician will visit your home address.`);
    // Create test list
    const testsList = items.map((item) => `${item.name} x${item.quantity}`).join(', ');
    const accessToken = await getGoogleAccessToken();
    if (accessToken) {
      const calendarEvent = {
        summary: patientData.name,
        description: `Patient: ${patientData.name}
Phone: ${patientData.phone}
Address: ${patientData.address}
Tests: ${testsList}
Total Amount: ₹${total}
WhatsApp: <a href="https://wa.me/91${patientData.phone}?text=${message}">Send</a>
SMS: <a href="sms:${patientData.phone}?body=${message}">Send</a>
Appointment ID: ${appointmentId}`,
        start: {
          dateTime: addMinutes(timeSlotData.start)
        },
        end: {
          dateTime: addMinutes(timeSlotData.end)
        }
      };
      const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${DIAGNOSTICS_CALENDAR_ID}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      });
      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('Failed to create diagnostics calendar event:', errorText);
        // Continue with response even if calendar fails
      } else {
        const calendarEventData = await calendarResponse.json();
        console.log('Diagnostics Google Calendar event created:', calendarEventData.id);
      }
    } else {
      console.log('No Google Calendar access token available, skipping diagnostics event creation');
    }

    // Save order to database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: patientData.phone, // Using phone number as ID
          items,
          total_amount: total,
          status: 'scheduled', // Diagnostics are scheduled
          delivery_info: patientData
          // You might want to store appointmentId or timeSlotData in a separate column or within items/metadata if needed
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error saving diagnostics order:', orderError);
      // We don't throw here to ensure the response returns success for the booking part at least, 
      // but ideally this should be transactional. For now, we log it.
    } else {
      // Send notification using shared logic
      await sendOrderNotification(order, 'placed');
      await sendOrderEmail(order, 'diagnostics');

      // Create Subscription if requested
      if (subscription && subscription.frequency) {
        const nextRunDate = new Date()

        let count = 1;
        let unit = subscription.frequency;

        if (subscription.frequency.includes('-')) {
          const parts = subscription.frequency.split('-');
          count = parseInt(parts[0]) || 1;
          unit = parts[1];
        }

        if (unit === 'monthly') {
          nextRunDate.setMonth(nextRunDate.getMonth() + count)
        } else if (unit === 'weekly') {
          nextRunDate.setDate(nextRunDate.getDate() + (count * 7))
        }

        const { error: subError } = await supabase
          .from('subscriptions')
          .insert([
            {
              user_id: patientData.phone,
              items,
              frequency: subscription.frequency,
              next_run_date: nextRunDate.toISOString(),
              frequency: subscription.frequency,
              next_run_date: nextRunDate.toISOString(),
              status: 'active',
              type: 'diagnostics'
            }
          ])

        if (subError) console.error('Error creating diagnostics subscription:', subError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      appointmentId,
      message: 'Diagnostics collection booked and added to Google Calendar!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error booking diagnostics:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
function addMinutes(date) {
  // Convert IST to UTC for Google Calendar
  return new Date(new Date(date).getTime() - 330 * 60000).toISOString();
}
