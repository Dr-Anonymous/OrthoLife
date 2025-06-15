
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Set CORS headers as required
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = "INR", orderNote, customerDetails } = await req.json();

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error("Cashfree credentials not configured");
    }

    // Step 1. Get access token from Cashfree
    const tokenRes = await fetch('https://api.cashfree.com/pg/v1/auth/token', {
      method: "POST",
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to get Cashfree access token");
    }
    const { data: { token } = {} } = await tokenRes.json();

    // Step 2. Create order
    const orderPayload = {
      order_id: "ORD_" + Date.now(),
      order_amount: amount,
      order_currency: currency,
      order_note: orderNote || "appointment_booking",
      customer_details: customerDetails,
    };

    const orderRes = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });
    const order = await orderRes.json();

    if (orderRes.status !== 200 || !order.data) {
      throw new Error(order.message || "Failed to create Cashfree order");
    }

    return new Response(JSON.stringify({
      orderId: order.data.order_id,
      paymentSessionId: order.data.payment_session_id,
      orderAmount: order.data.order_amount,
      currency: order.data.order_currency
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating Cashfree order:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
