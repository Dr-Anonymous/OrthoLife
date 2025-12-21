
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CertificateData) => void;
  patientName: string;
}

export interface CertificateData {
  restPeriodDays: number;
  restPeriodStartDate: Date;
  treatmentFromDate: Date;
  rejoinDate?: Date;
  rejoinActivity?: string;
  certificateDate: Date;
  consultationDate: Date;
}

const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({ isOpen, onClose, onSubmit, patientName }) => {
  const [restPeriodDays, setRestPeriodDays] = useState<number | ''>('');
  const [restPeriodStartDate, setRestPeriodStartDate] = useState<Date | undefined>(new Date());
  const [treatmentFromDate, setTreatmentFromDate] = useState<Date | undefined>(new Date());
  const [rejoinDate, setRejoinDate] = useState<Date | undefined>();
  const [rejoinActivity, setRejoinActivity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestPeriodDatePickerOpen, setIsRestPeriodDatePickerOpen] = useState(false);
  const [isTreatmentFromDatePickerOpen, setIsTreatmentFromDatePickerOpen] = useState(false);
  const [isRejoinDatePickerOpen, setIsRejoinDatePickerOpen] = useState(false);
  const [certificateDate, setCertificateDate] = useState<Date | undefined>(new Date());
  const [consultationDate, setConsultationDate] = useState<Date | undefined>(new Date());
  const [isCertificateDatePickerOpen, setIsCertificateDatePickerOpen] = useState(false);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);


  const handleSubmit = () => {
    if (!restPeriodDays || !restPeriodStartDate || !treatmentFromDate || !certificateDate || !consultationDate) {
      // Basic validation
      return;
    }
    setIsSubmitting(true);
    onSubmit({
      restPeriodDays: Number(restPeriodDays),
      restPeriodStartDate,
      treatmentFromDate,
      rejoinDate,
      rejoinActivity,
      certificateDate,
      consultationDate,
    });
    // The parent component will handle closing the modal on success
    setIsSubmitting(false);
  };

  const restPeriodEndDate = restPeriodStartDate && restPeriodDays ? addDays(restPeriodStartDate, Number(restPeriodDays) -1) : null;

    useEffect(() => {
        if (restPeriodStartDate) {
            setConsultationDate(restPeriodStartDate);
        }
    }, [restPeriodStartDate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Medical Certificate</DialogTitle>
          <DialogDescription>
            Enter the required details for {patientName}'s medical certificate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
                Certificate Date
            </Label>
            <Popover open={isCertificateDatePickerOpen} onOpenChange={setIsCertificateDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "col-span-3 justify-start text-left font-normal",
                            !certificateDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {certificateDate ? format(certificateDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={certificateDate}
                        onSelect={(date) => {
                            setCertificateDate(date);
                            setIsCertificateDatePickerOpen(false);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
                First Consultation
            </Label>
            <Popover open={isConsultationDatePickerOpen} onOpenChange={setIsConsultationDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "col-span-3 justify-start text-left font-normal",
                            !consultationDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {consultationDate ? format(consultationDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={consultationDate}
                        onSelect={(date) => {
                            setConsultationDate(date);
                            setIsConsultationDatePickerOpen(false);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Injury From
            </Label>
            <Popover open={isTreatmentFromDatePickerOpen} onOpenChange={setIsTreatmentFromDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !treatmentFromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {treatmentFromDate ? format(treatmentFromDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={treatmentFromDate}
                  onSelect={(date) => {
                    setTreatmentFromDate(date);
                    setIsTreatmentFromDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rest-days" className="text-right">
              Rest (Days)
            </Label>
            <Input
              id="rest-days"
              type="number"
              value={restPeriodDays}
              onChange={(e) => setRestPeriodDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Rest From
            </Label>
            <Popover open={isRestPeriodDatePickerOpen} onOpenChange={setIsRestPeriodDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !restPeriodStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {restPeriodStartDate ? format(restPeriodStartDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={restPeriodStartDate}
                  onSelect={(date) => {
                    setRestPeriodStartDate(date);
                    setIsRestPeriodDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
           <div className="grid grid-cols-4 items-center gap-4">
               <Label className="text-right col-span-1">Rest To</Label>
               <div className="col-span-3 text-sm font-medium text-muted-foreground h-10 flex items-center">
                   {restPeriodEndDate ? format(restPeriodEndDate, "PPP") : 'Please enter rest days & start date'}
               </div>
           </div>   
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Rejoin Date
            </Label>
            <Popover open={isRejoinDatePickerOpen} onOpenChange={setIsRejoinDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !rejoinDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {rejoinDate ? format(rejoinDate, "PPP") : <span>Pick a date (Optional)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={rejoinDate}
                  onSelect={(date) => {
                    setRejoinDate(date);
                    setIsRejoinDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rejoin-activity" className="text-right">
              Rejoin Activity
            </Label>
            <Input
              id="rejoin-activity"
              value={rejoinActivity}
              onChange={(e) => setRejoinActivity(e.target.value)}
              className="col-span-3"
              placeholder="e.g., normal duties"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalCertificateModal;
