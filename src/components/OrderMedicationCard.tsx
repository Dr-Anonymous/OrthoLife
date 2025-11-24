import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Pill } from 'lucide-react';

interface Medication {
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency?: string;
  duration: string;
  instructions: string;
}

interface OrderMedicationCardProps {
  medications: Medication[];
  patientName: string;

}

const OrderMedicationCard: React.FC<OrderMedicationCardProps> = ({ medications, patientName }) => {
  const { t } = useTranslation();
  const [medicationQuantities, setMedicationQuantities] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    medications.forEach(med => {
      initialQuantities[med.name] = calculateQuantity(med);
    });
    setMedicationQuantities(initialQuantities);
  }, [medications]);

  const calculateQuantity = (med: Medication): number => {
    const durationMatch = med.duration.match(/(\d+)\s*(day|week|month)s?/i);
    if (!durationMatch) return 0;

    const durationValue = parseInt(durationMatch[1], 10);
    const durationUnit = durationMatch[2].toLowerCase();
    const days = durationUnit === 'week' ? durationValue * 7 : durationUnit === 'month' ? durationValue * 30 : durationValue;

    let dailyFrequency = 0;

    if (med.frequency && med.frequency.trim() !== '') {
        const freq = med.frequency.trim();
        const freqLower = freq.toLowerCase();

        // English parsing
        const numericMatch = freqLower.match(/(\d+)\s*\/\s*(day|week|month)/);
        if (numericMatch) {
            const num = parseInt(numericMatch[1], 10);
            const unit = numericMatch[2];
            if (unit === 'day') dailyFrequency = num;
            else if (unit === 'week') dailyFrequency = num / 7;
            else if (unit === 'month') dailyFrequency = num / 30;
        } else {
            const wordMap: { [key: string]: number } = { 'once': 1, 'twice': 2, 'thrice': 3, 'four times': 4 };
            const wordMatch = freqLower.match(new RegExp(`(${Object.keys(wordMap).join('|')})\\s+a\\s+(day|week|month)`));
            if (wordMatch) {
                const num = wordMap[wordMatch[1]];
                const unit = wordMatch[2];
                if (unit === 'day') dailyFrequency = num;
                else if (unit === 'week') dailyFrequency = num / 7;
                else if (unit === 'month') dailyFrequency = num / 30;
            } else {
                // Telugu parsing
                const teluguUnitMap: { [key: string]: string } = { 'రోజుకు': 'day', 'వారానికి': 'week', 'నెలకు': 'month' };
                const teluguNumMap: { [key: string]: number } = {
                    'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
                    'ఒకసారి': 1, 'రెండుసార్లు': 2, 'మూడు సార్లు': 3, 'నాలుగు సార్లు': 4
                };

                const teluguRegex = new RegExp(`(${Object.keys(teluguUnitMap).join('|')})\\s*(${Object.keys(teluguNumMap).join('|')})`);
                const teluguMatch = freq.match(teluguRegex);

                if (teluguMatch) {
                    const unit = teluguUnitMap[teluguMatch[1]];
                    let num = teluguNumMap[teluguMatch[2]];

                    // Handle cases like "మూడు సార్లు" where number is part of the phrase
                    if (teluguMatch[2].includes('సార్లు')) {
                       const parts = teluguMatch[2].split(' ');
                       if(parts.length > 1 && teluguNumMap[parts[0]]) {
                           num = teluguNumMap[parts[0]];
                       }
                    }

                    if (unit === 'day') dailyFrequency = num;
                    else if (unit === 'week') dailyFrequency = num / 7;
                    else if (unit === 'month') dailyFrequency = num / 30;
                }
            }
        }
    } else {
        dailyFrequency = (med.freqMorning ? 1 : 0) + (med.freqNoon ? 1 : 0) + (med.freqNight ? 1 : 0);
    }

    const totalQuantity = days * dailyFrequency;

    return Math.ceil(totalQuantity);
  };

  const handleQuantityChange = (name: string, quantity: string) => {
    setMedicationQuantities(prev => ({
      ...prev,
      [name]: parseInt(quantity, 10) || 0,
    }));
  };

  const cleanMedicationName = (name: string) => {
    return name.replace(/^(?:T|Cap|Syr)\.?\s*/i, '');
  };

  const handleOrderNow = () => {
    const query = Object.entries(medicationQuantities)
      .map(([name, quantity]) => `${encodeURIComponent(cleanMedicationName(name))}*${quantity}`)
      .join(',');
    navigate(`/pharmacy?q=${query}`);
  };

  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Pill className="h-6 w-6 text-primary" />
          <CardTitle>{t('orderMedicationCard.title', { patientName })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">{t('orderMedicationCard.noMedication')}</p>
          <Button onClick={() => navigate('/pharmacy')} className="w-full mt-4">
            {t('orderMedicationCard.orderNew')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-3">
        <Pill className="h-6 w-6 text-primary" />
        <CardTitle>{t('orderMedicationCard.title', { patientName })}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{t('orderMedicationCard.fromLatestPrescription')}</p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">{t('orderMedicationCard.medicine')}</th>
              <th className="text-right">{t('orderMedicationCard.quantity')}</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((med, index) => (
              <tr key={index}>
                <td>{med.name}</td>
                <td className="text-right">
                  <Input
                    type="number"
                    value={medicationQuantities[med.name] || ''}
                    onChange={(e) => handleQuantityChange(med.name, e.target.value)}
                    className="w-20 ml-auto"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button onClick={handleOrderNow} className="w-full mt-4">
          {t('orderMedicationCard.orderNow')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrderMedicationCard;
