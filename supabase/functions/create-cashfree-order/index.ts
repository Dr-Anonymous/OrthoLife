
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

    // Improved secret check
    if (!clientId || !clientSecret) {
      console.error("[Cashfree] Missing API credentials. Provided values:", {
        clientId,
        clientSecret: !!clientSecret ? "set" : "missing"
      });
      return new Response(
        JSON.stringify({ error: "Cashfree credentials not configured in Supabase project secrets." }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Step 1. Get access token from Cashfree
    const tokenRes = await fetch('https://api.cashfree.com/pg/v1/auth/token', {
      method: "POST",
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
    });

    const tokenText = await tokenRes.clone().text();
    let token, tokenErr;
    try {
      const parsedToken = JSON.parse(tokenText);
      token = parsedToken?.data?.token;
      tokenErr = parsedToken?.message || parsedToken?.error;
    } catch (e) {
      token = undefined;
      tokenErr = "Malformed response from Cashfree";
    }

    if (!tokenRes.ok || !token) {
      // Log detailed error
      console.error("[Cashfree] Failed to get access token. Status:", tokenRes.status, "Response:", tokenText);
      return new Response(JSON.stringify({ error: tokenErr || "Failed to get Cashfree access token" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

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

    const orderText = await orderRes.clone().text();
    let order;
    try {
      order = JSON.parse(orderText);
    } catch (e) {
      order = {};
    }

    if (orderRes.status !== 200 || !order.data) {
      console.error("[Cashfree] Failed to create order. Status:", orderRes.status, "Response:", orderText);
      return new Response(JSON.stringify({ error: order.message || "Failed to create Cashfree order" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
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

