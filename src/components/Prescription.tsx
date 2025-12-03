import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn, removeBracketedText } from '@/lib/utils';
import { MessageSquare, Clock, Calendar, Pill, Sun, CloudSun, Moon } from 'lucide-react';

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
}

interface PrescriptionProps {
  patient: Patient;
  consultation: ConsultationData;
  consultationDate: Date;
  age: number | '';
  language: string;
  logoUrl: string;
  className?: string;
}

export const Prescription: React.FC<PrescriptionProps> = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age, language, logoUrl, className }, ref) => {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const hasMedications = consultation.medications && consultation.medications.length > 0;

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div ref={ref} className={cn("p-8 font-sans text-sm bg-background text-foreground flex flex-col min-h-screen", className)} style={{ fontFamily: 'var(--font-sans)' }} data-testid="prescription">
      {/* Header */}
      <header
        className="flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg"
        style={{ backgroundImage: backgroundPattern }}
      >
        <div className="flex items-center">
          <img src={logoUrl} alt="Clinic Logo" className={cn("w-auto", logoUrl === '/images/logos/logo.png' ? 'h-20' : 'h-24')} />
        </div>
        <div className="text-right">
          <h2 className="text-xl font-heading font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>Dr Samuel Manoj Cherukuri</h2>
          <p className="text-muted-foreground">MBBS, MS Ortho (Manipal)</p>
          <p className="text-muted-foreground">Orthopaedic Surgeon</p>
          <p className="mt-2 text-gray-700">
            <a href="tel:9866812555" className="font-semibold hover:underline">📞 98668 12555</a>
            <span className="mx-2">|</span>
            <a href="mailto:info@ortho.life" className="font-semibold hover:underline">📧 info@ortho.life</a>
          </p>
        </div>
      </header>

      <main className="flex-grow">
        {/* Patient Info */}
        <section className="flex justify-between py-4 border-b border-border">
          <div>
            <p><span className="font-semibold">Name:</span> {patient.name}</p>
            <p><span className="font-semibold">Age/Sex:</span> {age}/{patient.sex}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Phone:</span> {patient.phone}</p>
            <p><span className="font-semibold">ID:</span> {patient.id}</p>
          </div>
        </section>

        {/* Date */}
        <div className="text-right py-2 text-muted-foreground">
          {format(consultationDate, 'dd/MM/yyyy')}
        </div>

        {/* Medical Info */}
        <section className="space-y-4">
          {consultation.complaints && (
            <div>
              <h3 className="font-heading font-semibold">Complaints:</h3>
              <p className="whitespace-pre-wrap">{removeBracketedText(consultation.complaints)}</p>
            </div>
          )}
          {consultation.findings && (
            <div>
              <h3 className="font-heading font-semibold">Findings:</h3>
              <p className="whitespace-pre-wrap">{removeBracketedText(consultation.findings)}</p>
            </div>
          )}
          {consultation.investigations && (
            <div>
              <h3 className="font-heading font-semibold">Investigations:</h3>
              <p className="whitespace-pre-wrap">{removeBracketedText(consultation.investigations)}</p>
            </div>
          )}
          {consultation.diagnosis && (
            <div>
              <h3 className="font-heading font-semibold">Diagnosis:</h3>
              <p className="whitespace-pre-wrap">{removeBracketedText(consultation.diagnosis)}</p>
            </div>
          )}
          {consultation.advice && (
            <div>
              <h3 className="font-heading font-semibold flex items-center gap-2 leading-none">
                <MessageSquare className="h-4 w-4" />
                <span>{t('prescription.advice')}:</span>
              </h3>
              <p className="whitespace-pre-wrap">{removeBracketedText(consultation.advice)}</p>
            </div>
          )}
        </section>

        {/* Medications */}
        {hasMedications && (
          <section className="mt-6">
            <h3 className="font-heading font-semibold mb-2 flex items-center gap-2 leading-none">
              <Pill className="h-4 w-4" />
              <span>{t('prescription.medication')}:</span>
            </h3>
            <table className="w-full border-collapse border border-border">
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
                      <td className="border border-border p-2">{removeBracketedText(med.name)}</td>
                      <td className="border border-border p-2">{removeBracketedText(med.dose)}</td>
                      {med.frequency ? (
                        <td colSpan={3} className="border border-border p-2 text-center">
                          {removeBracketedText(med.frequency)}
                        </td>
                      ) : (
                        <>
                          <td className="border border-border p-2 text-center">{med.freqMorning ? '✔' : ''}</td>
                          <td className="border border-border p-2 text-center">{med.freqNoon ? '✔' : ''}</td>
                          <td className="border border-border p-2 text-center">{med.freqNight ? '✔' : ''}</td>
                        </>
                      )}
                      <td className="border border-border p-2">{removeBracketedText(med.duration)}</td>
                      <td className="border border-border p-2">{removeBracketedText(med.instructions)}</td>
                    </tr>
                    {med.notes && (
                      <tr>
                        <td colSpan={8} className="border border-border p-2 text-xs italic text-muted-foreground">
                          {removeBracketedText(med.notes)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Followup */}
        {consultation.followup && (
          <section className="mt-6">
            <h3 className="font-heading font-semibold flex items-center gap-2 leading-none">
              <Calendar className="h-4 w-4" />
              <span>{t('prescription.followup')}:</span>
            </h3>
            <p className="whitespace-pre-wrap">{removeBracketedText(consultation.followup)}</p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-8 p-2 border-t-2 border-primary-light rounded-b-lg flex justify-between items-center"
        style={{ backgroundImage: backgroundPattern }}
      >
        <p className="text-primary font-semibold text-xs">
          Visit <a href="https://ortho.life/my" target="_blank" rel="noopener noreferrer" className="underline">ortho.life/my</a> to access your prescriptions, diets, and exercises anytime.
        </p>
        <img src="/images/assets/qr-code.png" alt="QR Code" className="h-16 w-16" />
      </footer>
    </div>
  );
});

Prescription.displayName = 'Prescription';
