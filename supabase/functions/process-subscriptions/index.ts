import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { sendOrderNotification } from "../_shared/order-notification.ts";

serve(async (req) => {
  try {
    // Service role client to bypass RLS and access all subscriptions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch due subscriptions
    const today = new Date().toISOString().split('T')[0];
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_run_date', today);

    if (fetchError) throw fetchError;

    const results = [];

    for (const sub of subscriptions) {
        try {
            // Fetch user/patient details for notification
            // We need patient name/phone. 
            // Assumption: we can get this from 'patients' table using user_id if linked, or we might need to store it in subscription.
            // In the `place-order` function, we didn't store patient details in subscription, just address.
            // Let's improve `place-order` logic later? 
            // No, for now let's try to fetch user metadata or patient record.
            // Since we don't have a direct link, let's look up patient by phone if user has one.
            
            const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(sub.user_id);
            if (userError || !user) {
                console.error(`User not found for subscription ${sub.id}`);
                continue;
            }

            // Construct patient data from user or assumptions
            // Ideally we should have stored patient_name in subscription.
            // Fallback: Use user metadata or just "Valued Customer"
            // Let's check `patients` table using user phone.
            let patientData = {
                name: user.user_metadata?.full_name || 'Customer',
                phone: user.phone || '',
                address: sub.shipping_address || ''
            };

             // Try to find patient record to get better name
             if (user.phone) {
                 const phoneSearch = user.phone.slice(-10);
                 const { data: patients } = await supabaseClient
                    .from('patients')
                    .select('name')
                    .like('phone', `%${phoneSearch}%`)
                    .limit(1);
                 
                 if (patients && patients.length > 0) {
                     patientData.name = patients[0].name;
                 }
             }

            // Calculate Total (sum of item prices)
            // Items in subscription might not have current price. 
            // We should use the price stored in items, or fetch current price.
            // For simplicity, use stored price.
            let total = 0;
            const items = sub.items; // Expecting array of {name, quantity, price}
            if (Array.isArray(items)) {
                total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }

            // 2. Create Order
            const { error: orderError } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: sub.user_id,
                    items: sub.items,
                    total_amount: total,
                    shipping_address: sub.shipping_address,
                    status: 'pending',
                    order_type: 'pharmacy_subscription' // distinct type
                });

            if (orderError) throw orderError;

            // 3. Send Notification
            await sendOrderNotification({
                orderType: 'pharmacy', // Use generic type for email template
                patientData,
                items: sub.items,
                total
            });

            // 4. Update Subscription (Next Run Date)
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + sub.frequency_months);
            
            const { error: updateError } = await supabaseClient
                .from('subscriptions')
                .update({
                    last_run_date: new Date().toISOString(),
                    next_run_date: nextDate.toISOString()
                })
                .eq('id', sub.id);
            
            if (updateError) throw updateError;

            results.push({ id: sub.id, status: 'processed' });

        } catch (err) {
            console.error(`Error processing subscription ${sub.id}:`, err);
            results.push({ id: sub.id, status: 'failed', error: err.message });
        }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
