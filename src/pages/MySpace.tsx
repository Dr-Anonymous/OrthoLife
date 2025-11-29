import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LanguagePreferenceModal from '@/components/LanguagePreferenceModal';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import AppointmentsCard from '@/components/AppointmentsCard';
import PrescriptionsCard from '@/components/PrescriptionsCard';
import TestResultsCard from '@/components/TestResultsCard';
import { supabase } from '@/integrations/supabase/client';
import OrderMedicationCard from '@/components/OrderMedicationCard';
import OrderTestsCard from '@/components/OrderTestsCard';
import DietAndExercisesCard from '@/components/DietAndExercisesCard';
import PatientSelectionModal from '@/components/PatientSelectionModal';

const MySpace = () => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [medications, setMedications] = useState<any[]>([]);
  const [investigations, setInvestigations] = useState<string>('');
  const [advice, setAdvice] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [patientPhone, setPatientPhone] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [isPatientSelectionModalOpen, setIsPatientSelectionModalOpen] = useState(false);
  const [patientList, setPatientList] = useState<any[]>([]);
  const [isSelectionPending, setIsSelectionPending] = useState(true);

  useEffect(() => {
    const hasSetLanguage = localStorage.getItem('languageSet');
    if (!hasSetLanguage) {
      setIsLanguageModalOpen(true);
    } else {
      setIsLanguageSelected(true);
    }
  }, []);

  const handleModalClose = () => {
    localStorage.setItem('languageSet', 'true');
    setIsLanguageModalOpen(false);
    setIsLanguageSelected(true);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchPatientData = async (patientId?: string) => {
    if (!authLoading && user?.phoneNumber) {
      try {
        setLoading(true);
        const phoneNumber = user.phoneNumber.slice(-10);
        const { data, error } = await supabase.functions.invoke('search-patients', {
          body: patientId ? { patientId } : { searchTerm: phoneNumber, searchType: 'phone' },
        });

        if (error) throw new Error(`Error fetching patient data: ${error.message}`);

        if (Array.isArray(data) && data.length > 1) {
          setPatientList(data);
          setIsPatientSelectionModalOpen(true);
        } else {
          const patientData = Array.isArray(data) ? data[0] : data;
          setMedications(patientData?.medications || []);
          setInvestigations(patientData?.investigations || '');
          setAdvice(patientData?.advice || '');
          setPatientName(patientData?.name || '');
          setPatientId(patientData?.id || undefined);
          setPatientPhone(patientData?.phone || undefined);
          setIsSelectionPending(false);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else if (!authLoading) {
      setLoading(false);
      setIsSelectionPending(false);
    }
  };

  useEffect(() => {
    if (isLanguageSelected) {
      fetchPatientData();
    }
  }, [user, authLoading, isLanguageSelected]);

  const handlePatientSelect = (selectedPatient: any) => {
    setIsPatientSelectionModalOpen(false);
    fetchPatientData(selectedPatient.id);
  };

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
              <h1 className="text-3xl font-bold text-gray-800">
                {patientName ? `${t('mySpace.welcome')}, ${patientName}` : t('mySpace.welcome')}
              </h1>
              {patientName && <p className="mt-1 text-lg text-gray-600">{t('mySpace.dashboardDescription')}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
              <div className="flex items-center gap-4">
                <LanguageSwitcher />
                {patientList.length > 1 && (
                  <Button onClick={() => setIsPatientSelectionModalOpen(true)} variant="outline">
                    {t('mySpace.switchPatient')}
                  </Button>
                )}
                <Button onClick={handleLogout} variant="outline">
                  <LogOut className="mr-2 h-4 w-4" /> {t('mySpace.logout')}
                </Button>
              </div>
              {user?.phoneNumber && <p className="text-sm text-gray-600"><strong>{user.phoneNumber}</strong></p>}
            </div>
          </header>

          <LanguagePreferenceModal isOpen={isLanguageModalOpen} onClose={handleModalClose} />
          <PatientSelectionModal
            isOpen={isPatientSelectionModalOpen}
            patients={patientList}
            onSelect={handlePatientSelect}
          />

          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">

            {loading || isSelectionPending ? (
              <>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
                <div className="lg:col-span-1 p-4 bg-gray-100 rounded-lg h-48 animate-pulse"></div>
              </>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <DietAndExercisesCard advice={advice} />
                <AppointmentsCard />
                <OrderMedicationCard medications={medications} />
                <OrderTestsCard investigations={investigations} />
                <PrescriptionsCard patientId={patientId} patientPhone={patientPhone} />
                <TestResultsCard />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpace;
