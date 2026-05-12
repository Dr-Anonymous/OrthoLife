import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { normalizeSearchText } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  Dot,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { useInvestigationHistory, HistoricalResult } from "@/hooks/useInvestigationHistory";
import { useLimsCatalog } from "@/hooks/useLimsCatalog";
import { format } from "date-fns";
import { Activity, Beaker, Calendar, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClinicalParser } from "@/lib/clinical-parser";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface InvestigationTrendsProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  defaultTestId?: string | null;
}

const chartConfig = {
  value: {
    label: "Result Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const InvestigationTrends: React.FC<InvestigationTrendsProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  defaultTestId,
}) => {
  const { data: historyMap, isLoading: isHistoryLoading } = useInvestigationHistory(patientId);
  const { data: limsCatalog } = useLimsCatalog();
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(defaultTestId || null);

  // Filter for tests that have at least one numeric value
  const trendableTests = React.useMemo(() => {
    if (!historyMap) return [];
    return Object.entries(historyMap)
      .filter(([_, results]) => results.length >= 2)
      .map(([id, results]) => {
        // If id is a composite key (UUID:name), split it
        const [serviceId, ...nameParts] = id.includes(':') ? id.split(':') : [id, ''];
        const service = limsCatalog?.services?.find(s => s.id === serviceId);

        // Use the parser-provided name if possible
        const name = results[0]?.name || service?.name || (nameParts.length > 0 ? nameParts.join(':') : id).charAt(0).toUpperCase() + id.slice(1);
        return { id, name, results };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [historyMap, limsCatalog]);

  // Set initial selected test or sync with prop
  React.useEffect(() => {
    if (isOpen) {
      if (defaultTestId) {
        setSelectedTestId(defaultTestId);
      } else if (trendableTests.length > 0 && !selectedTestId) {
        setSelectedTestId(trendableTests[0].id);
      }
    }
  }, [isOpen, defaultTestId, trendableTests.length]);

  const selectedData = React.useMemo(() => {
    if (!selectedTestId || !historyMap) return [];
    return historyMap[selectedTestId] || [];
  }, [selectedTestId, historyMap]);

  const hasMixedUnits = React.useMemo(() => {
    if (selectedData.length < 2) return false;
    const firstUnit = selectedData[0].unit?.toLowerCase().trim();
    return selectedData.some(r => r.unit?.toLowerCase().trim() !== firstUnit);
  }, [selectedData]);

  const currentRange = React.useMemo(() => {
    if (!selectedTestId || !limsCatalog?.ranges) return null;

    // 1. Split composite key (serviceId:paramName)
    const [serviceId, ...nameParts] = selectedTestId.includes(':') ? selectedTestId.split(':') : [selectedTestId, ''];
    const paramName = nameParts.length > 0 ? nameParts.join(':') : '';

    const parser = new ClinicalParser(limsCatalog.services, limsCatalog.ranges);
    
    // 2. Try centralized findRange first (handles DB rows and basic schema fallback)
    const foundRange = parser.findRange(serviceId, paramName);
    if (foundRange) return foundRange;

    // 3. Advanced Fallback: Direct schema synthesis (mirrors clinical-parser.ts logic with extra robustness)
    const schemaService = limsCatalog.services.find(s => String(s.id) === String(serviceId));
    if (schemaService?.result_schema?.length) {
      const q = normalizeSearchText(paramName || trendableTests.find(t => t.id === selectedTestId)?.name || '');
      const b = normalizeSearchText(q.replace(/\(.*?\)/g, '').trim());
      const c = parser.getCanonicalName(q) || parser.getCanonicalName(b);

      const schemaParam = schemaService.result_schema.find((p: any) => {
        const pName = normalizeSearchText(p.name || '');
        const pCode = normalizeSearchText(p.parameterCode || '');
        const pC = parser.getCanonicalName(pName) || parser.getCanonicalName(pCode);
        return pName === q || pName === b || pCode === q || pCode === b ||
          (c && (pName === c || pCode === c)) || (pC && c && pC === c);
      }) ?? (schemaService.result_schema.length === 1 ? schemaService.result_schema[0] : undefined);

      if (schemaParam) return {
        id: `${schemaService.id}-schema`,
        service_id: String(schemaService.id),
        parameter_name: schemaParam.name || '',
        sex: 'both', 
        min_age: 0, 
        max_age: 999, 
        age_unit: 'years',
        low_value: schemaParam.minLimit,
        high_value: schemaParam.maxLimit,
        critical_low: schemaParam.criticalLow,
        critical_high: schemaParam.criticalHigh,
        display_range: schemaParam.normalRange,
      } as any;
    }

    return null;
  }, [selectedTestId, limsCatalog, trendableTests]);

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const status = payload.status;
    const isAbnormal = status && status !== 'normal' && status !== 'unknown';

    return (
      <Dot
        {...props}
        r={isAbnormal ? 6 : 4}
        fill={isAbnormal ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
        strokeWidth={isAbnormal ? 2 : 1}
        stroke="hsl(var(--background))"
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <DialogTitle>Investigation Trends</DialogTitle>
          </div>
          <DialogDescription>
            Historical laboratory results for <span className="font-semibold text-foreground">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 border-t mt-4">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-muted/50 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Beaker className="w-3.5 h-3.5" />
              Available Tests
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {trendableTests.length > 0 ? (
                  trendableTests.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => setSelectedTestId(test.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex flex-col gap-1",
                        selectedTestId === test.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="font-medium truncate">{test.name}</span>
                      <div className="flex items-center justify-between text-[10px] opacity-80">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {test.results.length} visits
                        </span>
                        {test.results.some(r => r.status && r.status !== 'normal' && r.status !== 'unknown') && (
                          <Badge variant="outline" className="h-3.5 px-1 text-[8px] border-destructive/50 text-destructive bg-destructive/10">
                            Abnormal
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    {isHistoryLoading ? "Loading history..." : "No trendable data found"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          {/* Main Chart Area */}
          <main className="flex-1 flex flex-col bg-background relative">
            {!selectedTestId ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted">
                  <Activity className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm">Select a test from the list to view trends</p>
              </div>
            ) : (
              <>
                <div className="p-6 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">
                        {trendableTests.find(t => t.id === selectedTestId)?.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Viewing results from {selectedData.length} consultation{selectedData.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    {currentRange && (
                      <div className="bg-muted/50 px-3 py-2 rounded-lg border border-border/50 text-right">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                          Reference Range
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          {currentRange.display_range || `${currentRange.low_value} - ${currentRange.high_value}`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {hasMixedUnits && (
                  <div className="mx-6 mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <p>
                      <span className="font-bold">Warning:</span> Mixed units detected in historical data. Trend line may be misleading.
                    </p>
                  </div>
                )}

                {selectedData.length === 0 && (
                  <div className="mx-6 mb-4 p-4 bg-muted/50 border border-border/50 rounded-lg text-xs text-muted-foreground flex items-center gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <p>No historical records found for this test.</p>
                  </div>
                )}

                {selectedData.length === 1 && (
                  <div className="mx-6 mb-4 p-4 bg-muted/50 border border-border/50 rounded-lg text-xs text-muted-foreground flex items-center gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <p>Only one historical record found. A trend line requires at least two consultations.</p>
                  </div>
                )}

                <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
                  {(() => {
                    const hasNumericData = selectedData.filter(r => typeof r.value === 'number').length >= 2;
                    
                    if (hasNumericData) {
                      return (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                          <LineChart
                            data={selectedData}
                            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(val) => format(new Date(val), "MMM d, yy")}
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              dx={-10}
                              domain={['auto', 'auto']}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  labelFormatter={(val) => format(new Date(val), "MMMM d, yyyy")}
                                />
                              }
                            />

                            {(() => {
                              if (!currentRange) return null;

                              let low = currentRange.low_value;
                              let high = currentRange.high_value;

                              // Try to derive from display_range if numbers are missing
                              if (typeof low !== 'number' || typeof high !== 'number') {
                                const rangeStr = (currentRange.display_range || currentRange.normalRange || "").trim().toLowerCase();

                                // Handle "min - max"
                                const rangeMatch = rangeStr.match(/^([0-9.]+)\s*-\s*([0-9.]+)/);
                                if (rangeMatch) {
                                  low = parseFloat(rangeMatch[1]);
                                  high = parseFloat(rangeMatch[2]);
                                } else {
                                  // Handle "< max"
                                  const upToMatch = rangeStr.match(/^(?:<|<=|less than|upto|up to|within)\s*([0-9.]+)/);
                                  if (upToMatch) {
                                    low = 0;
                                    high = parseFloat(upToMatch[1]);
                                  } else {
                                    // Handle "> min"
                                    const moreThanMatch = rangeStr.match(/^(?:>|>=|more than|above|greater than)\s*([0-9.]+)/);
                                    if (moreThanMatch) {
                                      low = parseFloat(moreThanMatch[1]);
                                      high = 1000; // Arbitrary high value for shading
                                    }
                                  }
                                }
                              }

                              if (typeof low === 'number' && typeof high === 'number') {
                                return (
                                  <ReferenceArea
                                    y1={low}
                                    y2={high}
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.05}
                                    stroke="hsl(var(--primary))"
                                    strokeOpacity={0.1}
                                    strokeDasharray="3 3"
                                  />
                                );
                              }
                              return null;
                            })()}

                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2.5}
                              dot={renderCustomDot}
                              activeDot={{ r: 8, strokeWidth: 0 }}
                              animationDuration={1000}
                            />
                          </LineChart>
                        </ChartContainer>
                      );
                    } else if (selectedData.length > 0) {
                      return (
                        <div className="flex-1 overflow-auto border rounded-lg bg-muted/10">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Finding / Value</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {[...selectedData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((res, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  <td className="px-4 py-3 text-xs font-medium">{format(new Date(res.date), "dd MMM, yyyy")}</td>
                                  <td className="px-4 py-3 text-sm">{res.value} <span className="text-[10px] text-muted-foreground">{res.unit}</span></td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] px-1.5 h-5",
                                      res.status === 'normal' && "border-emerald-200 text-emerald-700 bg-emerald-50",
                                      (res.status === 'high' || res.status === 'low') && "border-amber-200 text-amber-700 bg-amber-50",
                                      (res.status === 'critical-high' || res.status === 'critical-low') && "border-rose-200 text-rose-700 bg-rose-50",
                                      res.status === 'unknown' && "border-slate-200 text-slate-500 bg-slate-50"
                                    )}>
                                      {res.status?.toUpperCase() || 'UNKNOWN'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Legend / Info */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>Normal Result</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span>Abnormal Result</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestigationTrends;
