import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClinicalParser, ParsedInvestigation } from "@/lib/clinical-parser";
import { useLimsCatalog } from "./useLimsCatalog";
import React from "react";

export interface HistoricalResult {
  date: string;
  value: number;
  status: ParsedInvestigation['status'];
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

      // Fetch last 5 consultations
      const { data, error } = await supabase
        .from("consultations")
        .select("id, created_at, consultation_data")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const historyMap: Record<string, HistoricalResult[]> = {};

      data.forEach((con) => {
        const investigationsText = (con.consultation_data as any)?.investigations || "";
        if (!investigationsText) return;

        // Use parser to extract values from historical text
        // We pass neutral metadata for history parsing to avoid mismatching based on age-at-the-time
        const parsed = parser.parse(investigationsText);

        parsed.forEach((res) => {
          if (res.value === undefined) return;

          const testName = res.name.toLowerCase();
          if (!historyMap[testName]) {
            historyMap[testName] = [];
          }

          // Avoid duplicates in the same consultation
          if (historyMap[testName].some(h => h.consultationId === con.id)) return;

          historyMap[testName].push({
            date: con.created_at,
            value: res.value,
            status: res.status,
            consultationId: con.id
          });
        });
      });

      return historyMap;
    },
    enabled: !!patientId && !!limsCatalog,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
