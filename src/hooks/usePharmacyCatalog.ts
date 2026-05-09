import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MedicineSize {
  size: string;
  stockCount: number;
  inStock: boolean;
  originalName: string;
  id: string;
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  manufacturer?: string;
  dosage?: string;
  packSize?: string;
  prescriptionRequired?: boolean;
  originalPrice?: number;
  stockCount?: number;
  discount?: number;
  isGrouped?: boolean;
  sizes?: MedicineSize[];
  individual?: boolean;
}

export const usePharmacyCatalog = () => {
  return useQuery({
    queryKey: ["pharmacy-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-pharmacy-data');
      if (error) throw error;
      return data?.medicines as Medicine[] || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
