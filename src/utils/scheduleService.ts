import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { SYSTEM_CONSULTANT_ID } from '../../supabase/functions/_shared/constants.ts';

export { SYSTEM_CONSULTANT_ID };

export type TaskType = 'whatsapp_message' | 'social_post' | 'subscription_reorder';

export interface ScheduleTaskParams {
  task_type: TaskType;
  payload: any;
  scheduled_for: string;
  source?: string;
  consultant_id?: string;
  location?: string;
}

export const scheduleService = {
  async scheduleTask({ task_type, payload, scheduled_for, source, consultant_id }: ScheduleTaskParams) {
    try {
      const { data, error } = await supabase.from('scheduled_tasks').insert({
        task_type,
        payload,
        scheduled_for,
        source,
        consultant_id
      }).select().single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error scheduling task:', error);
      toast.error('Failed to schedule message');
      return { success: false, error };
    }
  },

  async upsertAutoTask(params: ScheduleTaskParams & { source: string }) {
    const { task_type, payload, scheduled_for, source, consultant_id, location } = params;
    
    if (!source || !payload.reference_id) {
      console.error('Auto tasks require a source and payload.reference_id');
      return { success: false };
    }

    try {
      if (!consultant_id) {
        console.warn('No consultant_id provided for auto-task. Skipping for safety.');
        return { success: false, error: 'No consultant ID' };
      }

      const { data: consultant, error: consultantError } = await supabase
        .from('consultants')
        .select('messaging_settings, is_whatsauto_active')
        .eq('id', consultant_id)
        .single();

      if (consultantError) {
        console.warn('Could not verify messaging settings:', consultantError);
        return { success: false, error: 'Settings unknown' };
      }

      const settings = consultant?.messaging_settings as any;
      let isEnabled = false;

      if (source.includes('auto_pharmacy')) {
        isEnabled = settings?.auto_pharmacy ?? false;
      } else if (source.includes('auto_diagnostics')) {
        isEnabled = settings?.auto_diagnostics ?? false;
      } else if (source.includes('auto_post_consultation_followup')) {
        // Global toggle for followups
        const globalFollowup = settings?.auto_followup ?? false;
        // Location override
        if (location && settings?.location_followup_overrides?.[location] !== undefined) {
          isEnabled = settings.location_followup_overrides[location];
        } else {
          isEnabled = globalFollowup;
        }
      } else if (source.includes('discharge_review')) {
        isEnabled = settings?.auto_discharge_review ?? false;
      } else if (source.includes('npo_reminder')) {
        isEnabled = settings?.auto_npo_reminder ?? false;
      }

      if (!isEnabled) {
        console.log(`Auto-messaging is disabled for ${source} (${location || 'global'}). Skipping.`);
        return { success: false, error: 'Disabled' };
      }

      // Clean up existing pending tasks from same source to prevent duplicates
      await supabase.from('scheduled_tasks')
        .delete()
        .eq('source', source)
        .eq('status', 'pending')
        .contains('payload', { reference_id: payload.reference_id });

      // Insert new task
      return await this.scheduleTask(params);
    } catch (e: any) {
      console.error('Error in upsertAutoTask:', e);
      return { success: false, error: e.message };
    }
  },

  async cancelAutoTask(source: string, reference_id: string) {
    try {
      const { error } = await supabase.from('scheduled_tasks')
        .update({ status: 'cancelled' })
        .eq('source', source)
        .eq('status', 'pending')
        .contains('payload', { reference_id });
        
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error canceling auto task:', error);
      return { success: false, error };
    }
  }
};
