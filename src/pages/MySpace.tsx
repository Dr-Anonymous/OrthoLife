import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppointmentsCard from '@/components/AppointmentsCard';
import PrescriptionsCard from '@/components/PrescriptionsCard';
import TestResultsCard from '@/components/TestResultsCard';
import { supabase } from '@/integrations/supabase/client';
import OrderMedicationCard from '@/components/OrderMedicationCard';
import OrderTestsCard from '@/components/OrderTestsCard';
import DietAndExercisesCard from '@/components/DietAndExercisesCard';

const MySpace = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [medications, setMedications] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<string>('');
  const [advice, setAdvice] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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
          setAdvice(data?.advice || '');
          setPatientName(data?.patientName || '');

        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [user, authLoading]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome to My Space</h1>
              {user?.phoneNumber && <p className="mt-1 text-lg text-gray-600">Your personal health dashboard (<strong>{user.phoneNumber}</strong>).</p>}
            </div>
            <Button onClick={handleLogout} variant="outline" className="mt-4 sm:mt-0">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </header>

          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
            <AppointmentsCard />
            <PrescriptionsCard />
            {loading ? (
              <>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
              </>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <OrderMedicationCard medications={medications} patientName={patientName} />
                <OrderTestsCard investigations={investigations} patientName={patientName} />
                <DietAndExercisesCard advice={advice} patientName={patientName} />
              </>
            )}
            <TestResultsCard />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpace;