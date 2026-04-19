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
  phone: string;
}

const PatientHealthDashboard: React.FC<PatientHealthDashboardProps> = ({ phone }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) return;

    const fetchLogs = async () => {
      setLoading(true);
      // Clean phone to last 10 digits
      const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
      
      const { data, error } = await supabase
        .from('patient_health_logs')
        .select('*')
        .eq('phone', cleanedPhone)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [phone]);

  if (!phone) return null;

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

  if (loading) {
     return <div className="h-40 flex items-center justify-center border rounded-lg bg-muted/5 animate-pulse">
       <UserCheck className="w-6 h-6 animate-bounce text-muted-foreground mr-2" />
       <span className="text-muted-foreground">Fetching health trends...</span>
     </div>;
  }

  if (logs.length === 0) {
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
                  {Math.round((Object.values(latestRecovery.value_data as object).filter(Boolean).length / 5) * 100)}%
                </div>
             </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="bp" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1 bg-muted/20">
            <TabsTrigger value="bp" className="gap-2 py-2">
              <Activity className="w-4 h-4" /> BP
            </TabsTrigger>
            <TabsTrigger value="sugar" className="gap-2 py-2">
              <Droplets className="w-4 h-4" /> Sugar
            </TabsTrigger>
            <TabsTrigger value="temp" className="gap-2 py-2">
              <Thermometer className="w-4 h-4" /> Temp
            </TabsTrigger>
            <TabsTrigger value="pain" className="gap-2 py-2">
              <AlertCircle className="w-4 h-4" /> Pain
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bp" className="h-[300px]">
            {bpData.length > 0 ? (
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
            ) : <NoDataMessage />}
          </TabsContent>

          <TabsContent value="sugar" className="h-[300px]">
             {sugarData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={sugarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} domain={['dataMin - 20', 'dataMax + 20']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="level" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
            ) : <NoDataMessage />}
          </TabsContent>

          <TabsContent value="temp" className="h-[300px]">
             {tempData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={tempData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
            ) : <NoDataMessage />}
          </TabsContent>

          <TabsContent value="pain" className="h-[300px]">
             {painData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={painData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} domain={[0, 10]} ticks={[0,2,4,6,8,10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="level" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
            ) : <NoDataMessage />}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const NoDataMessage = () => (
  <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
    <p className="text-sm italic">No data logged for this category yet.</p>
  </div>
);

export default PatientHealthDashboard;
