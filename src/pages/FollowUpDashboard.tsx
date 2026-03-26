
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Phone, MessageSquare, Calendar as CalendarIcon, MapPin, ClipboardList } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { Consultation } from '@/types/consultation';
import { useConsultant } from '@/context/ConsultantContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConsultationCard from '@/components/consultation/ConsultationCard';

const FollowUpDashboard = () => {
  const { consultant, isMasterAdmin } = useConsultant();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 7)); // Default to 1 week from now
  const [followUpList, setFollowUpList] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    if (selectedDate && (consultant || isMasterAdmin)) {
      fetchFollowUps(selectedDate);
    }
  }, [selectedDate, consultant, isMasterAdmin]);

  const fetchFollowUps = async (date: Date) => {
    setIsLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      let query = supabase
        .from('consultations')
        .select('*, patient:patients(*)')
        .eq('next_review_date', formattedDate);

      if (!isMasterAdmin && consultant?.id) {
        query = query.eq('consultant_id', consultant.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setFollowUpList(data as any || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      toast.error('Failed to fetch follow-up list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppReminder = async (consultation: Consultation) => {
    const phone = consultation.patient.phone;
    if (!phone) {
      toast.error('Patient phone number missing.');
      return;
    }

    const message = `Hello ${consultation.patient.name}, this is a reminder regarding your scheduled follow-up review on ${format(selectedDate!, 'PPP')} at OrthoLife. Please contact us to confirm your visit.`;
    
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { number: phone, message },
      });

      if (error) throw error;
      toast.success(`Reminder sent to ${consultation.patient.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send WhatsApp reminder.');
      // Fallback: Open WhatsApp Web
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    }
  };

  const handleCallPatient = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-7xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 text-2xl font-bold text-primary mb-2">
            <ClipboardList className="w-7 h-7" />
            Follow-up Dashboard
          </div>
          <p className="text-lg text-muted-foreground">
            Track and manage patients due for review
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Calendar Picker */}
          <Card className="lg:col-span-1 shadow-md border-0 bg-card/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Select Review Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mx-auto"
                disabled={(date) => date < startOfToday()}
              />
            </CardContent>
          </Card>

          {/* Follow-up List */}
          <Card className="lg:col-span-3 shadow-md border-0 bg-card/95 backdrop-blur h-full min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Due for Review</CardTitle>
                <CardDescription>
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                </CardDescription>
              </div>
              <div className="text-2xl font-bold text-primary">
                {followUpList.length}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : followUpList.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead>Instruction</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followUpList.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <button 
                                onClick={() => setSelectedConsultation(c)}
                                className="font-medium text-left hover:underline text-primary"
                              >
                                {c.patient.name}
                              </button>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {c.patient.phone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="w-3 h-3" /> {c.location}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm italic text-muted-foreground">
                            {c.consultation_data?.followup || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                                onClick={() => handleWhatsAppReminder(c)}
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleCallPatient(c.patient.phone)}
                                title="Call Patient"
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <User className="w-12 h-12 mb-4 opacity-20" />
                  <p>No patients scheduled for review on this date.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details Modal */}
        <Dialog open={!!selectedConsultation} onOpenChange={(open) => !open && setSelectedConsultation(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Last Consultation Summary</DialogTitle>
            </DialogHeader>
            {selectedConsultation && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase font-semibold">Patient</label>
                    <p className="font-medium text-lg">{selectedConsultation.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedConsultation.patient.phone}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-xs text-muted-foreground uppercase font-semibold">Last Visit</label>
                    <p className="font-medium">{format(new Date(selectedConsultation.created_at), 'PPP')}</p>
                    <p className="text-sm text-muted-foreground">{selectedConsultation.location}</p>
                  </div>
                </div>

                {selectedConsultation.consultation_data && (
                  <ConsultationCard data={selectedConsultation.consultation_data} />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FollowUpDashboard;
