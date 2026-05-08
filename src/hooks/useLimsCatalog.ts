import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LimsService {
  id: string;
  name: string;
  type: string; // 'test', 'package', 'radiology'
  category: string;
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
      const { data, error } = await supabase
        .from("lims_catalog_cache")
        .select("*");

      if (error) throw error;

      const services: LimsService[] = data
        .filter((item) => item.item_type === "service")
        .map((item) => item.data as LimsService);

      const ranges: LimsRange[] = data
        .filter((item) => item.item_type === "range")
        .map((item) => item.data as LimsRange);

      return { services, ranges };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
};
