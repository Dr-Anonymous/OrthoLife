import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LimsService {
  id: string;
  name: string;
  type: string; // 'test', 'package', 'radiology'
  category: string;
  price?: number;
  market_price?: number;
  details?: string;
  duration?: string;
  result_schema?: any;
  package_content?: any;
}

export interface LimsRange {
  id: string;
  service_id: string;
  parameter_name: string;
  sex: string;
  min_age: number;
  max_age: number;
  age_unit: string;
  low_value?: number;
  high_value?: number;
  critical_low?: number;
  critical_high?: number;
}

export const useLimsCatalog = () => {
  return useQuery({
    queryKey: ["lims-catalog"],
    queryFn: async () => {
      const LIMS_URL = 'https://fkfocqqszalvplvqsskb.supabase.co/functions/v1/export-catalog';
      const res = await fetch(LIMS_URL);
      
      if (!res.ok) {
        throw new Error(`LIMS fetch failed: ${res.status}`);
      }

      const data = await res.json();
      
      const services: LimsService[] = data.services || [];
      const ranges: LimsRange[] = data.ranges || [];

      return { services, ranges };
    },
    staleTime: 1 * 60 * 60 * 1000, // 1 hour (fetch more often now that it's direct)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};
