import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Stethoscope, Pill, FileText, MapPin, NotebookText, Syringe, Share } from 'lucide-react';
import { format } from 'date-fns';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
}

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
              {history.map((item, index) => (
                <div key={item.id} className="mb-8 relative">
                  <div className="absolute -left-5 top-1.5 h-4 w-4 rounded-full bg-primary"></div>
                  <div className="pl-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold">{format(new Date(item.created_at), 'PPP')}</p>
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
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      {(item.consultation_data?.diagnosis || item.consultation_data?.complaints) && (
                        <div className="flex items-start gap-3">
                          <Stethoscope className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">{item.consultation_data.diagnosis ? 'Diagnosis' : 'Complaints'}</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.consultation_data.diagnosis || item.consultation_data.complaints}
                            </p>
                          </div>
                        </div>
                      )}
                      {item.consultation_data?.medications?.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Pill className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">Medications</h4>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground">
                              {item.consultation_data.medications.map((med: any, index: number) => (
                                <li key={index}>{med.name} - {med.dose}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {item.consultation_data?.procedure && (
                        <div className="flex items-start gap-3">
                          <Syringe className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">Procedure Done</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.consultation_data.procedure}</p>
                          </div>
                        </div>
                      )}
                      {item.consultation_data?.advice && (
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">Advice</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.consultation_data.advice}</p>
                          </div>
                        </div>
                      )}
                      {item.consultation_data?.personalNote && (
                        <div className="flex items-start gap-3">
                          <NotebookText className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">Doctor's Note</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.consultation_data.personalNote}</p>
                          </div>
                        </div>
                      )}
                      {item.consultation_data?.referred_to && (
                        <div className="flex items-start gap-3">
                          <Share className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <h4 className="font-semibold">Referred To</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.consultation_data.referred_to}</p>
                          </div>
                        </div>
                      )}
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
