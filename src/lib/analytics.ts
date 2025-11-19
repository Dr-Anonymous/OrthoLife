import { supabase } from "@/integrations/supabase/client";

type AnalyticsEvent = {
  eventType: string;
  path: string;
  user_phone?: string | null;
  user_name?: string | null;
  details?: Record<string, unknown>;
};

export const trackEvent = async ({ eventType, path, user_phone, user_name, details }: AnalyticsEvent) => {
  try {
    const { error } = await supabase
      .from("analytics")
      .insert([
        {
          event_type: eventType,
          path,
          user_phone,
          user_name,
          details,
        },
      ]);

    if (error) {
      console.error("Error logging analytics event:", error);
    }
  } catch (error) {
    console.error("Error in trackEvent function:", error);
  }
};