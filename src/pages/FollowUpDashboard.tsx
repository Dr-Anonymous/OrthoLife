
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Phone, MessageSquare, Calendar as CalendarIcon, MapPin, ClipboardList, IndianRupee, Send } from 'lucide-react';
import { format, formatDistanceToNow, addDays, startOfToday } from 'date-fns';
import { Consultation } from '@/types/consultation';
import { useConsultant } from '@/context/ConsultantContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConsultationCard from '@/components/consultation/ConsultationCard';
import { useHospitals } from '@/context/HospitalsContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, Check, X } from 'lucide-react';
import { cn, stripFollowUpPrefix } from '@/lib/utils';
import { DoctorLoginGate } from '@/components/consultation/DoctorLoginGate';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SchedulePopover } from '@/components/SchedulePopover';
import { scheduleService } from '@/utils/scheduleService';
import { getLocalDateTime } from '@/utils/dateUtils';


const FollowUpDashboard = () => {
  const { consultant, isMasterAdmin, isLoading: isConsultantLoading } = useConsultant();
  const { hospitals } = useHospitals();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedVisitType, setSelectedVisitType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());
  const [followUpList, setFollowUpList] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [whatsappPreviewVisible, setWhatsappPreviewVisible] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [targetConsultation, setTargetConsultation] = useState<Consultation | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [fetchAll, setFetchAll] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");


  useEffect(() => {
    if (selectedDate && (consultant || isMasterAdmin)) {
      fetchFollowUps(selectedDate, selectedLocation, selectedVisitType);
    }
  }, [selectedDate, selectedLocation, selectedVisitType, consultant, isMasterAdmin, fetchAll]);


  const fetchFollowUps = async (date: Date, location: string, visitType: string) => {
    setIsLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');

      let query = supabase
        .from('consultations')
        .select('*, patient:patients(*)')
        .eq('next_review_date', formattedDate);

      if (!fetchAll && consultant?.id) {
        query = query.eq('consultant_id', consultant.id);
      }


      if (location && location !== 'all') {
        query = query.eq('location', location);
      }

      if (visitType && visitType !== 'all') {
        query = query.eq('visit_type', visitType);
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

  const handleWhatsAppReminder = (consultation: Consultation) => {
    const phone = consultation.patient.phone;
    if (!phone || phone === '0000000000') {
      toast.error('Patient does not have a registered phone number.');
      return;
    }

    const isTelugu = consultation.language === 'te';
    const formattedDate = format(selectedDate!, 'PPP');

    const defaultMessage = isTelugu
      ? `నమస్కారం ${consultation.patient.name} గారు, 🙏\n\nOrthoLife నుండి మీకు చిన్న రిమైండర్. 🏥\n\n🗓️ మీ రివ్యూ పర్యవేక్షణ (follow-up): ${formattedDate}\n\nదయచేసి మీ రాకను ఖరారు (confirm) చేసుకోవడానికి మమ్మల్ని సంప్రదించండి. 📞\n\nధన్యవాదాలు!`
      : `Hello ${consultation.patient.name}, 👋\n\nThis is a reminder from OrthoLife regarding your scheduled follow-up. 🏥\n\n🗓️ Scheduled Review: ${formattedDate}\n\nPlease contact us to confirm your visit. 📞\n\nThank you!`;

    setWhatsappMessage(defaultMessage);
    setTargetConsultation(consultation);
    setWhatsappPreviewVisible(true);
  };

  const confirmAndSendWhatsApp = async () => {
    if (!targetConsultation || !consultant) return;

    const phone = targetConsultation.patient.phone;
    setIsSendingWhatsApp(true);

    try {
      const scheduledDateTime = scheduledDate ? getLocalDateTime(scheduledDate, scheduledTime) : undefined;
      if (scheduledDate && !scheduledDateTime) {
        throw new Error("Invalid schedule time.");
      }
      if (scheduledDateTime && scheduledDateTime <= new Date()) {
        throw new Error("Scheduled time must be in the future.");
      }

      if (scheduledDateTime) {
        const { success, error } = await scheduleService.scheduleTask({
          task_type: 'whatsapp_message',
          scheduled_for: scheduledDateTime.toISOString(),
          payload: {
            number: phone,
            message: whatsappMessage,
            consultant_id: consultant.phone
          },
          source: 'manual_followup_reminder',
          consultant_id: consultant.id
        });
        
        if (!success) throw new Error("Failed to schedule task");
      } else {
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            number: phone,
            message: whatsappMessage,
            consultant_id: consultant.phone
          },
        });
        if (error) throw error;
      }
      toast.success(scheduledDate ? `Reminder scheduled for ${targetConsultation.patient.name}` : `Reminder sent to ${targetConsultation.patient.name}`);
      setWhatsappPreviewVisible(false);
      setScheduledDate(undefined);
      setScheduledTime("09:00");
    } catch (error: any) {
      console.error('WhatsApp Error:', error);
      toast.error(error.message || 'Failed to send WhatsApp reminder.');
      handleWhatsAppWebFallback();
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleWhatsAppWebFallback = () => {
    if (!targetConsultation) return;
    const phone = targetConsultation.patient.phone;
    const encodedMsg = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    setWhatsappPreviewVisible(false);
  };

  const handleCallPatient = (phone: string) => {
    if (!phone || phone === '0000000000') {
      toast.error('No phone number available to call.');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  if (isConsultantLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Validating session...</p>
      </div>
    );
  }

  if (!consultant) {
    return (
      <DoctorLoginGate
        onLogin={(phone, name) => {
          localStorage.setItem('consultant_phone', phone);
          localStorage.setItem('consultant_name', name);
          window.location.reload();
        }}
      />
    );
  }

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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Select Review Date
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mx-auto"
              />
            </CardContent>
          </Card>

          {/* Follow-up List */}
          <Card className="lg:col-span-3 shadow-md border-0 bg-card/95 backdrop-blur h-full min-h-[500px]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Due for Review</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                  </CardDescription>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {followUpList.length}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMasterAdmin && (
                  <div className="flex items-center space-x-2 bg-background/50 px-3 py-1.5 rounded-md border border-dashed hover:border-primary/50 transition-colors h-8">
                    <Switch
                      id="fetch-all"
                      checked={fetchAll}
                      onCheckedChange={setFetchAll}
                      className="scale-75 data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="fetch-all" className="text-[10px] font-bold cursor-pointer whitespace-nowrap uppercase tracking-wider text-muted-foreground">
                      Show All
                    </Label>
                  </div>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed bg-background/50">
                      <Filter className="mr-2 h-3.5 w-3.5" />
                      Filter
                      {(selectedLocation !== 'all' || selectedVisitType !== 'all') && (
                        <>
                          <Separator orientation="vertical" className="mx-2 h-4" />
                          <div className="flex space-x-1">
                            {selectedLocation !== 'all' && (
                              <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px]">
                                {selectedLocation}
                              </Badge>
                            )}
                            {selectedVisitType !== 'all' && (
                              <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px] capitalize">
                                {selectedVisitType}
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="end">
                    <Command>
                      <CommandList>
                        <CommandGroup heading="Location">
                          <CommandItem onSelect={() => setSelectedLocation('all')}>
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedLocation === 'all' ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {selectedLocation === 'all' && <Check className="h-3 w-3" />}
                            </div>
                            <span>All Locations</span>
                          </CommandItem>
                          {hospitals.map((h) => (
                            <CommandItem key={h.name} onSelect={() => setSelectedLocation(h.name)}>
                              <div className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                selectedLocation === h.name ? "bg-primary text-primary-foreground" : "opacity-50"
                              )}>
                                {selectedLocation === h.name && <Check className="h-3 w-3" />}
                              </div>
                              <span className="truncate">{h.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Visit Type">
                          <CommandItem onSelect={() => setSelectedVisitType('all')}>
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedVisitType === 'all' ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {selectedVisitType === 'all' && <Check className="h-3 w-3" />}
                            </div>
                            <span>All Visits</span>
                          </CommandItem>
                          <CommandItem onSelect={() => setSelectedVisitType('paid')}>
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedVisitType === 'paid' ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {selectedVisitType === 'paid' && <Check className="h-3 w-3" />}
                            </div>
                            <span>Paid Visit</span>
                          </CommandItem>
                          <CommandItem onSelect={() => setSelectedVisitType('free')}>
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedVisitType === 'free' ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {selectedVisitType === 'free' && <Check className="h-3 w-3" />}
                            </div>
                            <span>Free Visit</span>
                          </CommandItem>
                        </CommandGroup>
                        {(selectedLocation !== 'all' || selectedVisitType !== 'all') && (
                          <>
                            <CommandSeparator />
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setSelectedLocation('all');
                                  setSelectedVisitType('all');
                                }}
                                className="justify-center text-center text-xs font-medium text-destructive hover:text-destructive"
                              >
                                Clear filters
                              </CommandItem>
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {(selectedLocation !== 'all' || selectedVisitType !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedLocation('all');
                      setSelectedVisitType('all');
                    }}
                    title="Clear all filters"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : followUpList.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
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
                                  <Phone className="w-3 h-3" />
                                  {c.patient.phone && c.patient.phone !== '0000000000' ? c.patient.phone : <span className="italic">No phone</span>}
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
                              {stripFollowUpPrefix(c.consultation_data?.followup) || ''}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50",
                                    (c.consultant_id !== consultant?.id && !isMasterAdmin) && "opacity-50 cursor-not-allowed grayscale"
                                  )}
                                  onClick={() => handleWhatsAppReminder(c)}
                                  disabled={c.consultant_id !== consultant?.id && !isMasterAdmin}
                                  title={(c.consultant_id !== consultant?.id && !isMasterAdmin) ? "Restricted: You can only send reminders for your own patients." : "Send WhatsApp Reminder"}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50",
                                    (!c.patient.phone || c.patient.phone === '0000000000') && "opacity-50 cursor-not-allowed"
                                  )}
                                  onClick={() => handleCallPatient(c.patient.phone)}
                                  disabled={!c.patient.phone || c.patient.phone === '0000000000'}
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

                  {/* Mobile List View */}
                  <div className="md:hidden space-y-4">
                    {followUpList.map((c) => (
                      <div key={c.id} className="p-4 rounded-lg bg-card shadow-sm border space-y-3">
                        <div className="flex justify-between items-start">
                          <button
                            onClick={() => setSelectedConsultation(c)}
                            className="font-bold text-left hover:underline text-primary text-lg transition-colors"
                          >
                            {c.patient.name}
                          </button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-9 w-9 p-0 rounded-full border-green-200 text-green-600 bg-green-50/50",
                                (c.consultant_id !== consultant?.id && !isMasterAdmin) && "opacity-50 cursor-not-allowed grayscale"
                              )}
                              onClick={() => handleWhatsAppReminder(c)}
                              disabled={c.consultant_id !== consultant?.id && !isMasterAdmin}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-9 w-9 p-0 rounded-full border-blue-200 text-blue-600 bg-blue-50/50",
                                (!c.patient.phone || c.patient.phone === '0000000000') && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => handleCallPatient(c.patient.phone)}
                              disabled={!c.patient.phone || c.patient.phone === '0000000000'}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-wider">Phone</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Phone className="w-3 h-3" />
                              {c.patient.phone && c.patient.phone !== '0000000000' ? c.patient.phone : <span className="italic">No phone</span>}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-wider">Last Visit</span>
                            <span className="font-medium">{format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                        {(() => {
                          const instructionText = stripFollowUpPrefix(c.consultation_data?.followup);
                          if (!instructionText || instructionText === '-') return null;
                          return (
                            <div className="p-3 rounded bg-muted/50 border border-muted-foreground/10">
                              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Instruction</div>
                              <p className="text-sm text-muted-foreground italic line-clamp-3">
                                {instructionText}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <User className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-center px-4">No patients scheduled for review on this date.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details Modal */}
        <Dialog open={!!selectedConsultation} onOpenChange={(open) => !open && setSelectedConsultation(null)}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Consultation Summary</DialogTitle>
            </DialogHeader>
            {selectedConsultation && (
              <div className="space-y-6">
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 font-medium">
                        <Phone className="w-3.5 h-3.5" /> {selectedConsultation.patient.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedConsultation.consultation_data && (
                  <ConsultationCard
                    data={{
                      ...selectedConsultation.consultation_data,
                      name: selectedConsultation.patient.name,
                      phone: selectedConsultation.patient.phone,
                      created_at: selectedConsultation.created_at,
                      location: selectedConsultation.location,
                      visit_type: selectedConsultation.visit_type,
                      status: selectedConsultation.status,
                      occupation: selectedConsultation.patient.occupation,
                      hometown: selectedConsultation.patient.hometown,
                      blood_group: selectedConsultation.patient.blood_group,
                      allergies: selectedConsultation.patient.allergies,
                      sex: selectedConsultation.patient.sex,
                      dob: selectedConsultation.patient.dob
                    }}
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* WhatsApp Preview Dialog */}
      <Dialog open={whatsappPreviewVisible} onOpenChange={setWhatsappPreviewVisible}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Edit WhatsApp Reminder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              To: <span className="font-semibold text-foreground">{targetConsultation?.patient.name}</span> ({targetConsultation?.patient.phone})
            </div>

            <textarea
              className="w-full min-h-[150px] p-3 text-sm rounded-md border border-input focus:ring-1 focus:ring-primary outline-none resize-none bg-muted/50"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Type your message..."
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="ghost" onClick={() => setWhatsappPreviewVisible(false)}>
              Cancel
            </Button>

            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={handleWhatsAppWebFallback}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp Web
            </Button>

            {consultant?.is_whatsauto_active && (
              <div className="flex gap-2">
                <SchedulePopover
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
                  onDateChange={setScheduledDate}
                  onTimeChange={setScheduledTime}
                  disabled={isSendingWhatsApp}
                  className="h-10 w-10 shrink-0"
                />
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={confirmAndSendWhatsApp}
                  disabled={isSendingWhatsApp}
                >
                  {isSendingWhatsApp ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {scheduledDate ? 'Scheduling...' : 'Sending...'}</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> {scheduledDate ? 'Schedule Bot' : 'Send via Bot'}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpDashboard;
