import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderType: 'pharmacy' | 'diagnostics';
  patientData: {
    name: string;
    phone: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderType, patientData, items, total }: OrderEmailRequest = await req.json();

    const itemsList = items.map(item => 
      `- ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`
    ).join('\n');

    const subject = orderType === 'pharmacy' ? 'New Pharmacy Order' : 'New Diagnostics Booking';
    
    const emailResponse = await resend.emails.send({
      from: "OrthoLife <onboarding@resend.dev>",
      to: ["info@ortho.life"],
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
      `,
    });

    console.log("Order email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);