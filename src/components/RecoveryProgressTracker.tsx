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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('resources.tool3.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('recovery.progress')}</span>
              <span className="text-sm font-bold text-primary">{`${completedCount} / ${milestones.length}`}</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
          <div className="space-y-2">
            {milestones.map(milestone => (
              <div key={milestone.id} className="flex items-center space-x-2">
                <Checkbox
                  id={milestone.id}
                  checked={completedMilestones[milestone.id] || false}
                  onCheckedChange={(checked) => handleMilestoneChange(milestone.id, !!checked)}
                />
                <label
                  htmlFor={milestone.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t(milestone.labelKey)}
                </label>
              </div>
            ))}
          </div>
          {completedCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetProgress} className="w-full mt-4">
              {t('common.reset')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecoveryProgressTracker;
