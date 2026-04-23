import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const BMICalculator: React.FC = () => {
  const { t } = useTranslation();
  const { user, selectedPatient } = useAuth();
  const patientId = selectedPatient?.id;

  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');

  const calculateBmi = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (h > 0 && w > 0) {
      const bmiValue = w / ((h / 100) * (h / 100));
      setBmi(bmiValue);
      interpretBmi(bmiValue);

      // Save to Supabase
      if (patientId) {
        try {
          await supabase.from('patient_health_logs').insert({
            patient_id: patientId,
            log_type: 'bmi',
            value_data: { bmi: bmiValue, height: h, weight: w }
          });
          toast.success(t('common.success', 'BMI saved'));
        } catch (err) {
          console.error("Error saving BMI:", err);
        }
      }
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
    <div className="space-y-6">
      <div className="bg-muted/30 p-6 rounded-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="height" className="font-semibold text-primary">{t('bmi.height')}</Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={t('bmi.height_placeholder')}
              className="bg-background"
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="weight" className="font-semibold text-primary">{t('bmi.weight')}</Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('bmi.weight_placeholder')}
              className="bg-background"
            />
          </div>
        </div>
        <Button onClick={calculateBmi} className="w-full shadow-md py-6 text-xl font-bold">
          {t('bmi.calculate')}
        </Button>
      </div>

      {bmi !== null && (
        <div className="animate-in fade-in zoom-in duration-300">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-10 text-center space-y-4 shadow-inner">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground uppercase tracking-widest font-bold">{t('bmi.your_bmi')}</span>
              <div className="text-7xl font-black text-primary leading-none">{bmi.toFixed(2)}</div>
            </div>
            <div className={`text-xl font-bold px-6 py-2 rounded-full inline-block border bg-background shadow-sm`}>
              {interpretation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BMICalculator;
