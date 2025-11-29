import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Pill, RotateCw, History, CalendarClock, Ban, ShoppingBag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    medications.forEach(med => {
      initialQuantities[med.name] = calculateQuantity(med);
    });
    setMedicationQuantities(initialQuantities);
  }, [medications]);

  // Fetch Orders and Subscriptions when user is available
  useEffect(() => {
    if (user) {
        fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        setOrders(ordersData || []);

        const { data: subsData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        setSubscriptions(subsData || []);

      } catch (error) {
          console.error("Error fetching history:", error);
      } finally {
          setIsLoadingHistory(false);
      }
  };

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

  const handleReorder = (items: any[]) => {
      const query = items
      .map((item: any) => `${encodeURIComponent(cleanMedicationName(item.name))}*${item.quantity}`)
      .join(',');
      navigate(`/pharmacy?q=${query}`);
  }

  const handleCancelSubscription = async (subId: string) => {
      try {
          const { error } = await supabase
              .from('subscriptions')
              .update({ status: 'cancelled' })
              .eq('id', subId);

          if (error) throw error;

          toast.success("Subscription cancelled successfully.");
          fetchHistory(); // Refresh list
      } catch (err) {
          console.error("Error cancelling subscription:", err);
          toast.error("Failed to cancel subscription.");
      }
  }

  return (
    <Card className="w-full">
      <CardHeader>
          <div className="flex flex-row items-center space-x-3">
            <Pill className="h-6 w-6 text-primary" />
            <CardTitle>Medication Orders</CardTitle>
          </div>
          <CardDescription>Manage your prescriptions and orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prescription" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescription">Latest Rx</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="reorders">Reorders</TabsTrigger>
          </TabsList>

          {/* Tab 1: Latest Prescription */}
          <TabsContent value="prescription" className="mt-4">
            {medications.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">{t('orderMedicationCard.noMedication')}</p>
                    <Button onClick={() => navigate('/pharmacy')} className="w-full">
                        {t('orderMedicationCard.orderNew')}
                    </Button>
                </div>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground mb-4">{t('orderMedicationCard.fromLatestPrescription')}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full mb-4">
                        <thead>
                            <tr className="border-b">
                            <th className="text-left py-2 font-medium">{t('orderMedicationCard.medicine')}</th>
                            <th className="text-right py-2 font-medium w-24">{t('orderMedicationCard.quantity')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {medications.map((med, index) => (
                            <tr key={index} className="border-b last:border-0">
                                <td className="py-2 text-sm">{med.name}</td>
                                <td className="text-right py-2">
                                <Input
                                    type="number"
                                    value={medicationQuantities[med.name] || ''}
                                    onChange={(e) => handleQuantityChange(med.name, e.target.value)}
                                    className="w-20 ml-auto h-8"
                                />
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    <Button onClick={handleOrderNow} className="w-full gap-2">
                        <ShoppingBag className="w-4 h-4"/> {t('orderMedicationCard.orderNow')}
                    </Button>
                </>
            )}
          </TabsContent>

          {/* Tab 2: Order History */}
          <TabsContent value="history" className="mt-4 space-y-4">
             {isLoadingHistory ? (
                 <p className="text-center py-4">Loading history...</p>
             ) : orders.length === 0 ? (
                 <div className="text-center py-6 text-muted-foreground">
                     <History className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                     <p>No past orders found.</p>
                 </div>
             ) : (
                 <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                     {orders.map((order) => (
                         <div key={order.id} className="border rounded-lg p-3 space-y-2">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <p className="font-medium text-sm">
                                         {new Date(order.created_at).toLocaleDateString()}
                                     </p>
                                     <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="mt-1 text-xs">
                                         {order.status}
                                     </Badge>
                                 </div>
                                 <div className="text-right">
                                     <p className="font-bold">₹{order.total_amount}</p>
                                     <p className="text-xs text-muted-foreground">{order.items?.length} items</p>
                                 </div>
                             </div>
                             <div className="text-xs text-muted-foreground line-clamp-2">
                                 {order.items?.map((i: any) => i.name).join(', ')}
                             </div>
                             <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleReorder(order.items)}>
                                 <RotateCw className="w-3 h-3 mr-2"/> Reorder
                             </Button>
                         </div>
                     ))}
                 </div>
             )}
          </TabsContent>

          {/* Tab 3: Subscriptions (Reorders) */}
          <TabsContent value="reorders" className="mt-4 space-y-4">
            {isLoadingHistory ? (
                 <p className="text-center py-4">Loading subscriptions...</p>
             ) : subscriptions.length === 0 ? (
                 <div className="text-center py-6 text-muted-foreground">
                     <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                     <p>No active auto-reorders.</p>
                     <Button variant="link" onClick={() => navigate('/pharmacy')} className="mt-2">
                         Setup in Pharmacy
                     </Button>
                 </div>
             ) : (
                 <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                     {subscriptions.map((sub) => (
                         <div key={sub.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <div className="flex items-center gap-2">
                                         <p className="font-medium text-sm">Every {sub.frequency_months} Month(s)</p>
                                         <Badge variant={sub.status === 'active' ? 'default' : 'destructive'} className="text-[10px] px-1 py-0 h-5">
                                             {sub.status}
                                         </Badge>
                                     </div>
                                     <p className="text-xs text-muted-foreground mt-1">
                                         Next: {new Date(sub.next_run_date).toLocaleDateString()}
                                     </p>
                                 </div>
                             </div>
                             <div className="text-xs text-muted-foreground">
                                 {sub.items?.map((i: any) => i.name).join(', ')}
                             </div>
                             {sub.status === 'active' && (
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-destructive hover:text-destructive"
                                        onClick={() => handleCancelSubscription(sub.id)}
                                    >
                                        <Ban className="w-3 h-3 mr-2"/> Cancel Auto-reorder
                                    </Button>
                                </div>
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
