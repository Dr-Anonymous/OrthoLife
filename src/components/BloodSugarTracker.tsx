import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface SugarEntry {
  level: number;
  type: string;
  timestamp: Date;
}

const BloodSugarTracker: React.FC = () => {
  const { t } = useTranslation();
  const { user, selectedPatient } = useAuth();
  const patientId = selectedPatient?.id;

  const [level, setLevel] = useState<string>('100');
  const [type, setType] = useState<string>('random');
  const [isLogging, setIsLogging] = useState(false);
  const [history, setHistory] = useState<SugarEntry[]>(() => {
    try {
      const saved = localStorage.getItem('sugarHistory');
      if (saved) {
        return JSON.parse(saved).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to parse Sugar history", error);
    }
    return [];
  });

  // Sync with Supabase if logged in
  useEffect(() => {
    if (patientId) {
      const fetchRemoteLogs = async () => {
        const { data, error } = await supabase
          .from('patient_health_logs')
          .select('*')
          .eq('patient_id', patientId)
          .eq('log_type', 'sugar')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteHistory = data.map(log => ({
            id: log.id,
            level: (log.value_data as any).level,
            type: (log.value_data as any).type,
            timestamp: new Date(log.created_at),
          }));
          setHistory(remoteHistory);
        }
      };
      fetchRemoteLogs();
    }
  }, [patientId]);

  useEffect(() => {
    localStorage.setItem('sugarHistory', JSON.stringify(history));
  }, [history]);

  const logSugar = async () => {
    const l = parseInt(level);
    if (isNaN(l)) return;

    setIsLogging(true);
    const newEntry: SugarEntry = {
      level: l,
      type: type,
      timestamp: new Date(),
    };

    // Optimistic update
    setHistory([newEntry, ...history]);

    // Save to Supabase if logged in
    if (patientId) {
      try {
        const { data, error } = await supabase.from('patient_health_logs').insert({
          patient_id: patientId,
          log_type: 'sugar',
          value_data: { level: l, type }
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
        if (l > 300 || l < 70) {
          notifyConsultant(supabase, user?.phoneNumber?.slice(-10) || '', `CRITICAL SUGAR ALERT: Patient logged ${l} mg/dL (${type}).`);
        }
      } catch (err) {
        console.error("Error saving Sugar log:", err);
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
      console.error("Error deleting sugar log:", err);
      toast.error('Failed to delete. Please try again.');
    }
  };

  const resetHistory = () => {
    setHistory([]);
    localStorage.removeItem('sugarHistory');
  };

  const getTypeName = (value: string) => {
    switch (value) {
      case 'fasting': return t('sugar.fasting');
      case 'post_meal': return t('sugar.post_meal');
      case 'random': return t('sugar.random');
      default: return value;
    }
  };

  const chartData = [...history]
    .slice(0, 10)
    .reverse()
    .map(entry => ({
      time: entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      level: entry.level,
      type: getTypeName(entry.type),
      fullDate: entry.timestamp.toLocaleString()
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">{t('sugar.level')}</label>
              <Input
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="100"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">{t('sugar.type')}</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fasting">{t('sugar.fasting')}</SelectItem>
                  <SelectItem value="post_meal">{t('sugar.post_meal')}</SelectItem>
                  <SelectItem value="random">{t('sugar.random')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={logSugar} className="col-span-2 shadow-sm" disabled={isLogging}>
              {isLogging ? t('common.loading', 'Saving...') : t('sugar.log')}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold">{t('sugar.history')}</h4>
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
                      <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none">
                          {entry.level}
                          <span className="text-[10px] ml-1 text-muted-foreground uppercase">{t('sugar.unit')}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1">{getTypeName(entry.type)}</span>
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
                    dataKey="level"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                    name={t('sugar.level')}
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

export default BloodSugarTracker;
