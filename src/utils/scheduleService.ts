import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { SYSTEM_CONSULTANT_ID } from '../../supabase/functions/_shared/constants.ts';

export { SYSTEM_CONSULTANT_ID };

export type TaskType = 'whatsapp_message' | 'social_post';

export interface ScheduleTaskParams {
  task_type: TaskType;
  payload: any;
  scheduled_for: string;
  source?: string;
  consultant_id?: string;
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

  async upsertAutoTask({ task_type, payload, scheduled_for, source, consultant_id }: ScheduleTaskParams) {
    if (!source || !payload.reference_id) {
      console.error('Auto tasks require a source and payload.reference_id');
      return { success: false };
    }

    try {
      // Because we have a unique index on (source, payload->>'reference_id') where status = 'pending',
      // we can do an upsert or delete-then-insert.
      // Upsert with ON CONFLICT isn't natively supported on partial indexes easily via PostgREST,
      // so we'll first delete any pending task with the same source and reference_id, then insert.
      
      await supabase.from('scheduled_tasks')
        .delete()
        .eq('source', source)
        .eq('status', 'pending')
        .contains('payload', { reference_id: payload.reference_id });

      // Then insert the new one
      return await this.scheduleTask({ task_type, payload, scheduled_for, source, consultant_id });
      
    } catch (error: any) {
      console.error('Error upserting auto task:', error);
      return { success: false, error };
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
