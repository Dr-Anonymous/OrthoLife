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
  const [editableInvestigations, setEditableInvestigations] = useState('');

  useEffect(() => {
    const filteredInvestigations = investigations
      .split('\n')
      .filter(line => !line.trim().toLowerCase().startsWith('xray'))
      .join('\n');
    setEditableInvestigations(filteredInvestigations);
  }, [investigations]);

  const handleOrderNow = () => {
    const query = editableInvestigations.replace(/\n/g, ',');
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
        <p>Lab tests from the latest prescription (you can edit the list below):</p>
        <Textarea
          value={editableInvestigations}
          onChange={(e) => setEditableInvestigations(e.target.value)}
          className="mt-2"
          rows={5}
        />
        <Button onClick={handleOrderNow} className="w-full mt-4">
          Order Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrderTestsCard;
