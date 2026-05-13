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
  criticalAlert?: string;
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
        .select("id, created_at, investigations, radiology_findings, investigations_parsed, parser_version, consultation_data")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      const historyMap: Record<string, HistoricalResult[]> = {};

      // Process from oldest to newest for the graph
      const reversedData = [...data].reverse();

      reversedData.forEach((con: any) => {
        let parsed: ParsedInvestigation[] = [];
        
        // Use pre-parsed structured data if available (Phase 5 Optimization)
        if (con.investigations_parsed && Array.isArray(con.investigations_parsed) && con.parser_version >= 1) {
          parsed = con.investigations_parsed;
        } else {
          // Fallback to on-the-fly parsing for legacy or unsynced records
          const investigationsText = con.investigations ?? con.consultation_data?.investigations ?? "";
          const radiologyText = con.radiology_findings ?? con.consultation_data?.radiology_findings ?? "";
          const combinedText = investigationsText + "\n" + radiologyText;
          if (!combinedText.trim()) return;
          parsed = parser.parse(combinedText);
        }

        parsed.forEach((res) => {
          if (res.value === undefined || res.value === null || res.value === '-') return;

          // Use a composite key of serviceId and name for unique tracking
          const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();

          if (!historyMap[groupKey]) {
            historyMap[groupKey] = [];
          }

          // Handle Historical Dates: Prioritize res.date (from header) over con.created_at
          let effectiveDate = con.created_at;
          if (res.date) {
            try {
              // Convert DD/MM/YYYY or DD-MM-YYYY to ISO for consistent sorting
              const parts = res.date.split(/[/.-]/);
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                let year = parseInt(parts[2]);
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                if (!isNaN(d.getTime())) {
                  // Set time to match consultation or just midnight
                  effectiveDate = d.toISOString();
                }
              }
            } catch (e) {
              console.warn('Failed to parse historical date header:', res.date);
            }
          }

          if (historyMap[groupKey].some(h => h.consultationId === con.id && h.date === effectiveDate)) return;

          historyMap[groupKey].push({
            date: effectiveDate,
            name: res.name,
            value: res.value,
            unit: res.unit,
            status: res.status,
            criticalAlert: res.criticalAlert,
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
