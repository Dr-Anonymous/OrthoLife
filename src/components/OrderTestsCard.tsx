import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Beaker } from 'lucide-react';

interface OrderTestsCardProps {
  investigations: string;
  patientName: string;
}

const OrderTestsCard: React.FC<OrderTestsCardProps> = ({ investigations, patientName }) => {
  const navigate = useNavigate();

  const handleOrderNow = () => {
    const query = investigations.replace(/\n/g, ',');
    navigate(`/diagnostics?q=${encodeURIComponent(query)}`);
  };

  if (!investigations) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-3">
        <Beaker className="h-6 w-6 text-primary" />
        <CardTitle>Order Tests for {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>From the latest prescription:</p>
        <div className="mt-2 p-4 bg-gray-100 rounded-lg">
          <pre className="whitespace-pre-wrap font-sans">{investigations}</pre>
        </div>
        <Button onClick={handleOrderNow} className="w-full mt-4">
          Order Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrderTestsCard;