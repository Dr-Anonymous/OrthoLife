
import React, { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Printer, Pencil, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import { cleanConsultationData } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ConsultationRegistration from '@/components/consultation/ConsultationRegistration';
import { useLocation } from 'react-router-dom';
import { useHospitals } from '@/context/HospitalsContext';
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/consultation/Prescription';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PatientEditModal } from '@/components/consultation/PatientEditModal';
import { Patient } from '@/types/consultation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const PatientRegistration = () => {
  const isOnline = useOnlineStatus();
  const { hospitals } = useHospitals();
  const [todaysConsultations, setTodaysConsultations] = useState<any[]>([]);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const location = useLocation();
  const { i18n } = useTranslation();
  const [printingConsultation, setPrintingConsultation] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const getLocationName = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/badam')) return 'Badam';
    if (path.includes('/laxmi')) return 'Laxmi';
    if (path.includes('/ortholife')) return 'OrthoLife';
    return 'OrthoLife'; // Default fallback
  };

  const locationName = getLocationName();
  const hospital = hospitals.find(h => h.name === locationName);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintingConsultation(null),
  });

  useEffect(() => {
    if (printingConsultation) {
      // Small timeout to ensure state update has propagated to the hidden component
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }, [printingConsultation, handlePrint]);

  const handleDelete = async (c: any) => {
    if (!window.confirm("Are you sure you want to delete this consultation?")) return;

    try {
      // Offline Deletion
      if (String(c.id).startsWith('offline-') || String(c.patient_id).startsWith('offline-')) {
        // Identify the correct key. Use patient_id if it's an offline key (most common for new registrations), else consultation id.
        const key = String(c.patient_id).startsWith('offline-') ? c.patient_id : c.id;
        await offlineStore.removeItem(key);
        setTodaysConsultations(prev => prev.filter(x => x.id !== c.id));
        toast({ title: "Deleted", description: "Offline consultation removed." });
        return;
      }

      // Online Deletion
      // Check if this is the only consultation for the patient
      const { count } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', c.patient.id);

      const isLast = count === 1;

      const { error } = await supabase.from('consultations').delete().eq('id', c.id);
      if (error) throw error;

      if (isLast) {
        const { error: pError } = await supabase.from('patients').delete().eq('id', c.patient.id);
        if (pError) console.error("Error deleting patient", pError);
      }

      setTodaysConsultations(prev => prev.filter(x => x.id !== c.id));
      toast({ title: "Deleted", description: "Consultation deleted." });

    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to delete." });
    }
  };

  const fetchTodaysConsultations = async () => {
    setIsFetchingConsultations(true);
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const cacheKey = `server_cache_${selectedDateStr}`;

    try {
      // 1. Load Local + Cached Data FIRST (Stale-While-Revalidate)
      const keys = await offlineStore.keys();
      const localConsultations: any[] = [];
      let cachedServerData: any[] = [];

      // Get pending offline items
      for (const key of keys) {
        if (String(key).startsWith('offline-')) {
          const item = await offlineStore.getItem(key) as any;

          let consultation = null;
          // Structure check: new_patient registration saves { type: 'new_patient', consultation: ... }
          if (item?.type === 'new_patient' && item.consultation) {
            consultation = item.consultation;
          }
          // Structure check: standalone offline consultation might be saved directly or differently
          else if (item?.consultation) {
            consultation = item.consultation;
          }
          else if (item?.status && item?.patient_id) {
            // Fallback if saved as flat consultation object
            consultation = item;
          }

          if (consultation) {
            const generatedDate = format(new Date(consultation.created_at), 'yyyy-MM-dd');
            if (generatedDate === selectedDateStr) {
              localConsultations.push(consultation);
            }
          }
        }
      }

      // Get cached server data
      try {
        const cached = await offlineStore.getItem(cacheKey) as any[];
        if (cached && Array.isArray(cached)) {
          cachedServerData = cached;
        }
      } catch (e) {
        console.warn('Error reading server cache', e);
      }

      // Show immediate data (Optimistic UI)
      // Deduping: local items might be in server/cached list if previously synced but offline-key not removed yet? 
      // Actually offline- keys are removed on sync. So simple concat is fine usually.
      setTodaysConsultations([...localConsultations, ...cachedServerData]);

      if (isOnline) {
        // 2. Fetch Fresh Server Data
        const { data, error } = await supabase.functions.invoke('get-consultations', {
          body: { date: selectedDateStr },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const serverConsultations = data.consultations || [];

        // 3. Update Cache & State
        await offlineStore.setItem(cacheKey, serverConsultations);
        setTodaysConsultations([...localConsultations, ...serverConsultations]);
      }

    } catch (error: any) {
      console.error('Error fetching today\'s consultations:', error);

      const isNetworkError = error.message?.includes('Failed to send a request') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError');

      if (!isNetworkError) {
        toast({
          variant: 'destructive',
          title: 'Error fetching consultations',
          description: (error as Error).message,
        });
      }
    } finally {
      setIsFetchingConsultations(false);
    }
  };

  useEffect(() => {
    fetchTodaysConsultations();
  }, [selectedDate]);

  const filteredConsultations = todaysConsultations.filter(
    c => c.location?.toLowerCase() === locationName.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-4 text-2xl sm:text-3xl font-bold text-primary">
              {hospital && <img src={hospital.logoUrl} alt={`${locationName} Logo`} className="h-24 sm:h-32 object-contain" />}
              <span>Patient Registration</span>
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Register new patients and create consultations for {locationName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <ConsultationRegistration onSuccess={fetchTodaysConsultations} location={locationName} existingConsultations={filteredConsultations} />
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <h3 className="text-xl font-semibold text-center">
              Consultations at {locationName} ({filteredConsultations.length})
            </h3>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  {selectedDate ? (format(selectedDate, "PPP")) : (<span>Pick a date</span>)}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
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
                      <div className="text-sm text-muted-foreground">
                        <div>{calculateAge(new Date(c.patient.dob))}Y / {c.patient.sex}</div>
                        <a href={`tel:${c.patient.phone}`} className="hover:underline block mt-1">{c.patient.phone}</a>
                        {c.patient.secondary_phone && (
                          <a href={`tel:${c.patient.secondary_phone}`} className="hover:underline block text-xs mt-1 text-muted-foreground">Alt: {c.patient.secondary_phone}</a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingPatient(c.patient);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit Patient</span>
                        </Button>

                        {c.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Consultation</span>
                          </Button>
                        )}

                        {c.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPrintingConsultation(c)}
                            disabled={!!printingConsultation}
                          >
                            {printingConsultation?.id === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                            <span className="sr-only">Print Prescription</span>
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize border-transparent",
                            c.visit_type === 'free'
                              ? "bg-white text-black border border-gray-200 hover:bg-gray-50"
                              : "bg-green-600 text-white hover:bg-green-700"
                          )}
                        >
                          {c.visit_type}
                        </Badge>
                        <Badge variant={c.status === 'completed' ? 'secondary' : c.status === 'under_evaluation' ? 'secondary' : 'default'} className={c.status === 'under_evaluation' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}>
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No consultations scheduled.</p>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}>
          {printingConsultation ? (
            <Prescription
              patient={printingConsultation.patient}
              consultation={cleanConsultationData(printingConsultation.consultation_data)}
              consultationDate={new Date(printingConsultation.created_at)}
              age={calculateAge(new Date(printingConsultation.patient.dob))}
              language={printingConsultation.language || i18n.language}
              logoUrl={hospital?.logoUrl}
              visitType={printingConsultation.visit_type}
              className="min-h-[297mm]"
              forceDesktop={true}
            />
          ) : (
            <div />
          )}
        </div>
      </div>
      <PatientEditModal
        patient={editingPatient}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={fetchTodaysConsultations}
      />
    </div >
  );
};

export default PatientRegistration;
