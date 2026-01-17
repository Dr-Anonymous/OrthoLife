import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { cleanAdviceLine } from '@/lib/utils';
import { MessageSquare, Clock, Calendar, Pill, Sun, CloudSun, Moon, Syringe, Share } from 'lucide-react';

interface Medication {
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
}

interface Patient {
  name: string;
  dob: string;
  sex: string;
  phone: string;
  id: string;
}

interface ConsultationData {
  complaints: string;
  findings: string;
  investigations: string;
  diagnosis: string;
  advice: string;
  followup: string;
  medications: Medication[];
  procedure?: string;
  referred_to?: string;
  bp?: string;
  temperature?: string;
  weight?: string;
  allergy?: string;
}

interface PrescriptionProps {
  patient: Patient;
  consultation: ConsultationData;
  consultationDate: Date;
  age: number | '';
  language: string;
  logoUrl: string;
  qrCodeUrl?: string;
  noBackground?: boolean;
  className?: string;
  forceDesktop?: boolean;
  visitType?: string;
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
export const Prescription = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age, language, logoUrl, qrCodeUrl, noBackground, className, forceDesktop, visitType }, ref) => {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const hasMedications = consultation.medications && consultation.medications.length > 0;

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div ref={ref} className={cn("p-8 font-sans text-sm bg-background text-foreground flex flex-col", className)} style={{ fontFamily: 'var(--font-sans)' }} data-testid="prescription">
      {/* Header */}
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
          <h2 className={cn("font-heading font-bold text-primary", forceDesktop ? "text-xl" : "text-lg sm:text-xl")} style={{ fontFamily: 'var(--font-heading)' }}>Dr Samuel Manoj Cherukuri</h2>
          <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>MBBS, MS Ortho (Manipal)</p>
          <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>Orthopaedic Surgeon</p>
          <p className={cn("mt-2 text-gray-700", forceDesktop ? "text-base" : "text-sm sm:text-base", !forceDesktop && "flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-0")}>
            <a href="tel:+919983849838" className="font-semibold hover:underline">📞 99 838 49 838</a>
            <span className={cn("mx-2", !forceDesktop && "hidden sm:inline")}>|</span>
            <a href="mailto:info@ortho.life" className="font-semibold hover:underline">📧 info@ortho.life</a>
          </p>
        </div>
      </header>

      <main className="flex-grow space-y-2 pt-1">
        {/* Title */}
        <div className="text-center">
          <h1 className={cn("text-lg font-bold uppercase tracking-wide text-primary", visitType === 'paid' && "underline decoration-2 underline-offset-4")}>Out-Patient Summary</h1>
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
        {(consultation.bp || consultation.temperature || consultation.weight || consultation.allergy) && (
          <section className="flex flex-wrap items-center gap-6 py-3 border-b border-border mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
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
            {consultation.weight && (
              <div className="flex items-center">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mr-2">Weight:</span>
                <span className="font-medium">{consultation.weight}</span>
              </div>
            )}
            {consultation.allergy && (
              <div className="flex items-center">
                <span className="font-semibold text-destructive text-xs uppercase tracking-wider mr-2">Allergies:</span>
                <span className="font-medium text-destructive">{consultation.allergy}</span>
              </div>
            )}
          </section>
        )}

        {/* Medical Info */}
        <section className="space-y-4">
          {consultation.complaints && (
            <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1">Complaints:</h3>
              <p className="whitespace-pre-wrap">{consultation.complaints}</p>
            </div>
          )}
          {consultation.findings && (
            <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1">Findings:</h3>
              <p className="whitespace-pre-wrap">{consultation.findings}</p>
            </div>
          )}
          {consultation.investigations && (
            <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1">Investigations:</h3>
              <p className="whitespace-pre-wrap">{consultation.investigations}</p>
            </div>
          )}
          {consultation.diagnosis && (
            <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1">Diagnosis:</h3>
              <p className="whitespace-pre-wrap">{consultation.diagnosis}</p>
            </div>
          )}
          {consultation.procedure && (
            <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
                <Syringe className="h-4 w-4" />
                <span>Procedure Done:</span>
              </h3>
              <p className="whitespace-pre-wrap">{consultation.procedure}</p>
            </div>
          )}
          {consultation.advice && (
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
                  // Join with newline by rendering div or just verify <br> behavior?
                  // whitespace-pre-wrap handles \n but map returns array.
                  // Better to just return span with newline or div.
                  return <div key={i}>{displayLine}</div>
                })}
              </div>
            </div>
          )}
        </section>

        {/* Medications */}
        {hasMedications && (
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
                        <td className="border border-border p-2">{med.name}</td>
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

        {/* Referred To */}
        {consultation.referred_to && (
          <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
              <Share className="h-4 w-4" />
              <span>Referred To:</span>
            </h3>
            <p className="whitespace-pre-wrap">{consultation.referred_to}</p>
          </section>
        )}

        {/* Followup */}
        {consultation.followup && (
          <section className="mt-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2 leading-none">
              <Calendar className="h-4 w-4" />
              <span>{t('prescription.followup')}:</span>
            </h3>
            <p className="whitespace-pre-wrap">{consultation.followup}</p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-8 p-2 border-t-2 border-primary-light rounded-b-lg flex justify-between items-center break-inside-avoid"
        style={{ backgroundImage: noBackground ? 'none' : backgroundPattern, pageBreakInside: 'avoid' }}
      >
        <p className="text-primary font-semibold text-xs" dangerouslySetInnerHTML={{ __html: t('prescription.footer_text') }} />
        <img src={qrCodeUrl || "/images/assets/qr-code.png"} alt="QR Code" className="h-16 w-16" />
      </footer>
    </div>
  );
});

Prescription.displayName = 'Prescription';
