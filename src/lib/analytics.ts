import { supabase } from "@/integrations/supabase/client";

type AnalyticsEvent = {
  eventType: string;
  path: string;
  details?: Record<string, unknown>;
};

export const trackEvent = async ({ eventType, path, details }: AnalyticsEvent) => {
  try {
    const { error } = await supabase
      .from("analytics")
      .insert([
        {
          event_type: eventType,
          path,
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