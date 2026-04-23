import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface PainEntry {
  level: number;
  timestamp: Date;
}

const PainTracker: React.FC = () => {
  const { t } = useTranslation();
  const { user, selectedPatient } = useAuth();
  const patientId = selectedPatient?.id;

  const [painLevel, setPainLevel] = useState<number>(5);
  const [isLogging, setIsLogging] = useState(false);
  const [painHistory, setPainHistory] = useState<PainEntry[]>(() => {
    try {
      const savedHistory = localStorage.getItem('painHistory');
      if (savedHistory) {
        return JSON.parse(savedHistory).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to parse pain history from localStorage", error);
    }
    return [];
  });

  // Sync with Supabase on mount
  useEffect(() => {
    if (patientId) {
      const fetchRemoteLogs = async () => {
        const { data, error } = await supabase
          .from('patient_health_logs')
          .select('*')
          .eq('patient_id', patientId)
          .eq('log_type', 'pain')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteHistory = data.map(log => ({
            id: log.id,
            level: (log.value_data as any).level,
            timestamp: new Date(log.created_at),
          }));
          setPainHistory(remoteHistory);
        }
      };
      fetchRemoteLogs();
    }
  }, [patientId]);

  useEffect(() => {
    localStorage.setItem('painHistory', JSON.stringify(painHistory));
  }, [painHistory]);

  const logPain = async () => {
    setIsLogging(true);
    const newEntry: PainEntry = {
      level: painLevel,
      timestamp: new Date(),
    };
    
    // Optimistic update
    setPainHistory([newEntry, ...painHistory]);

    // Save to Supabase
    if (patientId) {
      try {
        const { data, error } = await supabase.from('patient_health_logs').insert({
          patient_id: patientId,
          log_type: 'pain',
          value_data: { level: painLevel }
        }).select();

        if (error) throw error;
        
        // Add ID from Supabase to history
        if (data && data.length > 0) {
          setPainHistory(prev => prev.map((entry, idx) => 
            idx === 0 ? { ...entry, id: data[0].id } : entry
          ));
        }

        toast.success(t('common.success', 'Pain level logged successfully'));
      } catch (err) {
        console.error("Error saving pain log:", err);
        toast.error('Failed to sync. Please try again.');
      }
    }
    setIsLogging(false);
  };

  const deleteLog = async (logId: string) => {
    if (!logId) return;
    try {
      const { error } = await supabase
        .from('patient_health_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      setPainHistory(painHistory.filter(entry => (entry as any).id !== logId));
      toast.success(t('common.success', 'Reading deleted'));
    } catch (err) {
      console.error("Error deleting pain log:", err);
      toast.error('Failed to delete. Please try again.');
    }
  };

  const resetHistory = () => {
    setPainHistory([]);
    localStorage.removeItem('painHistory');
  };

  const getPainLevelLabel = (level: number) => {
    if (level <= 3) return t('pain.mild');
    if (level <= 7) return t('pain.moderate');
    return t('pain.severe');
  };

  // Format data for the chart (showing last 10 entries in chronological order)
  const chartData = [...painHistory]
    .slice(0, 10)
    .reverse()
    .map(entry => ({
      time: entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      level: entry.level,
      fullDate: entry.timestamp.toLocaleString()
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-muted/30 p-6 rounded-lg space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-primary">{t('pain.current_level')}</label>
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                  {painLevel} - {getPainLevelLabel(painLevel)}
                </span>
              </div>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[painLevel]}
                onValueChange={(value) => setPainLevel(value[0])}
                className="my-6"
              />
            </div>
            <Button onClick={logPain} className="w-full shadow-md py-6 text-lg font-bold" disabled={isLogging}>
              {isLogging ? t('common.loading', 'Saving...') : t('pain.log_pain')}
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold">{t('pain.history')}</h4>
              {painHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetHistory} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                  {t('common.reset')}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[250px] w-full rounded-md border bg-muted/10 p-4">
              {painHistory.length > 0 ? (
                <div className="space-y-3">
                  {painHistory.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm p-3 rounded-md bg-background border shadow-sm transition-all hover:border-primary/30">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none">
                          {entry.level} <span className="text-xs text-muted-foreground font-normal">/ 10</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{getPainLevelLabel(entry.level)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {entry.timestamp.toLocaleString()}
                        </span>
                        {(entry as any).id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteLog((entry as any).id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <p className="text-sm italic">{t('pain.no_entries')}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold">{t('common.progress')}</h4>
          </div>
          <div className="flex-grow min-h-[350px] w-full border rounded-lg p-4 bg-muted/5 shadow-inner">
            {painHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="time" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.6 }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fill: 'currentColor', opacity: 0.6 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="level" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                    name={t('pain.level')}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground text-center px-4 gap-4">
                <p className="max-w-[200px]">{t('pain.need_more_data')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PainTracker;
