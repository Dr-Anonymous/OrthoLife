import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from './ui/button';

const RecoveryProgressTracker: React.FC = () => {
  const { t } = useTranslation();

  const milestones = useMemo(() => [
    { id: 'milestone1', labelKey: 'recovery.milestone1' },
    { id: 'milestone2', labelKey: 'recovery.milestone2' },
    { id: 'milestone3', labelKey: 'recovery.milestone3' },
    { id: 'milestone4', labelKey: 'recovery.milestone4' },
    { id: 'milestone5', labelKey: 'recovery.milestone5' },
  ], []);

  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>(() => {
    try {
      const savedMilestones = localStorage.getItem('recoveryProgress');
      return savedMilestones ? JSON.parse(savedMilestones) : {};
    } catch (error) {
      console.error("Failed to parse recovery progress from localStorage", error);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('recoveryProgress', JSON.stringify(completedMilestones));
  }, [completedMilestones]);

  const handleMilestoneChange = (id: string, checked: boolean) => {
    setCompletedMilestones(prev => ({ ...prev, [id]: checked }));
  };

  const resetProgress = () => {
    setCompletedMilestones({});
    localStorage.removeItem('recoveryProgress');
  };

  const completedCount = Object.values(completedMilestones).filter(Boolean).length;
  const progressPercentage = (completedCount / milestones.length) * 100;

  return (
    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 space-y-4 shadow-inner">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{t('recovery.progress')}</h4>
            <div className="text-4xl font-black text-primary">
              {Math.round(progressPercentage)}%
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{completedCount}</span>
            <span className="text-muted-foreground ml-1">/ {milestones.length}</span>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-3 w-full" />
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
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetProgress} className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold">
              {t('common.reset')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecoveryProgressTracker;
