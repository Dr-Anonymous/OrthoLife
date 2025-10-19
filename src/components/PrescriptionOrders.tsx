import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OrderMedicationCard from '@/components/OrderMedicationCard';
import OrderTestsCard from '@/components/OrderTestsCard';

const PrescriptionOrders = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescription = async () => {
      if (user?.phoneNumber) {
        try {
          setLoading(true);
          const phoneNumber = user.phoneNumber.slice(-10);
          const { data, error } = await supabase.functions.invoke('get-latest-prescription', {
            body: { phoneNumber },
          });

          if (error) throw new Error(`Error fetching prescription: ${error.message}`);

          setMedications(data?.medications || []);
          setInvestigations(data?.investigations || '');
          setPatientName(data?.patientName || '');

        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [user]);

  if (loading) {
    return (
        <>
            <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
            <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
        </>
    );
  }

  if (error) {
    return (
        <>
            <p className="text-red-500">{error}</p>
            <p className="text-red-500">{error}</p>
        </>
    )
  }

  return (
    <>
      <OrderMedicationCard medications={medications} patientName={patientName} />
      <OrderTestsCard investigations={investigations} patientName={patientName} />
    </>
  );
};

export default PrescriptionOrders;