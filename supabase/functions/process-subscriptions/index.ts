import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendOrderNotification } from '../_shared/order-notification.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Query active due subscriptions
        const today = new Date().toISOString().split('T')[0]
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('status', 'active')
            .lte('next_run_date', today)

        if (subError) throw subError

        console.log(`Processing ${subscriptions.length} subscriptions`)

        const results = []

        for (const sub of subscriptions) {
            try {
                // 2. Create new order
                // Calculate total amount from items (assuming items have price)
                const items = sub.items
                let totalAmount = 0
                if (Array.isArray(items)) {
                    totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }

                const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .insert([
                        {
                            user_id: sub.user_id,
                            items: sub.items,
                            total_amount: totalAmount,
                            status: 'pending' // or 'processing'
                        }
                    ])
                    .select()
                    .single()

                if (orderError) throw orderError

                // 3. Update next_run_date
                const nextRunDate = new Date(sub.next_run_date)

                let count = 1;
                let unit = sub.frequency;

                if (sub.frequency.includes('-')) {
                    const parts = sub.frequency.split('-');
                    count = parseInt(parts[0]) || 1;
                    unit = parts[1];
                }

                if (unit === 'monthly') {
                    nextRunDate.setMonth(nextRunDate.getMonth() + count)
                } else if (unit === 'weekly') {
                    nextRunDate.setDate(nextRunDate.getDate() + (count * 7))
                }

                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({ next_run_date: nextRunDate.toISOString() })
                    .eq('id', sub.id)

                if (updateError) throw updateError

                // 4. Send Notification
                await sendOrderNotification(order, 'processed')

                results.push({ subscriptionId: sub.id, status: 'success', orderId: order.id })

            } catch (err) {
                console.error(`Error processing subscription ${sub.id}:`, err)
                results.push({ subscriptionId: sub.id, status: 'failed', error: err.message })
            }
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
