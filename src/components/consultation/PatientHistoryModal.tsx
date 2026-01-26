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
 */
const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({ isOpen, onClose, patientId }) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Patient Consultation History</DialogTitle>
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
                <div key={item.id} className="mb-8 relative">
                  <div className="absolute -left-5 top-1.5 h-4 w-4 rounded-full bg-primary"></div>
                  <div className="pl-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })} ({format(new Date(item.created_at), 'PPP')})
                        </p>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{item.location}</p>
                        </div>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <ConsultationCard data={item.consultation_data} />
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
