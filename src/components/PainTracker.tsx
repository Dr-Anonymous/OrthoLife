import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface PainEntry {
  level: number;
  timestamp: Date;
}

const PainTracker: React.FC = () => {
  const { t } = useTranslation();
  const [painLevel, setPainLevel] = useState<number>(5);
  const [painHistory, setPainHistory] = useState<PainEntry[]>([]);

  const logPain = () => {
    const newEntry: PainEntry = {
      level: painLevel,
      timestamp: new Date(),
    };
    setPainHistory([newEntry, ...painHistory]);
  };

  const getPainLevelLabel = (level: number) => {
    if (level <= 3) return t('pain.mild');
    if (level <= 7) return t('pain.moderate');
    return t('pain.severe');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('resources.tool2.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('pain.current_level')}: {painLevel} - {getPainLevelLabel(painLevel)}</label>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[painLevel]}
              onValueChange={(value) => setPainLevel(value[0])}
              className="my-4"
            />
          </div>
          <Button onClick={logPain} className="w-full">
            {t('pain.log_pain')}
          </Button>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('pain.history')}</h4>
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              {painHistory.length > 0 ? (
                painHistory.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{t('pain.level')}: {entry.level} ({getPainLevelLabel(entry.level)})</span>
                    <span className="text-muted-foreground">
                      {entry.timestamp.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('pain.no_entries')}</p>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PainTracker;
