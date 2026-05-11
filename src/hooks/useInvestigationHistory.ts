import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClinicalParser, ParsedInvestigation } from "@/lib/clinical-parser";
import { useLimsCatalog } from "./useLimsCatalog";
import React from "react";

export interface HistoricalResult {
  date: string;
  value: number | string;
  status: ParsedInvestigation['status'];
  name: string;
  unit?: string;
  consultationId: string;
}

export const useInvestigationHistory = (patientId: string | undefined) => {
  const { data: limsCatalog } = useLimsCatalog();
  
  const parser = React.useMemo(() => 
    new ClinicalParser(limsCatalog?.services || [], limsCatalog?.ranges || []), 
    [limsCatalog]
  );

  return useQuery({
    queryKey: ["investigation-history", patientId],
    queryFn: async () => {
      if (!patientId) return {};

      // Fetch last 15 consultations for better trend-line density
      const { data, error } = await supabase
        .from("consultations")
        .select("id, created_at, consultation_data, investigations")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      const historyMap: Record<string, HistoricalResult[]> = {};

      // Process from oldest to newest for the graph
      const reversedData = [...data].reverse();

      reversedData.forEach((con) => {
        const investigationsText = (con as any).investigations ?? "";
        if (!investigationsText) return;

        const parsed = parser.parse(investigationsText);

        parsed.forEach((res) => {
          if (res.value === undefined || res.value === null) return;

          // Use a composite key of serviceId and name for unique tracking, especially for packages
          const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();
          
          if (!historyMap[groupKey]) {
            historyMap[groupKey] = [];
          }

          if (historyMap[groupKey].some(h => h.consultationId === con.id)) return;

          historyMap[groupKey].push({
            date: con.created_at,
            name: res.name,
            value: res.value,
            unit: res.unit,
            status: res.status,
            consultationId: con.id
          });
        });
      });

      return historyMap;
    },
    enabled: !!patientId && !!limsCatalog,
    staleTime: 5 * 60 * 1000,
  });
};
