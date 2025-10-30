import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Beaker } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface OrderTestsCardProps {
  investigations: string;
  patientName: string;
}

const OrderTestsCard: React.FC<OrderTestsCardProps> = ({ investigations, patientName }) => {
  const navigate = useNavigate();
  const [labInvestigations, setLabInvestigations] = useState('');
  const [radiologicalInvestigations, setRadiologicalInvestigations] = useState<string[]>([]);

  useEffect(() => {
    const radiologicalKeywords = ['xray', 'usg', 'mri', 'ct'];
    const allInvestigations = investigations.split('\n').filter(line => line.trim());

    const lab = allInvestigations.filter(line =>
      !radiologicalKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    const radiological = allInvestigations.filter(line =>
      radiologicalKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );

    setLabInvestigations(lab.join('\n'));
    setRadiologicalInvestigations(radiological);
  }, [investigations]);

  const handleOrderNow = () => {
    const query = labInvestigations.replace(/\n/g, ',');
    navigate(`/diagnostics?q=${encodeURIComponent(query)}`);
  };

  if (!investigations) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Beaker className="h-6 w-6 text-primary" />
          <CardTitle>Order Tests for {patientName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No investigations prescribed in the latest prescription.</p>
          <Button onClick={() => navigate('/diagnostics')} className="w-full mt-4">
            Order New
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-3">
        <Beaker className="h-6 w-6 text-primary" />
        <CardTitle>Order Tests for {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        {labInvestigations && (
          <>
            <p>Lab tests from the latest prescription (you can edit the list below):</p>
            <Textarea
              value={labInvestigations}
              onChange={(e) => setLabInvestigations(e.target.value)}
              className="mt-2"
              rows={5}
            />
            <Button onClick={handleOrderNow} className="w-full mt-4">
              Order Now
            </Button>
          </>
        )}

        {radiologicalInvestigations.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-800">Radiological Investigations:</h3>
            <div className="mt-2 text-sm text-gray-700">
              {radiologicalInvestigations.map((investigation, index) => (
                <p key={index} className="py-1">{investigation}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTestsCard;
