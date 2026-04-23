import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Hand, Footprints, Activity } from 'lucide-react';

const RecoveryProgressTracker: React.FC = () => {
  const { t } = useTranslation();
  const { user, selectedPatient } = useAuth();
  const patientId = selectedPatient?.id;

  const [area, setArea] = useState<string | null>(() => {
    return localStorage.getItem('recoveryArea');
  });

  const milestoneSets: Record<string, { id: string, labelKey: string }[]> = {
    upper: [
      { id: 'u1', labelKey: 'recovery.upper.m1' },
      { id: 'u2', labelKey: 'recovery.upper.m2' },
      { id: 'u3', labelKey: 'recovery.upper.m3' },
      { id: 'u4', labelKey: 'recovery.upper.m4' },
      { id: 'u5', labelKey: 'recovery.upper.m5' },
    ],
    lower: [
      { id: 'l1', labelKey: 'recovery.lower.m1' },
      { id: 'l2', labelKey: 'recovery.lower.m2' },
      { id: 'l3', labelKey: 'recovery.lower.m3' },
      { id: 'l4', labelKey: 'recovery.lower.m4' },
      { id: 'l5', labelKey: 'recovery.lower.m5' },
    ],
    spine: [
      { id: 's1', labelKey: 'recovery.spine.m1' },
      { id: 's2', labelKey: 'recovery.spine.m2' },
      { id: 's3', labelKey: 'recovery.spine.m3' },
      { id: 's4', labelKey: 'recovery.spine.m4' },
      { id: 's5', labelKey: 'recovery.spine.m5' },
    ]
  };

  const milestones = useMemo(() => {
    if (!area) return [];
    return milestoneSets[area] || [];
  }, [area]);

  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>(() => {
    try {
      const savedMilestones = localStorage.getItem('recoveryProgress');
      return savedMilestones ? JSON.parse(savedMilestones) : {};
    } catch (error) {
      return {};
    }
  });

  // Sync with Supabase on mount
  useEffect(() => {
    if (patientId) {
      const fetchRemoteLogs = async () => {
        const { data, error } = await supabase
          .from('patient_health_logs')
          .select('*')
          .eq('patient_id', patientId)
          .eq('log_type', 'recovery')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const remoteData = data[0].value_data as any;
          if (remoteData.area) {
            setArea(remoteData.area);
            localStorage.setItem('recoveryArea', remoteData.area);
          }
          if (remoteData.milestones) {
            setCompletedMilestones(remoteData.milestones);
          }
        }
      };
      fetchRemoteLogs();
    }
  }, [patientId]);

  useEffect(() => {
    localStorage.setItem('recoveryProgress', JSON.stringify(completedMilestones));
    if (area) {
      localStorage.setItem('recoveryArea', area);
    }
  }, [completedMilestones, area]);

  const handleAreaSelect = (selectedArea: string) => {
    setArea(selectedArea);
    setCompletedMilestones({}); // Reset milestones when area changes
    if (patientId) {
      supabase.from('patient_health_logs').insert({
        patient_id: patientId,
        log_type: 'recovery',
        value_data: { area: selectedArea, milestones: {} }
      }).then();
    }
  };

  const handleMilestoneChange = async (id: string, checked: boolean) => {
    const newState = { ...completedMilestones, [id]: checked };
    setCompletedMilestones(newState);

    if (patientId) {
      try {
        await supabase.from('patient_health_logs').insert({
          patient_id: patientId,
          log_type: 'recovery',
          value_data: { area, milestones: newState }
        });
      } catch (err) {
        console.error("Error saving recovery log:", err);
      }
    }
  };

  const resetProgress = async () => {
    setCompletedMilestones({});
    setArea(null);
    localStorage.removeItem('recoveryProgress');
    localStorage.removeItem('recoveryArea');
    
    if (patientId) {
      try {
        await supabase.from('patient_health_logs').insert({
          patient_id: patientId,
          log_type: 'recovery',
          value_data: {}
        });
        toast.success(t('common.success', 'Progress reset successfully'));
      } catch (err) {
        console.error("Error resetting recovery log:", err);
      }
    }
  };

  const completedCount = Object.values(completedMilestones).filter(Boolean).length;
  const progressPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (progressPercentage === 100 && !showCelebration) {
      setShowCelebration(true);
      // Auto hide after some time if needed, but keeping it for now
    } else if (progressPercentage < 100) {
      setShowCelebration(false);
    }
  }, [progressPercentage]);

  if (!area) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-primary">{t('recovery.select_area')}</h3>
          <p className="text-sm text-muted-foreground italic">{t('recovery.select_area_desc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Button 
            variant="outline" 
            className="h-auto py-6 justify-start px-6 text-lg font-bold hover:bg-primary/5 hover:border-primary/30 group"
            onClick={() => handleAreaSelect('upper')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Hand className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span>{t('recovery.upper_limb')}</span>
                <span className="text-xs font-normal text-muted-foreground">{t('recovery.upper_desc')}</span>
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-6 justify-start px-6 text-lg font-bold hover:bg-primary/5 hover:border-primary/30 group"
            onClick={() => handleAreaSelect('lower')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Footprints className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span>{t('recovery.lower_limb')}</span>
                <span className="text-xs font-normal text-muted-foreground">{t('recovery.lower_desc')}</span>
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-6 justify-start px-6 text-lg font-bold hover:bg-primary/5 hover:border-primary/30 group"
            onClick={() => handleAreaSelect('spine')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span>{t('recovery.spine_limb')}</span>
                <span className="text-xs font-normal text-muted-foreground">{t('recovery.spine_desc')}</span>
              </div>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
                opacity: 0.6
              }}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ 
                  backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'][Math.floor(Math.random() * 5)] 
                }} 
              />
            </div>
          ))}
        </div>
      )}

      <div className={`bg-primary/5 border border-primary/10 rounded-xl p-8 space-y-4 shadow-inner transition-all duration-1000 ${showCelebration ? 'ring-4 ring-primary/20 bg-primary/10 scale-[1.02]' : ''}`}>
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
              {t('recovery.progress')} - {t(`recovery.${area}_limb`)}
            </h4>
            <div className="text-4xl font-black text-primary flex items-center gap-2">
              {Math.round(progressPercentage)}%
              {showCelebration && <span className="animate-bounce">🎉</span>}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{completedCount}</span>
            <span className="text-muted-foreground ml-1">/ {milestones.length}</span>
          </div>
        </div>
        <Progress value={progressPercentage} className={`h-3 w-full ${showCelebration ? 'bg-primary/20' : ''}`} />
        {showCelebration && (
          <div className="text-center pt-2 animate-in fade-in zoom-in duration-500">
            <p className="text-primary font-bold text-lg">{t('recovery.congratulations')}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map(milestone => (
            <div 
              key={milestone.id} 
              className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                completedMilestones[milestone.id] 
                  ? 'bg-primary/5 border-primary/20 shadow-sm' 
                  : 'bg-background border-muted'
              }`}
            >
              <Checkbox
                id={milestone.id}
                checked={completedMilestones[milestone.id] || false}
                onCheckedChange={(checked) => handleMilestoneChange(milestone.id, !!checked)}
                className="mt-1"
              />
              <label
                htmlFor={milestone.id}
                className={`text-sm font-semibold leading-tight cursor-pointer ${
                  completedMilestones[milestone.id] ? 'text-primary' : 'text-foreground'
                }`}
              >
                {t(milestone.labelKey)}
              </label>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center pt-4">
          <Button variant="ghost" size="sm" onClick={resetProgress} className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold">
            {t('common.reset')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryProgressTracker;
