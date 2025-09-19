import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderType, patientData, items, total } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const itemsList = items.map((item: any) => `- ${item.displayName} x${item.quantity} - ₹${item.price * item.quantity}`).join('\n');
    const subject = orderType === 'pharmacy' ? 'New Pharmacy Order' : 'New Diagnostics Booking';
    const toEmails = orderType === 'pharmacy' ?
      ["gangrenesoul@gmail.com", "pharmacy@orthosam.com"] :
      ["gangrenesoul@gmail.com", "diagnostics@orthosam.com"];

    const emailResponse = await resend.emails.send({
      from: "OrthoLife <info@updates.ortho.life>",
      to: toEmails,
      reply_to: "info@ortho.life",
      subject: `${subject} - ${patientData.name}`,
      html: `
        <h2>${subject}</h2>
        <h3>Patient Details:</h3>
        <p><strong>Name:</strong> ${patientData.name}</p>
        <p><strong>Phone:</strong> ${patientData.phone}</p>
        <p><strong>Address:</strong> ${patientData.address}</p>
        <h3>${orderType === 'pharmacy' ? 'Medicines Ordered:' : 'Tests Booked:'}</h3>
        <pre>${itemsList}</pre>
        <p><strong>Total Amount:</strong> ₹${total}</p>
        <p><em>This order was placed through the OrthoLife ${orderType} portal.</em></p>
      `
    });
    console.log("Order email sent successfully:", emailResponse);

    if (orderType === 'pharmacy') {
      try {
        const itemsToUpdate = items.map((item: any) => ({ id: item.id, quantity: item.quantity }));
        const { error: stockError } = await supabaseClient.rpc('update_stock', { items_to_update: itemsToUpdate });

        if (stockError) {
          console.error('Failed to update stock:', stockError);
        } else {
          console.log('Stock updated successfully');
        }
      } catch (stockError) {
        console.error('Error updating stock:', stockError);
      }
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error("Error in send-order-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);
