import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppMessage } from "../_shared/whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call RPC to atomically claim tasks
    const { data: tasks, error: fetchError } = await supabase.rpc('claim_scheduled_tasks', { batch_size: 20 });

    if (fetchError) throw fetchError;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "No tasks to process" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-scheduled-tasks] Claimed ${tasks.length} tasks...`);

    const results = [];

    for (const task of tasks) {
      console.log(`[process-scheduled-tasks] Executing task ${task.id} (${task.task_type}), attempt ${task.attempts}/${task.max_attempts}`);
      try {
        let taskResult = task.result || {};

        if (task.task_type === 'whatsapp_message') {
          const { number, message, media_url } = task.payload;
          const consultant_id = task.consultant_id || task.payload.consultant_id;
          const result = await sendWhatsAppMessage(number, message, consultant_id, media_url);
          if (!result) throw new Error("Failed to send WhatsApp message via shared helper.");

          taskResult = { ...taskResult, whatsapp: 'success' };

          await supabase.from('scheduled_tasks').update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            error: null,
            result: taskResult
          }).eq('id', task.id);
          results.push({ id: task.id, status: 'completed' });
        }
        else if (task.task_type === 'subscription_reorder') {
          const { subscription_id, patient_phone, message, consultant_id, reference_id } = task.payload;

          // 1. Process the subscription (creates order and advances date)
          const subResponse = await fetch(`${supabaseUrl}/functions/v1/process-subscriptions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ subscriptionId: subscription_id })
          });

          if (!subResponse.ok) {
            const errText = await subResponse.text();
            throw new Error(`process-subscriptions failed: ${errText}`);
          }

          const subRes = await subResponse.json();
          const subResult = subRes.results?.[0];

          if (!subResult || subResult.status !== 'success') {
            throw new Error(`Failed to process subscription ${subscription_id}`);
          }

          // 2. Send the WhatsApp reminder for the current order
          const waResult = await sendWhatsAppMessage(patient_phone, message, consultant_id);
          if (!waResult) {
            console.error(`[process-scheduled-tasks] WhatsApp reminder failed for subscription ${subscription_id}, but order was created.`);
          }

          // 3. Schedule the NEXT reorder task for the next run date (if enabled)
          if (subResult.nextRunDate) {
            // Check if auto-messaging is still enabled for this specific task type
            const { data: consultant, error: consultantError } = await supabase
              .from('consultants')
              .select('messaging_settings, is_whatsauto_active')
              .eq('id', task.consultant_id)
              .single();

            const settings = (consultant?.messaging_settings as any) || {};
            const isPharmacy = task.source?.includes('auto_pharmacy');
            const isDiagnostics = task.source?.includes('auto_diagnostics');

            const isEnabled = isPharmacy ? (settings.auto_pharmacy ?? false)
              : isDiagnostics ? (settings.auto_diagnostics ?? false)
                : false;

            if (!consultantError && isEnabled && consultant?.is_whatsauto_active) {
              await supabase.from('scheduled_tasks').insert({
                task_type: 'subscription_reorder',
                scheduled_for: subResult.nextRunDate,
                consultant_id: task.consultant_id,
                source: task.source,
                payload: {
                  ...task.payload,
                  scheduled_at: subResult.nextRunDate
                }
              });
              console.log(`[process-scheduled-tasks] Scheduled next reorder (${isPharmacy ? 'pharmacy' : 'diagnostics'}) for ${task.consultant_id} on ${subResult.nextRunDate}`);
            } else {
              console.log(`[process-scheduled-tasks] Auto-messaging disabled or WhatsApp inactive for ${task.consultant_id}. NOT scheduling next reorder.`);
            }
          }

          await supabase.from('scheduled_tasks').update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            error: null,
            result: { order_id: subResult.orderId, whatsapp: waResult ? 'success' : 'failed' }
          }).eq('id', task.id);
          results.push({ id: task.id, status: 'completed' });
        }
        else if (task.task_type === 'social_post') {
          // Pass the existing result to social-publish so it skips successful platforms
          const payloadWithSkip = {
            ...task.payload,
            skipPlatforms: Object.keys(taskResult).filter(k => taskResult[k] === 'success')
          };

          const response = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify(payloadWithSkip)
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`social-publish failed: ${errText}`);
          }

          const publishRes = await response.json();
          // Merge results
          publishRes.results?.forEach((r: any) => {
            if (r.success) taskResult[r.platform] = 'success';
            else taskResult[r.platform] = 'failed';
          });

          // Check if any failed
          const anyFailed = publishRes.results?.some((r: any) => !r.success);
          if (anyFailed) {
            // Update partial results but throw error to retry
            await supabase.from('scheduled_tasks').update({ result: taskResult }).eq('id', task.id);
            throw new Error(`Partial failure in social-publish`);
          }

          await supabase.from('scheduled_tasks').update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            error: null,
            result: taskResult
          }).eq('id', task.id);
          results.push({ id: task.id, status: 'completed' });
        }
      } catch (err: any) {
        console.error(`[process-scheduled-tasks] Task ${task.id} failed:`, err.message);
        const newStatus = task.attempts >= task.max_attempts ? 'failed' : 'pending';

        await supabase.from('scheduled_tasks').update({
          status: newStatus,
          error: err.message,
          updated_at: new Date().toISOString()
        }).eq('id', task.id);

        results.push({ id: task.id, status: newStatus, error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("[process-scheduled-tasks] Fatal error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
