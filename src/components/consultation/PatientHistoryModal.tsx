import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ConsultationCard from './ConsultationCard';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName?: string;
  onSelectConsultation?: (consultation: any) => void;
}

/**
 * PatientHistoryModal Component
 * 
 * Displays the complete consultation history for a specific patient.
 * Features:
 * - Fetches data via `get-consultations` Edge Function.
 * - Shows Timeline view of consultations.
 * - Integration with `ConsultationCard` for detailed view.
 * - Handles loading and error states.
 * - Clickable consultations to load into main view
 */
const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({ isOpen, onClose, patientId, patientName, onSelectConsultation }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!patientId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-consultations', {
          body: { patientId: patientId },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setHistory(data.consultations || []);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching patient history',
          description: (error as Error).message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, patientId]);

  const handleConsultationClick = (item: any) => {
    if (onSelectConsultation) {
      onSelectConsultation({
        ...item,
        patient_id: patientId || item.patient_id || item.patient?.id
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consultation History {patientName ? `of ${patientName}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground">No past consultations found.</div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-3 top-0 h-full w-0.5 bg-border"></div>
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`mb-8 relative ${onSelectConsultation ? 'cursor-pointer hover:bg-muted/30 rounded-lg p-2 transition-colors' : ''}`}
                  onClick={() => handleConsultationClick(item)}
                >
                  <div className="absolute -left-5 top-1.5 h-4 w-4 rounded-full bg-primary"></div>
                  <div className="pl-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <ConsultationCard
                        data={{
                          ...item.consultation_data,
                          referred_by: item.referred_by,
                          created_at: item.created_at,
                          location: item.location,
                          visit_type: item.visit_type,
                          status: item.status,
                          blood_group: item.patient?.blood_group,
                          allergies: item.patient?.allergies,
                          sex: item.patient?.sex,
                          dob: item.patient?.dob,
                          consultant_name: typeof item.consultant?.name === 'object'
                            ? item.consultant.name.en
                            : (item.consultant?.name || '')
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientHistoryModal;
