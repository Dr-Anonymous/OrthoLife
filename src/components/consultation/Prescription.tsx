import React from 'react';
import { format } from 'date-fns';
import { cn, calculateFollowUpDate } from '@/lib/utils';
import { Patient, Medication } from '@/types/consultation';
import { cleanAdviceLine } from '@/lib/utils';
import { MessageSquare, Clock, Calendar, Pill, Sun, CloudSun, Moon, Syringe, Share, Bone, Activity, User, Stethoscope, Heart, Brain, Eye, FlaskConical, Thermometer, Baby, BriefcaseMedical, Dna, Microscope, Shield, Droplet, Ear, Hand, Bandage } from 'lucide-react';
import { Consultant, PrintOptions } from '@/types/consultation';

// Interfaces are imported from @/types/consultation

interface ConsultationData {
  complaints: string;
  medicalHistory?: string;
  findings: string;
  investigations: string;
  diagnosis: string;
  advice: string;
  followup: string;
  medications: Medication[];
  procedure?: string;
  referred_to?: string;
  referred_by?: string;
  bp?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  pulse?: string;
  spo2?: string;
  orthotics?: string;
}

interface PrescriptionProps {
  patient: Patient;
  consultation: ConsultationData;
  consultationDate: Date;
  age: number | '';
  language: string;
  logoUrl: string;
  hospitalName?: string;
  qrCodeUrl?: string;
  noBackground?: boolean;
  className?: string;
  forceDesktop?: boolean;
  visitType?: string;
  showDoctorProfile?: boolean;
  showSignSeal?: boolean;
  printOptions?: PrintOptions;
  showMargins?: boolean;
  consultant?: Consultant | null;
}

/**
 * Prescription Component
 * 
 * Renders the printable prescription layout.
 * Features:
 * - Dynamic header/footer with clinic branding.
 * - Sections for Vitals, Complaints, Findings, Diagnosis, Procedure, Advice, Medications.
 * - Advice section supports "guide" keyword filtering via `cleanAdviceLine`.
 * - Multi-language support (English/Telugu) for static labels.
 * - Medication table with checkmarks for Morning/Noon/Night.
 */
export const Prescription = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age, language, logoUrl, hospitalName, qrCodeUrl, noBackground, className, forceDesktop, visitType, showDoctorProfile = true, showSignSeal = false, printOptions, showMargins = true, consultant }, ref) => {
  const effectivePrintOptions: PrintOptions = printOptions || {
    vitals: true,
    clinicalNotes: true,
    diagnosis: true,
    investigations: true,
    medications: true,
    advice: true,
    followup: true,
    procedure: true,
    referrals: true,
    orthotics: true,
    letterheadMode: false,
    fontSize: 'standard',
    signatureAlignment: 'right'
  };
  const TRANSLATIONS = {
    en: {
      'prescription.advice': 'Advice',
      'prescription.medication': 'Medication',
      'prescription.med_name': 'Name',
      'prescription.med_dose': 'Dose',
      'prescription.med_frequency': 'Frequency',
      'prescription.med_duration': 'Duration',
      'prescription.med_instructions': 'Instructions',
      'prescription.med_morning': 'Morning',
      'prescription.med_noon': 'A.Noon',
      'prescription.med_night': 'Night',
      'prescription.followup': 'Follow-up',
      'prescription.footer_text': 'Visit <a href="https://ortho.life/my" target="_blank" class="underline">ortho.life/my</a> to access your prescriptions, diets, and exercises anytime.'
    },
    te: {
      'prescription.advice': 'సలహా',
      'prescription.medication': 'మందులు',
      'prescription.med_name': 'పేరు',
      'prescription.med_dose': 'మోతాదు',
      'prescription.med_frequency': 'తరచుదనం',
      'prescription.med_duration': 'వ్యవధి',
      'prescription.med_instructions': 'సూచనలు',
      'prescription.med_morning': 'ఉదయం',
      'prescription.med_noon': 'మధ్యాహ్నం',
      'prescription.med_night': 'రాత్రి',
      'prescription.followup': 'తదుపరి',
      'prescription.footer_text': 'మీ ప్రిస్క్రిప్షన్లు, డైట్, మరియు వ్యాయామాలను ఎప్పుడైనా చూడటానికి <a href="https://ortho.life/my" target="_blank" class="underline">ortho.life/my</a> సందర్శించండి.'
    }
  };

  const t = (key: keyof typeof TRANSLATIONS.en) => {
    const langObj = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    return langObj[key] || TRANSLATIONS.en[key] || key;
  };

  const hasMedications = consultation.medications && consultation.medications.length > 0;

  const cName = typeof consultant?.name === 'object' ? (consultant?.name?.[language === 'te' ? 'te' : 'en'] || consultant?.name?.en) : (consultant?.name || '');
  const cQuals = typeof consultant?.qualifications === 'object' ? (consultant?.qualifications?.[language === 'te' ? 'te' : 'en'] || consultant?.qualifications?.en) : (consultant?.qualifications || '');
  const cSpec = typeof consultant?.specialization === 'object' ? (consultant?.specialization?.[language === 'te' ? 'te' : 'en'] || consultant?.specialization?.en) : (consultant?.specialization || '');
  const cAddress = typeof consultant?.address === 'object' ? (consultant?.address?.[language === 'te' ? 'te' : 'en'] || consultant?.address?.en) : (consultant?.address || '');
  const cExp = typeof consultant?.experience === 'object' ? (consultant?.experience?.[language === 'te' ? 'te' : 'en'] || consultant?.experience?.en) : (consultant?.experience || '');

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  const activeServices = (consultant?.services || []).filter(s =>
    s.title?.en?.trim() || s.title?.te?.trim()
  );

  return (
    <div ref={ref}
      className={cn(
        "font-sans bg-background text-foreground mx-auto print:m-0",
        effectivePrintOptions.fontSize === 'compact' ? 'text-[11px]' :
          effectivePrintOptions.fontSize === 'large' ? 'text-base' : 'text-sm',
        className
      )}
      style={{ fontFamily: 'var(--font-sans)', width: '210mm' }}
      data-testid="prescription"
    >
      <div className={cn(
        "min-h-[296mm] py-8 flex flex-col relative box-border w-full",
        showMargins ? "pl-16 pr-8" : "px-8"
      )}>
        {/* Header or Spacer for Letterhead */}
        {effectivePrintOptions.letterheadMode ? (
          <div className="h-[3.3cm] w-full" />
        ) : (
          <header
            className={cn(
              "flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg gap-4",
              forceDesktop ? "flex-row" : "flex-col sm:flex-row"
            )}
            style={{ backgroundImage: noBackground ? 'none' : backgroundPattern }}
          >
            <div className="flex items-center">
              <img src={logoUrl} alt="Clinic Logo" className={cn("w-auto", forceDesktop ? "h-20" : "h-16 sm:h-20", logoUrl !== '/images/logos/logo.png' && (forceDesktop ? "h-24" : "sm:h-24"))} />
            </div>
            <div className={cn(forceDesktop ? "text-right" : "text-center sm:text-right")}>
              <h2 className={cn("font-heading font-bold text-primary", forceDesktop ? "text-xl" : "text-lg sm:text-xl")} style={{ fontFamily: 'var(--font-heading)' }}>
                {cName}
              </h2>
              <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
                {cQuals}
              </p>
              <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
                {cSpec}
              </p>
              <p className={cn("mt-2 text-gray-700", forceDesktop ? "text-base" : "text-sm sm:text-base", !forceDesktop && "flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-0")}>
                {consultant?.phone && (
                  <a href={`tel:+91${consultant.phone}`} className="font-semibold hover:underline">📞 {consultant.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</a>
                )}
                {consultant?.email && (
                  <>
                    <span className={cn("mx-2", !forceDesktop && "hidden sm:inline")}>|</span>
                    <a href={`mailto:${consultant.email}`} className="font-semibold hover:underline">📧 {consultant.email}</a>
                  </>
                )}
                {!consultant && (
                  <>
                    <a href="tel:+919866812555" className="font-semibold hover:underline">📞 98668 12555</a>
                    <span className={cn("mx-2", !forceDesktop && "hidden sm:inline")}>|</span>
                    <a href="mailto:info@ortho.life" className="font-semibold hover:underline">📧 info@ortho.life</a>
                  </>
                )}
              </p>
            </div>
          </header>
        )}

        <main className="flex-grow space-y-2 pt-1">
          {/* Title */}
          <div className="text-center">
            <h1 className={cn("text-lg font-bold uppercase tracking-wide text-primary", visitType === 'paid' && "underline decoration-2 underline-offset-4")}>
              {(!effectivePrintOptions.clinicalNotes && !effectivePrintOptions.diagnosis) ? "Prescription" : "Out-Patient Summary"}
            </h1>
          </div>
          {/* Patient Info */}
          <section className={cn("border border-border rounded-lg bg-muted/10 break-inside-avoid", forceDesktop ? "p-4 grid grid-cols-2 gap-4" : "p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4")} style={{ pageBreakInside: 'avoid' }}>
            <div className={cn("grid grid-cols-[auto_1fr] gap-y-1", forceDesktop ? "gap-x-4" : "gap-x-2 sm:gap-x-4", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
              <span className="font-semibold text-muted-foreground">Name:</span>
              <span className="font-semibold">{patient.name}</span>
              <span className="font-semibold text-muted-foreground">Age/Sex:</span>
              <span>{age}/{patient.sex}</span>
            </div>
            <div className={cn("grid grid-cols-[auto_1fr] gap-y-1", forceDesktop ? "gap-x-4" : "gap-x-2 sm:gap-x-4", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
              <span className="font-semibold text-muted-foreground">Phone:</span>
              <span>{patient.phone}</span>
              <span className="font-semibold text-muted-foreground">Date:</span>
              <span>{format(consultationDate, 'dd MMM yyyy')}</span>
            </div>
          </section>


          {/* Vitals */}
          {(consultation.bp || consultation.temperature || consultation.weight || consultation.height || consultation.pulse || consultation.spo2 || patient.allergies || patient.blood_group) && effectivePrintOptions.vitals && (
            <section className="flex flex-wrap items-center gap-6 py-3 border-b border-border mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              {patient.blood_group && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Blood:</span>
                  <span className="font-semibold text-primary">{patient.blood_group}</span>
                </div>
              )}
              {consultation.bp && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">BP:</span>
                  <span className="font-medium">{consultation.bp}</span>
                </div>
              )}
              {consultation.temperature && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Temp:</span>
                  <span className="font-medium">{consultation.temperature}</span>
                </div>
              )}
              {consultation.height && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Height:</span>
                  <span className="font-medium">{consultation.height} cm</span>
                </div>
              )}
              {consultation.weight && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Weight:</span>
                  <span className="font-medium">{consultation.weight} kg</span>
                </div>
              )}
              {consultation.pulse && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Pulse:</span>
                  <span className="font-medium">{consultation.pulse} bpm</span>
                </div>
              )}
              {consultation.spo2 && (
                <div className="flex items-center">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">SpO2:</span>
                  <span className="font-medium">{consultation.spo2} %</span>
                </div>
              )}
              {patient.allergies && (
                <div className="flex items-center">
                  <span className="font-semibold text-destructive text-xs uppercase tracking-wider mr-2">Allergies:</span>
                  <span className="font-medium text-destructive">{patient.allergies}</span>
                </div>
              )}
            </section>
          )}

          {/* Medical Info */}
          <section className="space-y-4">
            {consultation.complaints && effectivePrintOptions.clinicalNotes && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Complaints:
                </h3>
                <p className="whitespace-pre-wrap">{consultation.complaints}</p>
              </div>
            )}
            {consultation.medicalHistory && effectivePrintOptions.clinicalNotes && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Past History:
                </h3>
                <p className="whitespace-pre-wrap">{consultation.medicalHistory}</p>
              </div>
            )}
            {consultation.findings && effectivePrintOptions.clinicalNotes && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1">Findings:</h3>
                <p className="whitespace-pre-wrap">{consultation.findings}</p>
              </div>
            )}
            {consultation.investigations && effectivePrintOptions.investigations && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1">Investigations:</h3>
                <p className="whitespace-pre-wrap">{consultation.investigations}</p>
              </div>
            )}
            {consultation.diagnosis && effectivePrintOptions.diagnosis && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1">Diagnosis:</h3>
                <p className="whitespace-pre-wrap">{consultation.diagnosis}</p>
              </div>
            )}
            {consultation.procedure && effectivePrintOptions.procedure && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
                  <Syringe className="h-4 w-4" />
                  <span>Procedure Done:</span>
                </h3>
                <p className="whitespace-pre-wrap">{consultation.procedure}</p>
              </div>
            )}
            {consultation.advice && effectivePrintOptions.advice && (
              <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('prescription.advice')}:</span>
                </h3>
                <div className="whitespace-pre-wrap">
                  {consultation.advice.split('\n').map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    const isGuide = line.toLowerCase().includes('guide');
                    const displayLine = isGuide ? cleanAdviceLine(line) : line;
                    return <div key={i}>{displayLine}</div>
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Medications */}
          {hasMedications && effectivePrintOptions.medications && (
            <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-2 flex items-center gap-2 leading-none">
                <Pill className="h-4 w-4" />
                <span>{t('prescription.medication')}:</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border min-w-[600px]">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">#</th>
                      <th className="border border-border p-2 text-left">{t('prescription.med_name')}</th>
                      <th className="border border-border p-2 text-left">{t('prescription.med_dose')}</th>
                      <th className="border border-border p-2 text-center" colSpan={3}>
                        <div className="flex items-center justify-center gap-1 leading-none">
                          <Clock className="h-3 w-3" />
                          <span>{t('prescription.med_frequency')}</span>
                        </div>
                      </th>
                      <th className="border border-border p-2 text-left">{t('prescription.med_duration')}</th>
                      <th className="border border-border p-2 text-left">{t('prescription.med_instructions')}</th>
                    </tr>
                    <tr className="bg-muted">
                      <th className="border border-border p-1"></th>
                      <th className="border border-border p-1"></th>
                      <th className="border border-border p-1"></th>
                      <th className="border border-border p-1 text-center text-xs">
                        <div className="flex flex-col items-center justify-center gap-1 leading-none">
                          <Sun className="h-3 w-3" />
                          <span>{t('prescription.med_morning')}</span>
                        </div>
                      </th>
                      <th className="border border-border p-1 text-center text-xs">
                        <div className="flex flex-col items-center justify-center gap-1 leading-none">
                          <CloudSun className="h-3 w-3" />
                          <span>{t('prescription.med_noon')}</span>
                        </div>
                      </th>
                      <th className="border border-border p-1 text-center text-xs">
                        <div className="flex flex-col items-center justify-center gap-1 leading-none">
                          <Moon className="h-3 w-3" />
                          <span>{t('prescription.med_night')}</span>
                        </div>
                      </th>
                      <th className="border border-border p-1"></th>
                      <th className="border border-border p-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultation.medications.map((med, index) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td className="border border-border p-2">{index + 1}</td>
                          <td className="border border-border p-2">{(med as any).brandName || (med as any).composition || (med as any).name || ''}</td>
                          <td className="border border-border p-2">{med.dose}</td>
                          {med.frequency ? (
                            <td colSpan={3} className="border border-border p-2 text-center">
                              {med.frequency}
                            </td>
                          ) : (
                            <>
                              <td className="border border-border p-2 text-center">{med.freqMorning ? '✔' : ''}</td>
                              <td className="border border-border p-2 text-center">{med.freqNoon ? '✔' : ''}</td>
                              <td className="border border-border p-2 text-center">{med.freqNight ? '✔' : ''}</td>
                            </>
                          )}
                          <td className="border border-border p-2">{med.duration}</td>
                          <td className="border border-border p-2">{med.instructions}</td>
                        </tr>
                        {med.notes && (
                          <tr>
                            <td colSpan={8} className="border border-border p-2 text-xs italic text-muted-foreground">
                              {med.notes}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Orthotics (Braces / Splints / Plaster) */}
          {consultation.orthotics && effectivePrintOptions.orthotics && (
            <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
                <Bone className="h-4 w-4" />
                <span>Braces / Splints / Plaster:</span>
              </h3>
              <p className="whitespace-pre-wrap">{consultation.orthotics}</p>
            </section>
          )}

          {/* Referred To */}
          {consultation.referred_to && effectivePrintOptions.referrals && (
            <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
                <Share className="h-4 w-4" />
                <span>Referred To:</span>
              </h3>
              <p className="whitespace-pre-wrap">{consultation.referred_to}</p>
            </section>
          )}

          {/* Followup */}
          {consultation.followup && effectivePrintOptions.followup && (
            <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-heading font-semibold text-primary flex items-center gap-2 leading-none">
                  <Calendar className="h-4 w-4" />
                  <span>{t('prescription.followup')}:</span>
                </h3>
                {(() => {
                  const dueDate = calculateFollowUpDate(consultation.followup, consultationDate);
                  if (!dueDate) return null;
                  const dateObj = new Date(dueDate);
                  const isTelugu = language === 'te';
                  const dayName = dateObj.toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', { weekday: 'long' });
                  return (
                    <span className="text-[11px] font-bold text-primary px-2 py-0.5 border border-primary/20 rounded bg-primary/5">
                      {dateObj.toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} ({dayName})
                    </span>
                  );
                })()}
              </div>
              <p className="whitespace-pre-wrap">{consultation.followup}</p>
            </section>
          )}
        </main>

        <div className="mt-auto break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          {showSignSeal && (consultant?.sign_url || consultant?.seal_url) && (
            <div className={cn(
              "flex mb-2",
              effectivePrintOptions.signatureAlignment === 'left' ? "justify-start ml-4" :
                effectivePrintOptions.signatureAlignment === 'center' ? "justify-center" : "justify-end mr-4"
            )}>
              <div className="relative flex items-center justify-center">
                {consultant?.sign_url && (
                  <img src={consultant.sign_url} alt="Doctor's Signature" className="h-16 w-auto relative z-10" />
                )}
                <div className="absolute opacity-50 z-0" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                  {consultant?.seal_url && (
                    <img src={consultant.seal_url} alt="Doctor's Seal" className="h-24 w-32" />
                  )}
                </div>
              </div>
            </div>
          )}
          {!effectivePrintOptions.letterheadMode && (
            <footer
              className="mt-4 p-2 border-t-2 border-primary-light rounded-b-lg flex justify-between items-center bg-white"
              style={{ backgroundImage: noBackground ? 'none' : backgroundPattern }}
            >
              <p className="text-primary font-semibold text-xs" dangerouslySetInnerHTML={{ __html: t('prescription.footer_text') }} />
              <img src={qrCodeUrl || "/images/assets/qr-code.png"} alt="QR Code" className="h-16 w-16" />
            </footer>
          )}
        </div>
      </div>

      {/* Doctor Profile (Back Page) */}
      {showDoctorProfile !== false && (
        <section
          className={cn(
            "break-before-page min-h-[296mm] py-8 flex flex-col justify-center relative print:z-[60] print:bg-white",
            showMargins ? "pl-8 pr-16" : "px-8"
          )}
          style={{ pageBreakBefore: 'always' }}
        >
          <div className="border-4 border-primary/20 rounded-xl p-4 flex flex-col justify-start bg-white h-full relative overflow-hidden">
            {consultant?.profile_layout === 'team' ? (
              // --- HOSPITAL TEAM LAYOUT ---
              <div className="text-foreground relative z-10 flex flex-col gap-4 h-full">
                {/* Hospital Header */}
                <div className="flex justify-between items-center border-b-2 border-primary/20 pb-4 mb-2">
                  <div className="flex items-center gap-5">
                    <img src={logoUrl} alt="Clinic Logo" className="h-16 sm:h-20 w-auto" />
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight uppercase">
                        {hospitalName || cAddress?.split(',')[0] || (language === 'te' ? 'ఆర్థోలైఫ్ మల్టీ స్పెషాలిటీ హాస్పిటల్' : 'OrthoLife Multispeciality Hospital')}
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">{cAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Team Members Grid (Lead + Team) */}
                <div className={cn(
                  "grid gap-4",
                  (consultant?.team_members?.length || 0) + 1 <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
                )}>
                  {/* Lead Consultant (Self) */}
                  <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 shadow-md relative">
                    <div className="relative mb-3">
                      <div className="absolute inset-0 bg-primary/10 rounded-full scale-110 blur-sm" />
                      <img
                        src={consultant?.photo_url || "/images/assets/doctor-placeholder.png"}
                        alt={cName}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white relative z-10 shadow-md bg-white"
                      />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-primary uppercase leading-tight mb-1">{cName}</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-foreground/80 uppercase mb-0.5">{cQuals}</p>
                    <p className="text-[10px] sm:text-xs font-black text-primary uppercase">{cSpec}</p>

                    {consultant?.lead_services && consultant.lead_services.length > 0 && (
                      <div className="mt-2 w-full pt-2 border-t border-primary/10">
                        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                          {consultant.lead_services.map((s, i) => (
                            <span key={i} className="text-[9px] sm:text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                              • {language === 'te' ? (s.te || s.en) : (s.en || s.te)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rest of the Team */}
                  {(consultant?.team_members || []).map((member, idx) => {
                    const mName = member.name?.[language === 'te' ? 'te' : 'en'] || member.name?.en;
                    const mQuals = member.qualifications?.[language === 'te' ? 'te' : 'en'] || member.qualifications?.en;
                    const mSpec = member.specialization?.[language === 'te' ? 'te' : 'en'] || member.specialization?.en;

                    return (
                      <div key={idx} className="flex flex-col items-center text-center p-4 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 shadow-sm">
                        <div className="relative mb-3">
                          <div className="absolute inset-0 bg-primary/5 rounded-full scale-110 blur-sm" />
                          <img
                            src={member.photo_url || "/images/assets/doctor-placeholder.png"}
                            alt={mName}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white relative z-10 shadow-md bg-white"
                          />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-primary uppercase leading-tight mb-1">{mName}</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-foreground/80 uppercase mb-0.5">{mQuals}</p>
                        <p className="text-[9px] sm:text-[10px] font-semibold text-primary/70 uppercase">{mSpec}</p>

                        {member.services && member.services.length > 0 && (
                          <div className="mt-2 w-full pt-2 border-t border-primary/5">
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                              {member.services.map((s, i) => (
                                <span key={i} className="text-[8px] sm:text-[9px] font-medium text-muted-foreground/80 whitespace-nowrap">
                                  • {language === 'te' ? (s.te || s.en) : (s.en || s.te)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Services Section in Two Columns */}
                {activeServices.length > 0 && (
                  <div className="flex-grow mt-4">
                    <div className="flex items-center gap-3 mb-4 border-b border-primary/20 pb-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-black text-primary uppercase tracking-tighter">
                        {language === 'te' ? 'మా ప్రత్యేక సేవలు' : 'Our Specialized Services'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {activeServices.map((service, idx) => {
                        const Icon = { Bone, Activity, User, Stethoscope, Syringe, Heart, Brain, Eye, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical, Dna, Microscope, Shield, Droplet, Ear, Hand, Bandage }[service.icon] || Activity;
                        const sTitle = service.title?.[language === 'te' ? 'te' : 'en'] || service.title?.en;
                        const sDesc = service.description?.[language === 'te' ? 'te' : 'en'] || service.description?.en;

                        return (
                          <div key={idx} className="flex items-start gap-3 group">
                            <div className="mt-1 p-1 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <strong className="block text-sm sm:text-base text-primary font-bold leading-tight mb-0.5">{sTitle}</strong>
                              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{sDesc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shared Bio if exists */}
                {consultant?.bio?.[language === 'te' ? 'te' : 'en'] && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 italic text-sm text-center text-muted-foreground">
                    "{consultant.bio[language === 'te' ? 'te' : 'en']}"
                  </div>
                )}

                {/* Footer Info */}
                <div className="text-center pt-4 border-t border-primary/20">
                  <p className="text-lg font-black text-primary uppercase tracking-tight mb-1">
                    {language === 'te' ? 'అపాయింట్‌మెంట్ కోసం సంప్రదించండి' : 'For Appointments, Contact'}
                  </p>
                  <p className="text-2xl font-black text-foreground tabular-nums">
                    📞 {(consultant?.reception_phone || consultant?.phone || '99 838 49 838').replace(/(\d{5})(\d{5})/, '$1 $2')}
                  </p>
                </div>
              </div>
            ) : (
              // --- SINGLE DOCTOR LAYOUT (CURRENT) ---
              language === 'te' ? (
                <div className="text-foreground relative z-10 flex flex-col gap-3 h-full">
                  {/* Top Section: Split Layout (Name & Image) */}
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-3 pb-3">
                    <div className="flex-1 space-y-2 sm:space-y-4 text-center sm:text-left w-full">
                      <h2 className="text-2xl sm:text-4xl font-bold text-primary font-heading tracking-tight">మీ వైద్యుని గురించి తెలుసుకోండి</h2>
                      {consultant?.photo_url && (
                        <div className="block sm:hidden print:hidden flex justify-center py-4">
                          <img src={consultant.photo_url} alt={cName || "Doctor"} className="w-32 h-32 rounded-xl border-4 border-primary/20 object-cover shadow-md" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-none mb-2">{cName}</h3>
                        <p className="text-lg sm:text-xl font-bold text-primary/80">{cQuals}</p>
                      </div>
                    </div>
                    {consultant?.photo_url && (
                      <div className="hidden sm:block print:block flex-shrink-0 pt-2 sm:pt-0">
                        <img src={consultant.photo_url} alt={cName || "Doctor"} className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl border-4 border-primary/20 object-cover shadow-md" />
                      </div>
                    )}
                  </div>
                  {cSpec && <p className="text-lg sm:text-2xl font-medium text-foreground/80 leading-tight text-center sm:text-left -mt-1 mb-2">{cSpec}</p>}
                  {consultant?.bio?.te && (
                    <div className="border-b-2 border-primary/10 pb-3">
                      <p className="text-lg leading-relaxed text-justify text-muted-foreground whitespace-pre-wrap">{consultant.bio.te}</p>
                    </div>
                  )}
                  {cExp && (
                    <div className="w-full bg-gradient-to-r from-primary/5 via-primary/[0.08] to-primary/5 border-y border-primary/20 py-2.5 px-6 -mx-4 mb-3 relative">
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-primary" />
                      <div className="flex items-center justify-center">
                        <span className="text-lg sm:text-2xl font-black text-primary tracking-tighter text-center leading-tight">{cExp}</span>
                      </div>
                    </div>
                  )}
                  {activeServices.some(s => s.title?.te?.trim()) && (
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2 border-b border-primary/10 pb-1">
                        <Activity className="h-4 w-4 text-primary" /> ప్రత్యేక సేవలు
                      </h3>
                      <ul className="space-y-1.5 text-base">
                        {activeServices.filter(s => s.title?.te?.trim()).map((service, idx) => {
                          const Icon = { Bone, Activity, User, Stethoscope, Syringe, Heart, Brain, Eye, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical }[service.icon] || Activity;
                          return (
                            <li key={idx} className="flex items-start gap-2 p-1.5 rounded-lg bg-muted/20 border border-primary/5">
                              <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              <div>
                                <strong className="block text-primary text-lg mb-0.5">{service.title.te}</strong>
                                <span className="text-muted-foreground text-sm">{service.description.te}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="text-center text-sm text-muted-foreground pt-4 border-t border-primary/10">
                    <p className="font-semibold text-primary">{cAddress || 'ఆర్థోలైఫ్, రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్, RTO కార్యాలయం దగ్గర, కాకినాడ -03'}</p>
                    <p>అపాయింట్‌మెంట్ కోసం సంప్రదించండి: <strong className="whitespace-nowrap">{(consultant?.reception_phone || consultant?.phone || '99 838 49 838').replace(/(\d{5})(\d{5})/, '$1 $2')}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="text-foreground relative z-10 flex flex-col gap-3 h-full">
                  {/* Top Section: Split Layout (Name & Image) */}
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-3 pb-3">
                    <div className="flex-1 space-y-2 sm:space-y-4 text-center sm:text-left w-full">
                      <h2 className="text-2xl sm:text-4xl font-bold text-primary font-heading tracking-tight">Know Your Doctor</h2>
                      {consultant?.photo_url && (
                        <div className="block sm:hidden print:hidden flex justify-center py-4">
                          <img src={consultant.photo_url} alt={cName || "Doctor"} className="w-32 h-32 rounded-xl border-4 border-primary/20 object-cover shadow-md" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <h3 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-none mb-2">{cName}</h3>
                        <p className="text-lg sm:text-xl font-bold text-primary/80">{cQuals}</p>
                      </div>
                    </div>
                    {consultant?.photo_url && (
                      <div className="hidden sm:block print:block flex-shrink-0 pt-2 sm:pt-0">
                        <img src={consultant.photo_url} alt={cName || "Doctor"} className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl border-4 border-primary/20 object-cover shadow-md" />
                      </div>
                    )}
                  </div>
                  {cSpec && <p className="text-lg sm:text-2xl font-medium text-foreground/80 leading-tight text-center sm:text-left -mt-1 mb-2">{cSpec}</p>}
                  {consultant?.bio?.en && (
                    <div className="border-b-2 border-primary/10 pb-3">
                      <p className="text-lg leading-relaxed text-justify text-muted-foreground whitespace-pre-wrap">{consultant.bio.en}</p>
                    </div>
                  )}
                  {!consultant?.bio?.en && !consultant && (
                    <div className="border-b-2 border-primary/10 pb-3">
                      <p className="text-lg leading-relaxed text-justify text-muted-foreground italic">Doctor profile is being optimized for clinical excellence...</p>
                    </div>
                  )}
                  {cExp && (
                    <div className="w-full bg-gradient-to-r from-primary/5 via-primary/[0.08] to-primary/5 border-y border-primary/20 py-2.5 px-6 -mx-4 mb-3 relative">
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-primary" />
                      <div className="flex items-center justify-center">
                        <span className="text-lg sm:text-2xl font-black text-primary tracking-tighter text-center leading-tight">{cExp}</span>
                      </div>
                    </div>
                  )}
                  {activeServices.some(s => s.title?.en?.trim()) && (
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2 border-b border-primary/10 pb-1">
                        <Activity className="h-4 w-4 text-primary" /> Specialized Services
                      </h3>
                      <ul className="space-y-1.5 text-base">
                        {activeServices.filter(s => s.title?.en?.trim()).map((service, idx) => {
                          const Icon = { Bone, Activity, User, Stethoscope, Syringe, Heart, Brain, Eye, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical }[service.icon] || Activity;
                          return (
                            <li key={idx} className="flex items-start gap-2 p-1.5 rounded-lg bg-muted/20 border border-primary/5">
                              <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              <div>
                                <strong className="block text-primary text-lg mb-0.5">{service.title.en}</strong>
                                <span className="text-muted-foreground text-sm">{service.description.en}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="text-center text-sm text-muted-foreground pt-4 border-t border-primary/10">
                    <p className="font-semibold text-primary">{cAddress || 'OrthoLife, Road No. 3, R R Nagar, Near RTO office, Kakinada -03'}</p>
                    <p>For Appointments, Contact: <strong className="whitespace-nowrap">{(consultant?.reception_phone || consultant?.phone || '99 838 49 838').replace(/(\d{5})(\d{5})/, '$1 $2')}</strong></p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
});

Prescription.displayName = 'Prescription';
