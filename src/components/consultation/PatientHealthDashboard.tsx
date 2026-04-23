import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Droplets, Thermometer, UserCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';

interface PatientHealthDashboardProps {
  patientId: string;
}

const PatientHealthDashboard: React.FC<PatientHealthDashboardProps> = ({ patientId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_health_logs')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [patientId]);

  if (!patientId) return null;

  const bpData = logs
    .filter(l => l.log_type === 'bp')
    .map(l => ({
      date: format(new Date(l.created_at), 'MMM dd, HH:mm'),
      systolic: l.value_data.systolic,
      diastolic: l.value_data.diastolic,
    }));

  const sugarData = logs
    .filter(l => l.log_type === 'sugar')
    .map(l => ({
      date: format(new Date(l.created_at), 'MMM dd, HH:mm'),
      level: l.value_data.level,
      type: l.value_data.type,
    }));

  const tempData = logs
    .filter(l => l.log_type === 'temp')
    .map(l => ({
      date: format(new Date(l.created_at), 'MMM dd, HH:mm'),
      value: l.value_data.value,
    }));

  const painData = logs
    .filter(l => l.log_type === 'pain')
    .map(l => ({
      date: format(new Date(l.created_at), 'MMM dd, HH:mm'),
      level: l.value_data.level,
    }));

  const latestRecovery = logs
    .filter(l => l.log_type === 'recovery')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const calculateRecoveryPercentage = (valueData: any) => {
    if (!valueData || !valueData.milestones) return 0;
    const completed = Object.values(valueData.milestones as object).filter(Boolean).length;
    return Math.round((completed / 5) * 100);
  };

  const recoveryData = logs
    .filter(l => l.log_type === 'recovery')
    .map(l => ({
      date: format(new Date(l.created_at), 'MMM dd, HH:mm'),
      percentage: calculateRecoveryPercentage(l.value_data),
    }));

  if (loading) {
     return <div className="h-40 flex items-center justify-center border rounded-lg bg-muted/5 animate-pulse">
       <UserCheck className="w-6 h-6 animate-bounce text-muted-foreground mr-2" />
       <span className="text-muted-foreground">Fetching health trends...</span>
     </div>;
  }

  const availableTabs = [
    { id: 'bp', label: 'BP', data: bpData, icon: Activity },
    { id: 'sugar', label: 'Sugar', data: sugarData, icon: Droplets },
    { id: 'temp', label: 'Temp', data: tempData, icon: Thermometer },
    { id: 'pain', label: 'Pain', data: painData, icon: AlertCircle },
    { id: 'recovery', label: 'Recovery', data: recoveryData, icon: TrendingUp },
  ].filter(tab => tab.data.length > 0);

  if (availableTabs.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Patient Health Tracking
            </CardTitle>
            <CardDescription>Longitudinal trends from patient-logged data</CardDescription>
          </div>
          {latestRecovery && (
             <div className="text-right">
                <span className="text-xs font-bold text-muted-foreground uppercase">Latest Recovery</span>
                <div className="text-xl font-black text-primary">
                  {calculateRecoveryPercentage(latestRecovery.value_data)}%
                </div>
             </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue={availableTabs[0].id} className="w-full">
          <TabsList 
            className="grid w-full mb-8 h-auto p-1 bg-muted/20" 
            style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}
          >
            {availableTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 py-2">
                <tab.icon className="w-4 h-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableTabs.some(t => t.id === 'bp') && (
            <TabsContent value="bp" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bpData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} tick={{fill: 'currentColor'}} />
                  <YAxis fontSize={10} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend />
                  <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                  <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          )}

          {availableTabs.some(t => t.id === 'sugar') && (
            <TabsContent value="sugar" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sugarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} domain={['dataMin - 20', 'dataMax + 20']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="level" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          )}

          {availableTabs.some(t => t.id === 'temp') && (
            <TabsContent value="temp" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          )}

          {availableTabs.some(t => t.id === 'pain') && (
            <TabsContent value="pain" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} domain={[0, 10]} ticks={[0,2,4,6,8,10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="level" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          )}

          {availableTabs.some(t => t.id === 'recovery') && (
            <TabsContent value="recovery" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recoveryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="percentage" stroke="#f97316" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PatientHealthDashboard;
