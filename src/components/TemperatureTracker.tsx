import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { notifyConsultant } from '@/lib/consultation-utils';
import { Trash2 } from 'lucide-react';

interface TempEntry {
  value: number;
  timestamp: Date;
}

const TemperatureTracker: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const phone = user?.phoneNumber?.slice(-10);

  const [value, setValue] = useState<string>('98.6');
  const [isLogging, setIsLogging] = useState(false);
  const [history, setHistory] = useState<TempEntry[]>(() => {
    try {
      const saved = localStorage.getItem('tempHistory');
      if (saved) {
        return JSON.parse(saved).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to parse Temp history", error);
    }
    return [];
  });

  // Sync with Supabase if logged in
  useEffect(() => {
    if (phone) {
      const fetchRemoteLogs = async () => {
        const { data, error } = await supabase
          .from('patient_health_logs')
          .select('*')
          .eq('phone', phone)
          .eq('log_type', 'temp')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteHistory = data.map(log => ({
            id: log.id,
            value: (log.value_data as any).value,
            timestamp: new Date(log.created_at),
          }));
          setHistory(remoteHistory);
        }
      };
      fetchRemoteLogs();
    }
  }, [phone]);

  useEffect(() => {
    localStorage.setItem('tempHistory', JSON.stringify(history));
  }, [history]);

  const logTemp = async () => {
    const v = parseFloat(value);
    if (isNaN(v)) return;

    setIsLogging(true);
    const newEntry: TempEntry = {
      value: v,
      timestamp: new Date(),
    };

    // Optimistic update
    setHistory([newEntry, ...history]);

    // Save to Supabase if logged in
    if (phone) {
      try {
        const { data, error } = await supabase.from('patient_health_logs').insert({
          phone,
          log_type: 'temp',
          value_data: { value: v }
        }).select();

        if (error) throw error;

        // Add ID from Supabase to history
        if (data && data.length > 0) {
          setHistory(prev => prev.map((entry, idx) => 
            idx === 0 ? { ...entry, id: data[0].id } : entry
          ));
        }

        toast.success(t('common.success', 'Reading saved successfully'));

        // Check for critical thresholds
        if (v > 102.0) {
          notifyConsultant(supabase, phone, `CRITICAL TEMPERATURE ALERT: Patient logged ${v}°F.`);
        }
      } catch (err) {
        console.error("Error saving Temp log:", err);
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
      
      setHistory(history.filter(entry => (entry as any).id !== logId));
      toast.success(t('common.success', 'Reading deleted'));
    } catch (err) {
      console.error("Error deleting temp log:", err);
      toast.error('Failed to delete. Please try again.');
    }
  };

  const resetHistory = () => {
    setHistory([]);
    localStorage.removeItem('tempHistory');
  };

  const chartData = [...history]
    .slice(0, 10)
    .reverse()
    .map(entry => ({
      time: entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: entry.value,
      fullDate: entry.timestamp.toLocaleString()
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">{t('temp.value')}</label>
              <Input 
                type="number" 
                step="0.1"
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder="98.6"
                className="bg-background"
              />
            </div>
            <Button onClick={logTemp} className="w-full shadow-sm" disabled={isLogging}>
              {isLogging ? t('common.loading', 'Saving...') : t('temp.log')}
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold">{t('temp.history')}</h4>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetHistory} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                  {t('common.reset')}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/10 p-4">
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm p-3 rounded-md bg-background border shadow-sm transition-all hover:border-primary/30">
                      <span className="font-bold text-lg">
                        {entry.value}<span className="text-[10px] ml-1 text-muted-foreground uppercase">{t('temp.unit')}</span>
                      </span>
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
            {history.length > 1 ? (
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
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tick={{ fill: 'currentColor', opacity: 0.6 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                    name={t('temp.value')}
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

export default TemperatureTracker;
