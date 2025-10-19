import React, { useState, useEffect } from 'react';
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
  duration: string;
  instructions: string;
}

interface OrderMedicationCardProps {
  medications: Medication[];
  patientName: string;

}

const OrderMedicationCard: React.FC<OrderMedicationCardProps> = ({ medications, patientName }) => {
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
    const durationMatch = med.duration.match(/(\d+)\s*(week|day)s?/i);
    if (!durationMatch) return 0;

    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    const days = unit === 'week' ? value * 7 : value;

    const frequency = (med.freqMorning ? 1 : 0) + (med.freqNoon ? 1 : 0) + (med.freqNight ? 1 : 0);

    return days * frequency;
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
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-3">
        <Pill className="h-6 w-6 text-primary" />
        <CardTitle>Order Medication for {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>From the latest prescription:</p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Medicine</th>
              <th className="text-right">Quantity</th>
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
          Order Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrderMedicationCard;