import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";
import { sendOrderNotification } from "../_shared/order-notification.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const {
      items,
      total,
      patientData,
      subscription
    } = await req.json();

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 1. Create Order
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        items,
        total_amount: total,
        shipping_address: patientData.address,
        status: 'pending',
        order_type: 'pharmacy'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create Subscription (if requested)
    if (subscription && subscription.frequency) {
        // Calculate next run date
        const nextRunDate = new Date();
        nextRunDate.setMonth(nextRunDate.getMonth() + parseInt(subscription.frequency));

        const { error: subError } = await supabaseClient
            .from('subscriptions')
            .insert({
                user_id: user.id,
                items,
                frequency_months: parseInt(subscription.frequency),
                next_run_date: nextRunDate.toISOString(),
                shipping_address: patientData.address,
                status: 'active'
            });

        if (subError) throw subError;
    }

    // 3. Send Notification (Email + WA)
    await sendOrderNotification({
        orderType: 'pharmacy',
        patientData,
        items,
        total
    });

    // 4. Update Stock (Fire and forget, or await)
    // We reuse the existing update-pharmacy-stock function logic
    try {
        const stockUpdateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-pharmacy-stock`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items })
        });
        if (!stockUpdateResponse.ok) {
            console.error('Failed to update stock:', await stockUpdateResponse.text());
        }
    } catch (err) {
        console.error("Stock update failed", err);
    }

    return new Response(JSON.stringify({ success: true, orderId: orderData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
