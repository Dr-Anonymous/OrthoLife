import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendOrderNotification, sendOrderEmail } from '../_shared/order-notification.ts'

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

        const { userId, items, totalAmount, subscription } = await req.json()

        if (!userId || !items || !totalAmount) {
            throw new Error('Missing required fields')
        }

        // 1. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    user_id: userId,
                    items,
                    total_amount: totalAmount,
                    status: 'pending'
                }
            ])
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Create Subscription if requested
        if (subscription && subscription.frequency) {
            const nextRunDate = new Date()
            // Simple logic for next run date based on frequency
            if (subscription.frequency === 'monthly') {
                nextRunDate.setMonth(nextRunDate.getMonth() + 1)
            } else if (subscription.frequency === 'weekly') {
                nextRunDate.setDate(nextRunDate.getDate() + 7)
            }
            // Add more frequencies as needed

            const { error: subError } = await supabase
                .from('subscriptions')
                .insert([
                    {
                        user_id: userId,
                        items,
                        frequency: subscription.frequency,
                        next_run_date: nextRunDate.toISOString(),
                        status: 'active'
                    }
                ])

            if (subError) console.error('Error creating subscription:', subError)
        }

        // 3. Send Notification
        await sendOrderNotification(order, 'placed')
        await sendOrderEmail(order, 'pharmacy')

        // 4. Update Pharmacy Stock
        const { error: stockError } = await supabase.functions.invoke('update-pharmacy-stock', {
            body: { items }
        })

        if (stockError) {
            console.error('Error updating pharmacy stock:', stockError)
            // We don't fail the order if stock update fails, but we log it
        }

        return new Response(
            JSON.stringify({ success: true, order }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
