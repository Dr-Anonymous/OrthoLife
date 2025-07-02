import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Set CORS headers as required
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed. Only POST requests are supported."
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 405
    });
  }
  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Updated to match frontend parameter names
    const { order_amount, order_currency = "INR", order_note, customer_details, order_meta, amount, currency, orderNote, customerDetails } = requestBody;
    // Use new parameter names, fallback to old ones for backward compatibility
    const finalAmount = order_amount || amount;
    const finalCurrency = order_currency || currency;
    const finalNote = order_note || orderNote;
    const finalCustomerDetails = customer_details || customerDetails;
    const finalOrderMeta = order_meta;
    // Validate required fields
    if (!finalAmount || finalAmount <= 0) {
      return new Response(JSON.stringify({
        error: "Valid order_amount is required"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    if (!finalCustomerDetails || !finalCustomerDetails.customer_phone) {
      return new Response(JSON.stringify({
        error: "Customer details with customer_phone and customer_email are required"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (finalCustomerDetails.customer_email && !emailRegex.test(finalCustomerDetails.customer_email)) {
      return new Response(JSON.stringify({
        error: "Invalid email format"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Validate phone number (basic validation for Indian numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = finalCustomerDetails.customer_phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(JSON.stringify({
        error: "Invalid phone number format. Please provide a valid 10-digit Indian mobile number"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Get credentials
    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const environment = 'production'; //or sandbox
    if (!clientId || !clientSecret) {
      console.error("[Cashfree] Missing API credentials");
      return new Response(JSON.stringify({
        error: "Cashfree credentials not configured"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Generate unique order ID with better format
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    const orderId = `ORD_${timestamp}_${randomString}`;
    // Create order payload with latest API structure
    const orderPayload = {
      order_id: orderId,
      order_amount: parseFloat(finalAmount).toFixed(2),
      order_currency: finalCurrency,
      order_note: finalNote || "Medical appointment booking",
      customer_details: {
        customer_id: finalCustomerDetails.customer_id || `CUST_${timestamp}`,
        customer_name: finalCustomerDetails.customer_name || "Guest User",
        customer_phone: cleanPhone,
        ...finalCustomerDetails.customer_email && {
          customer_email: finalCustomerDetails.customer_email
        }
      },
      // Add order_meta if provided (for return_url, notify_url, etc.)
      ...finalOrderMeta && {
        order_meta: finalOrderMeta
      },
      // Add order expiry (24 hours from creation)
      order_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    console.log("[Cashfree] Creating order with payload:", JSON.stringify(orderPayload, null, 2));
    // Determine API base URL based on environment
    const baseUrl = environment === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    // Create order with updated API version and headers
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Accept': 'application/json',
        // Add request ID for better debugging
        'x-request-id': `req_${timestamp}_${randomString.toLowerCase()}`
      },
      body: JSON.stringify(orderPayload)
    });
    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      console.error("[Cashfree] Order creation failed:", orderRes.status, errorText);
      let errorMessage = "Failed to create payment order";
      let errorDetails = null;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error_description || errorMessage;
        errorDetails = errorData.details || errorData.errors || null;
        // Handle specific error cases
        if (errorData.type === 'invalid_request_error') {
          errorMessage = `Invalid request: ${errorMessage}`;
        } else if (errorData.type === 'authentication_error') {
          errorMessage = "Authentication failed. Please check your API credentials.";
        }
      } catch (e) {
      // Keep default error message
      }
      return new Response(JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        status_code: orderRes.status
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: orderRes.status >= 500 ? 500 : 400
      });
    }
    let orderData;
    try {
      orderData = await orderRes.json();
    } catch (e) {
      console.error("[Cashfree] Invalid JSON response from order endpoint");
      return new Response(JSON.stringify({
        error: "Invalid response from payment gateway"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log("[Cashfree] Order created successfully:", orderData);
    // Validate order response
    if (!orderData || !orderData.order_id || !orderData.payment_session_id) {
      console.error("[Cashfree] Invalid order response:", orderData);
      return new Response(JSON.stringify({
        error: orderData?.message || "Invalid order response - missing required fields"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Return success response with all necessary data
    const successResponse = {
      order_id: orderData.order_id,
      payment_session_id: orderData.payment_session_id,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      order_status: orderData.order_status,
      order_expiry_time: orderData.order_expiry_time,
      environment: environment,
      created_at: orderData.created_at || new Date().toISOString(),
      status: "success"
    };
    return new Response(JSON.stringify(successResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("[Cashfree] Unexpected error:", error);
    // Don't expose internal errors in production
    const isProduction = Deno.env.get('CASHFREE_ENVIRONMENT') === 'production';
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: isProduction ? "Please contact support" : error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
