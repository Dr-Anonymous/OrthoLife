import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, RefreshCw, XCircle, Pill } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
}

const OrderMedicationCard: React.FC<OrderMedicationCardProps> = ({ medications }) => {
  const { t } = useTranslation();
  const [medicationQuantities, setMedicationQuantities] = useState<Record<string, number>>({});
  const [medicationTypes, setMedicationTypes] = useState<Record<string, 'pack' | 'unit' | 'auto'>>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cancellingSub, setCancellingSub] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phoneNumber) {
      fetchOrderHistory();
    }
  }, [user]);

  const fetchOrderHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase.functions.invoke('get-order-history', {
        body: { userId: user?.phoneNumber }
      });

      if (error) throw error;

      setOrders(data.orders || []);
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      setCancellingSub(subscriptionId);
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId,
          userId: user?.phoneNumber
        }
      });

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your auto-reorder subscription has been cancelled.",
      });

      fetchOrderHistory();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCancellingSub(null);
    }
  };

  const handleReorder = (items: any[]) => {
    const query = items
      .map((item: any) => {
        const name = item.name || item.displayName;
        const quantity = item.quantity;
        const type = item.orderType || 'pack'; // Default to pack if not specified
        return `${encodeURIComponent(cleanMedicationName(name))}*${quantity}*${type}`;
      })
      .join(',');
    navigate(`/pharmacy?q=${query}`);
  };

  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    const initialTypes: Record<string, 'pack' | 'unit' | 'auto'> = {};
    medications.forEach(med => {
      initialQuantities[med.name] = calculateQuantity(med);
      initialTypes[med.name] = 'auto';
    });
    setMedicationQuantities(initialQuantities);
    setMedicationTypes(initialTypes);
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
              if (parts.length > 1 && teluguNumMap[parts[0]]) {
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

  const handleTypeChange = (name: string, type: 'pack' | 'unit' | 'auto') => {
    setMedicationTypes(prev => ({
      ...prev,
      [name]: type,
    }));
  };

  const cleanMedicationName = (name: string) => {
    return name.replace(/^(?:T|Cap|Syr)\.?\s*/i, '');
  };

  const handleOrderNow = () => {
    const query = Object.entries(medicationQuantities)
      .map(([name, quantity]) => {
        const type = medicationTypes[name] || 'auto';
        if (type === 'auto') {
          return `${encodeURIComponent(cleanMedicationName(name))}*${quantity}`;
        }
        return `${encodeURIComponent(cleanMedicationName(name))}*${quantity}*${type}`;
      })
      .join(',');
    navigate(`/pharmacy?q=${query}`);
  };

  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Pill className="h-6 w-6 text-primary" />
          <CardTitle>{t('orderMedicationCard.title')}</CardTitle>
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-x-3 pb-2">
        <Pill className="h-6 w-6 text-primary" />
        <CardTitle>{t('orderMedicationCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="latest">Latest Rx</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="reorders">Reorders</TabsTrigger>
          </TabsList>

          <TabsContent value="latest">
            {medications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('orderMedicationCard.noMedication')}</p>
                <Button onClick={() => navigate('/pharmacy')} variant="outline">
                  {t('orderMedicationCard.orderNew')}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">{t('orderMedicationCard.fromLatestPrescription')}</p>
                <div className="space-y-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-muted-foreground">
                        <th className="text-left font-medium pb-2">{t('orderMedicationCard.medicine')}</th>
                        <th className="text-right font-medium pb-2">{t('orderMedicationCard.quantity')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {medications.map((med, index) => (
                        <tr key={index} className="group">
                          <td className="py-2 text-sm">{med.name}</td>
                          <td className="text-right py-2 flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={medicationQuantities[med.name] || ''}
                              onChange={(e) => handleQuantityChange(med.name, e.target.value)}
                              className="w-20 h-8"
                            />
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              value={medicationTypes[med.name] || 'auto'}
                              onChange={(e) => handleTypeChange(med.name, e.target.value as 'pack' | 'unit' | 'auto')}
                            >
                              <option value="auto">Auto</option>
                              <option value="pack">Pack</option>
                              <option value="unit">Unit</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button onClick={handleOrderNow} className="w-full">
                    {t('orderMedicationCard.orderNow')}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="history">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No past orders found.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'PPP')}
                        </div>
                      </div>
                      <Badge variant={order.status === 'pending' ? 'outline' : 'default'}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {Array.isArray(order.items) ? (
                        <ul className="list-disc list-inside">
                          {order.items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.displayName || item.name} x {item.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{order.items.length} items</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">₹{order.total_amount}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleReorder(order.items)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Reorder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reorders">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active subscriptions.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)} Subscription
                          {sub.status === 'cancelled' && <Badge variant="destructive" className="text-[10px] h-5">Cancelled</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Next run: {format(new Date(sub.next_run_date), 'PPP')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {Array.isArray(sub.items) ? (
                        <ul className="list-disc list-inside">
                          {sub.items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.displayName || item.name} x {item.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{sub.items.length} items</span>
                      )}
                    </div>
                    {sub.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => handleCancelSubscription(sub.id)}
                        disabled={cancellingSub === sub.id}
                      >
                        {cancellingSub === sub.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderMedicationCard;
