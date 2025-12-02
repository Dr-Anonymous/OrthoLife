
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import { Badge } from '@/components/ui/badge';
import ConsultationRegistration from '@/components/ConsultationRegistration';
import { useLocation } from 'react-router-dom';
import { HOSPITALS } from '@/config/constants';
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/Prescription';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const PatientRegistration = () => {
  const [todaysConsultations, setTodaysConsultations] = useState<any[]>([]);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const location = useLocation();
  const { i18n } = useTranslation();
  const [printingConsultation, setPrintingConsultation] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const getLocationName = () => {
    if (location.pathname.includes('/badam')) return 'Badam';
    if (location.pathname.includes('/laxmi')) return 'Laxmi';
    if (location.pathname.includes('/ortholife')) return 'OrthoLife';
    return 'Badam'; // Default fallback
  };

  const locationName = getLocationName();
  const hospital = HOSPITALS.find(h => h.name === locationName);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => setPrintingConsultation(null),
  });

  useEffect(() => {
    if (printingConsultation) {
      handlePrint();
    }
  }, [printingConsultation, handlePrint]);

  const fetchTodaysConsultations = async () => {
    setIsFetchingConsultations(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-consultations', {
        body: { date: format(new Date(), 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTodaysConsultations(data.consultations || []);
    } catch (error) {
      console.error('Error fetching today\'s consultations:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching consultations',
        description: (error as Error).message,
      });
    } finally {
      setIsFetchingConsultations(false);
    }
  };

  useEffect(() => {
    fetchTodaysConsultations();
  }, []);

  const filteredConsultations = todaysConsultations.filter(
    c => c.consultation_data?.location === locationName
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold text-primary">
              {hospital && <img src={hospital.logoUrl} alt={`${locationName} Logo`} className="h-32" />}
              Patient Registration
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Register new patients and create consultations for {locationName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <ConsultationRegistration onSuccess={fetchTodaysConsultations} location={locationName} />
          </CardContent>
        </Card>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-center">Today's Consultations at {locationName} ({filteredConsultations.length})</h3>
          {isFetchingConsultations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredConsultations.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {filteredConsultations.map(c => (
                <div key={c.id} className="bg-card border p-3 rounded-lg shadow-sm w-full max-w-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{c.patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(new Date(c.patient.dob))}Y / {c.patient.sex} / {c.patient.phone}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={c.status === 'completed' ? 'secondary' : c.status === 'under_evaluation' ? 'warning' : 'default'}>
                        {c.status}
                      </Badge>
                      {c.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPrintingConsultation(c)}
                        >
                          <Printer className="h-4 w-4" />
                          <span className="sr-only">Print Prescription</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No consultations scheduled for today at {locationName}.</p>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}>
          {printingConsultation && (
            <Prescription
              patient={printingConsultation.patient}
              consultation={printingConsultation.consultation_data}
              consultationDate={new Date(printingConsultation.created_at)}
              age={calculateAge(new Date(printingConsultation.patient.dob))}
              language={i18n.language}
              logoUrl={hospital?.logoUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRegistration;
