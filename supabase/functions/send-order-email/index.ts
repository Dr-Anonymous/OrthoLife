import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.5.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { orderType, patientData, items, total } = await req.json();
    const itemsList = items.map((item)=>`- ${item.displayName} x${item.quantity} - ₹${item.price * item.quantity}`).join('\n');
    const subject = orderType === 'pharmacy' ? 'New Pharmacy Order' : 'New Diagnostics Booking';
    const toEmails = orderType === 'pharmacy' ? [
      "gangrenesoul@gmail.com",
      "pharmacy@orthosam.com"
    ] : [
      "gangrenesoul@gmail.com",
      "diagnostics@orthosam.com"
    ];
    // Send email first
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
    // Update stock for pharmacy orders
    if (orderType === 'pharmacy') {
      try {
        const stockUpdateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-pharmacy-stock`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items
          })
        });
        if (!stockUpdateResponse.ok) {
          console.error('Failed to update stock:', await stockUpdateResponse.text());
        } else {
          console.log('Stock updated successfully');
        }
      } catch (stockError) {
        console.error('Error updating stock:', stockError);
      // Don't fail the whole request if stock update fails
      }
    }
    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-order-email function:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
serve(handler);
