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
import { useTranslation } from 'react-i18next';

interface PatientHealthDashboardProps {
  patientId: string;
}

const PatientHealthDashboard: React.FC<PatientHealthDashboardProps> = ({ patientId }) => {
  const { t } = useTranslation();
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
      latestMilestone: l.value_data.latestMilestone,
    }));

  const availableTabs = [
    { id: 'bp', label: 'BP', data: bpData, icon: Activity },
    { id: 'sugar', label: 'Sugar', data: sugarData, icon: Droplets },
    { id: 'temp', label: 'Temp', data: tempData, icon: Thermometer },
    { id: 'pain', label: 'Pain', data: painData, icon: AlertCircle },
    { id: 'recovery', label: 'Recovery', data: recoveryData, icon: TrendingUp },
  ].filter(tab => tab.data.length > 0);

  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  if (loading) {
     return <div className="h-40 flex items-center justify-center border rounded-lg bg-muted/5 animate-pulse">
       <UserCheck className="w-6 h-6 animate-bounce text-muted-foreground mr-2" />
       <span className="text-muted-foreground">Fetching health trends...</span>
     </div>;
  }

  if (availableTabs.length === 0) {
    return null;
  }

  const milestoneLabels: Record<string, string> = {
    'u1': 'recovery.upper.m1', 'u2': 'recovery.upper.m2', 'u3': 'recovery.upper.m3', 'u4': 'recovery.upper.m4', 'u5': 'recovery.upper.m5',
    'l1': 'recovery.lower.m1', 'l2': 'recovery.lower.m2', 'l3': 'recovery.lower.m3', 'l4': 'recovery.lower.m4', 'l5': 'recovery.lower.m5',
    's1': 'recovery.spine.m1', 's2': 'recovery.spine.m2', 's3': 'recovery.spine.m3', 's4': 'recovery.spine.m4', 's5': 'recovery.spine.m5',
  };

  const renderActiveSummary = () => {
    if (!activeTab) return null;

    const latestLog = logs
      .filter(l => l.log_type === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!latestLog) return null;

    let label = "";
    let value = "";
    let subValue = "";

    switch (activeTab) {
      case 'bp':
        label = "Latest BP";
        value = `${latestLog.value_data.systolic}/${latestLog.value_data.diastolic} mmHg`;
        break;
      case 'sugar':
        label = "Latest Sugar";
        const typeLabel = latestLog.value_data.type ? ` (${latestLog.value_data.type.replace('_', ' ')})` : '';
        value = `${latestLog.value_data.level} mg/dL${typeLabel}`;
        break;
      case 'temp':
        label = "Latest Temp";
        value = `${latestLog.value_data.value}°F`;
        break;
      case 'pain':
        label = "Latest Pain";
        value = `${latestLog.value_data.level}/10`;
        break;
      case 'recovery':
        label = "Latest Recovery";
        value = `${calculateRecoveryPercentage(latestLog.value_data)}%`;
        const milestoneKey = latestLog.value_data.latestMilestone;
        if (milestoneKey && milestoneLabels[milestoneKey]) {
           subValue = t(milestoneLabels[milestoneKey]);
        }
        break;
    }

    return (
      <div className="text-right">
        <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
        <div className="text-xl font-black text-primary">{value}</div>
        {subValue && <div className="text-[10px] text-muted-foreground font-medium max-w-[150px] leading-tight ml-auto truncate">{subValue}</div>}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-[250px]">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          {payload.map((p: any, i: number) => {
            const milestoneKey = p.payload.latestMilestone;
            const milestoneName = milestoneKey && milestoneLabels[milestoneKey] ? t(milestoneLabels[milestoneKey]) : null;
            
            return (
              <div key={i}>
                <p className="text-sm font-bold" style={{ color: p.color }}>
                  {p.name || p.dataKey}: {p.value}{unit || ''} 
                  {p.payload.type ? ` (${p.payload.type.replace('_', ' ')})` : ''}
                </p>
                {milestoneName && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic leading-tight">
                    Reached: {milestoneName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

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
          {renderActiveSummary()}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs 
          value={activeTab || availableTabs[0].id} 
          onValueChange={setActiveTab}
          className="w-full"
        >
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
                  <Tooltip content={<CustomTooltip unit=" mmHg" />} />
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
                  <Tooltip content={<CustomTooltip unit=" mg/dL" />} />
                  <Line type="monotone" dataKey="level" name="Sugar Level" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
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
                  <Tooltip content={<CustomTooltip unit="°F" />} />
                  <Line type="monotone" dataKey="value" name="Temperature" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
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
                  <Tooltip content={<CustomTooltip unit="%" />} />
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
