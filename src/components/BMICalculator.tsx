import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BMICalculator: React.FC = () => {
  const { t } = useTranslation();
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');

  const calculateBmi = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (h > 0 && w > 0) {
      const bmiValue = w / ((h / 100) * (h / 100));
      setBmi(bmiValue);
      interpretBmi(bmiValue);
    } else {
      setBmi(null);
      setInterpretation('');
    }
  };

  const interpretBmi = (bmiValue: number) => {
    if (bmiValue < 18.5) {
      setInterpretation(t('bmi.underweight'));
    } else if (bmiValue >= 18.5 && bmiValue < 24.9) {
      setInterpretation(t('bmi.normal'));
    } else if (bmiValue >= 25 && bmiValue < 29.9) {
      setInterpretation(t('bmi.overweight'));
    } else {
      setInterpretation(t('bmi.obese'));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('resources.tool1.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="height">{t('bmi.height')}</Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={t('bmi.height_placeholder')}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="weight">{t('bmi.weight')}</Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('bmi.weight_placeholder')}
            />
          </div>
          <Button onClick={calculateBmi} className="w-full">
            {t('bmi.calculate')}
          </Button>
          {bmi !== null && (
            <div className="text-center pt-4">
              <h3 className="text-lg font-semibold">{t('bmi.your_bmi')}</h3>
              <p className="text-3xl font-bold text-primary">{bmi.toFixed(2)}</p>
              <p className="text-muted-foreground">{interpretation}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BMICalculator;
