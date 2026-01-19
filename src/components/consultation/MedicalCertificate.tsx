
import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Interfaces ---

interface Patient {
  id: string;
  name: string;
  sex: string;
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

interface MedicalCertificateProps {
  patient: Patient;
  diagnosis: string;
  certificateData: CertificateData;
}

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CertificateData) => void;
  patientName: string;
}

// --- MedicalCertificate Component (Print Layout) ---

/**
 * MedicalCertificate Component
 * 
 * Renders the printable Medical Certificate layout.
 * Features:
 * - Formats dates and rest periods.
 * - Handles gender-specific pronouns (He/She, Mr./Mrs.).
 * - Includes doctor's digital signature and seal.
 */
export const MedicalCertificate: React.FC<MedicalCertificateProps> = ({
  patient,
  diagnosis,
  certificateData,
}) => {
  const { restPeriodDays, restPeriodStartDate, treatmentFromDate, rejoinDate, rejoinActivity, certificateDate, consultationDate } = certificateData;
  const restPeriodEndDate = addDays(restPeriodStartDate, restPeriodDays - 1);
  const patientPrefix = patient.sex === 'M' ? 'Mr.' : 'Mrs.';
  const pronounHeShe = patient.sex === 'M' ? 'He' : 'She';

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="bg-white text-black font-sans p-8">
      {/* Page 1 */}
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col border-b-2 border-gray-300">
        <header
          className="flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg"
          style={{ backgroundImage: backgroundPattern }}
        >
          <div className="flex items-center">
            <img src="/images/logos/logo.png" alt="Clinic Logo" className="h-20 w-auto" />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-heading font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>Dr Samuel Manoj Cherukuri</h2>
            <p className="text-muted-foreground">MBBS, MS Ortho (Manipal)</p>
            <p className="text-muted-foreground">Orthopaedic Surgeon</p>
            <p className="mt-2 text-gray-700">
              <span className="font-semibold">📞 98668 12555</span>
              <span className="mx-2">|</span>
              <span className="font-semibold">📧 info@ortho.life</span>
            </p>
          </div>
        </header>

        <div className="text-right py-2 text-muted-foreground">
          {format(certificateDate, 'dd/MM/yyyy')}
        </div>

        <main className="flex-grow">
          <h2 className="text-2xl font-bold text-center underline mb-12">
            Medical certificate
          </h2>
          <div className="text-lg leading-relaxed space-y-6">
            <p>
              This is to certify that {patientPrefix} <strong>{patient.name}</strong>, bearing ID No.: <strong>{patient.id}</strong>
              &nbsp;has presented with <strong>{diagnosis}</strong> to our healthcare facility on <strong>{format(consultationDate, 'PPP')}</strong>.{" "}
              {pronounHeShe} is under treatment for the above condition from <strong>{format(treatmentFromDate, 'PPP')}</strong> to the present date.
            </p>
            <p>
              {pronounHeShe} has been prescribed medication, physiotherapy and rest for a period of <strong>{restPeriodDays}</strong> days
              from <strong>{format(restPeriodStartDate, 'PPP')}</strong> to <strong>{format(restPeriodEndDate, 'PPP')}</strong>.
            </p>
            {rejoinDate && rejoinActivity ? (
              <p>
                {pronounHeShe} has been reevaluated on follow-up and found to be fit to resume <strong>{rejoinActivity}</strong> duties from <strong>{format(rejoinDate, 'PPP')}</strong>.
              </p>
            ) : (
              <p>
                {pronounHeShe} needs to be reevaluated on follow-up to certify fitness.
              </p>
            )}
          </div>
        </main>

        <footer className="mt-auto">
          <div className="flex justify-between items-end">
            <div></div>
            <div className="text-center">
              <img src="/images/assets/sign.png" alt="Doctor's Signature" className="h-20" />
              <div className="relative">
                <img src="/images/assets/seal.png" alt="Doctor's Seal" className="h-24 absolute -top-16 left-1/2 -translate-x-1/2 opacity-50" />
              </div>
            </div>
          </div>
          <div className="border-t-2 border-blue-600 pt-4 mt-8 text-center text-sm">
            <p>OrthoLife</p>
            <p>📍 Road No. 3, RR Nagar, Kakinada-03.</p>
          </div>
        </footer>
      </div>

      {/* Page 2 */}
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col">
        <header className="flex justify-end items-start mb-8 h-8">
          {/* Empty header for spacing, date removed */}
        </header>
        <main className="flex-grow flex items-center justify-center">
          <p className="text-xl font-semibold text-gray-600">
            THIS DOCUMENT IS NOT INTENDED FOR MEDICOLEGAL PURPOSES
          </p>
        </main>
        <footer className="mt-auto border-t-2 border-blue-600 pt-4 text-center text-sm">
          <p>OrthoLife</p>
          <p>📍 Road No. 3, RR Nagar, Kakinada-03.</p>
        </footer>
      </div>
    </div>
  );
};

// --- MedicalCertificateModal Component (Data Entry) ---

/**
 * MedicalCertificateModal Component
 * 
 * Form to input details for generating a Medical Certificate.
 * Features:
 * - Date pickers for Rest From, Rest To, Treatment From, Rejoin Date.
 * - Auto-calculation of End Date based on duration.
 */
export const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({ isOpen, onClose, onSubmit, patientName }) => {
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

  const restPeriodEndDate = restPeriodStartDate && restPeriodDays ? addDays(restPeriodStartDate, Number(restPeriodDays) - 1) : null;

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
              placeholder="normal/light"
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
