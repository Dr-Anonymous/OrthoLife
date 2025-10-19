import React, { useEffect } from 'react';
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
import PrescriptionOrders from '@/components/PrescriptionOrders';

const MySpace = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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
            <TestResultsCard />
            <PrescriptionOrders />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpace;