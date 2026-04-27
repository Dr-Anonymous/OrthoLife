import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendOrderNotification, sendOrderEmail } from '../_shared/order-notification.ts'

import { SYSTEM_CONSULTANT_ID } from '../_shared/constants.ts'

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

        const { userId, items, totalAmount, subscription, patientData } = await req.json()

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
                    status: 'pending',
                    delivery_info: patientData,
                    type: 'pharmacy'
                }
            ])
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Create Subscription if requested
        if (subscription && subscription.frequency) {
            const nextRunDate = new Date()

            let count = 1;
            let unit = subscription.frequency;

            if (subscription.frequency.includes('-')) {
                const parts = subscription.frequency.split('-');
                count = parseInt(parts[0]) || 1;
                unit = parts[1];
            }

            if (unit === 'monthly') {
                nextRunDate.setMonth(nextRunDate.getMonth() + count)
            } else if (unit === 'weekly') {
                nextRunDate.setDate(nextRunDate.getDate() + (count * 7))
            }

            const { data: subscriptionData, error: subError } = await supabase
                .from('subscriptions')
                .insert([
                    {
                        user_id: userId,
                        items,
                        frequency: subscription.frequency,
                        next_run_date: nextRunDate.toISOString(),
                        status: 'active',
                        type: 'pharmacy'
                    }
                ])
                .select()
                .single()

            if (subError) {
                console.error('Error creating subscription:', subError)
            } else {
                // Check if auto-messaging is active for the system consultant before scheduling
                const { data: systemConsultant } = await supabase
                    .from('consultants')
                    .select('is_whatsauto_active, messaging_settings')
                    .eq('id', SYSTEM_CONSULTANT_ID)
                    .single();

                const isAutoMessagingEnabled = (systemConsultant?.messaging_settings as any)?.auto_pharmacy ?? false;

                if (isAutoMessagingEnabled && systemConsultant?.is_whatsauto_active) {
                    // Also create a scheduled task for the next run
                    const itemsList = items.map((item: any) => `${item.name} x${item.quantity}`).join(', ');
                    const reorderMessage = `Hello, this is an automated reminder that your recurring pharmacy order is due: \n\nItems: ${itemsList}\n\nPlease contact us to confirm delivery.`;
                    
                    const source = `auto_pharmacy_reorder:${userId}`;
                    
                    // Clean up existing pending reorder tasks for this user to prevent duplicates
                    await supabase.from('scheduled_tasks')
                        .delete()
                        .eq('source', source)
                        .eq('status', 'pending');

                    await supabase.from('scheduled_tasks').insert({
                        task_type: 'subscription_reorder',
                        scheduled_for: nextRunDate.toISOString(),
                        consultant_id: SYSTEM_CONSULTANT_ID,
                        payload: {
                            subscription_id: subscriptionData.id,
                            patient_phone: patientData.phone,
                            message: reorderMessage,
                            consultant_id: 'general_notifications',
                            reference_id: userId
                        },
                        source
                    });
                }
            }
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
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

