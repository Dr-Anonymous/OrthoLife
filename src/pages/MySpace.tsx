import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, FileText, AlertCircle, User, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const MySpace = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [whatsappRecords, setWhatsappRecords] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      if (user?.phoneNumber) {
        try {
          setLoading(true);
          const phoneNumber = user.phoneNumber;

          // Fetch both sets of records in parallel
          const [whatsappRes, patientRes] = await Promise.all([
            supabase.functions.invoke('search-whatsappme-records', {
              body: { phoneNumber },
            }),
            supabase.functions.invoke('search-patient-records', {
              body: { phoneNumber },
            }),
          ]);

          if (whatsappRes.error) throw new Error(`Error fetching WhatsApp records: ${whatsappRes.error.message}`);
          if (patientRes.error) throw new Error(`Error fetching patient records: ${patientRes.error.message}`);

          setWhatsappRecords(whatsappRes.data);
          setPatientRecords(patientRes.data.patientFolders || []);

        } catch (err: any) {
          setError(err.message);
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setError("No phone number associated with your account. Please re-login.");
        setLoading(false);
      }
    };

    fetchData();
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
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pt-24">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome to My Space</h1>
              {user?.phoneNumber && <p className="mt-1 text-lg text-gray-600">Your personal health dashboard for <strong>{user.phoneNumber}</strong></p>}
            </div>
            <Button onClick={handleLogout} variant="outline" className="mt-4 sm:mt-0">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </header>

          {loading && <div className="text-center py-10"><PageLoader /></div>}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && (
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader className="flex flex-row items-center space-x-3">
                  <Briefcase className="h-6 w-6 text-primary" />
                  <CardTitle>My Patient Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {patientRecords.length > 0 ? (
                    <ul className="space-y-3">
                      {patientRecords.map((record: any) => (
                        <a key={record.id} href={`https://drive.google.com/drive/folders/${record.id}`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                          <p className="font-medium text-gray-800">{record.name}</p>
                        </a>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No patient records found.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-x-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <CardTitle>My Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {whatsappRecords?.calendarEvents?.length > 0 ? (
                    <ul className="space-y-3">
                      {whatsappRecords.calendarEvents.map((event: any, index: number) => (
                        <li key={index} className="p-4 bg-gray-100 rounded-lg">
                          <p className="font-semibold text-gray-800">{new Date(event.start).toLocaleString()}</p>
                          <p className="text-gray-600 mt-1">{event.description || 'No description'}</p>
                          {event.attachments && <a href={event.attachments} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">View Attachment</a>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No appointments found.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center space-x-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle>WhatsApp Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {whatsappRecords?.patientFolders?.length > 0 ? (
                      <ul className="space-y-3">
                        {whatsappRecords.patientFolders.map((record: any) => (
                          <a key={record.id} href={`https://drive.google.com/drive/folders/${record.id}`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            <p className="font-medium text-gray-800">{record.name}</p>
                          </a>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No WhatsApp records found.</p>
                    )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpace;