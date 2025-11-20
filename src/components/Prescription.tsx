import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
}

export const Prescription: React.FC<PrescriptionProps> = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age, language, logoUrl }, ref) => {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const hasMedications = consultation.medications && consultation.medications.length > 0;

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div ref={ref} className="p-8 md:p-12 font-sans text-sm bg-white text-slate-900 flex flex-col min-h-screen print:p-0" style={{ fontFamily: 'var(--font-sans)' }} data-testid="prescription">
      {/* Header */}
      <header className="flex justify-between items-start pb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-6">
          <img src={logoUrl} alt="Clinic Logo" className={cn("w-auto object-contain", logoUrl === '/logo.png' ? 'h-24' : 'h-28')} />
        </div>
        <div className="text-right space-y-1">
          <h2 className="text-3xl font-heading font-bold text-primary tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Dr. Samuel Manoj Cherukuri</h2>
          <p className="text-base font-medium text-slate-600">MBBS, MS Ortho (Manipal)</p>
          <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold">Orthopaedic Surgeon</p>
          <div className="pt-3 flex flex-col items-end gap-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-primary">📞</span>
              <span className="font-medium">98668 12555</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">📧</span>
              <span className="font-medium">info@ortho.life</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow py-8 space-y-8">
        {/* Patient Info */}
        <section className="bg-slate-50 rounded-xl p-6 border border-slate-100 print:border-slate-200">
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Patient Name</p>
              <p className="text-lg font-semibold text-slate-900">{patient.name}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Date</p>
              <p className="text-lg font-medium text-slate-900">{format(consultationDate, 'dd MMM, yyyy')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Age / Sex</p>
              <p className="text-base font-medium text-slate-900">{age} <span className="text-slate-300 mx-1">|</span> {patient.sex}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Patient ID</p>
              <p className="text-base font-medium text-slate-900 font-mono">{patient.id}</p>
            </div>
          </div>
        </section>

        {/* Medical Info */}
        <div className="grid gap-8">
          {consultation.complaints && (
            <section>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full"></span>
                Complaints
              </h3>
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap pl-3 border-l-2 border-slate-100">{consultation.complaints}</p>
            </section>
          )}

          {consultation.findings && (
            <section>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full"></span>
                Clinical Findings
              </h3>
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap pl-3 border-l-2 border-slate-100">{consultation.findings}</p>
            </section>
          )}

          {consultation.diagnosis && (
            <section>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full"></span>
                Diagnosis
              </h3>
              <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap pl-3 border-l-2 border-slate-100 font-medium">{consultation.diagnosis}</p>
            </section>
          )}
        </div>

        {/* Medications */}
        {hasMedications && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <span className="text-2xl font-serif font-bold text-primary italic">Rx</span>
              </div>
              <h3 className="text-lg font-heading font-bold text-slate-900">{t('prescription.medication')}</h3>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">{t('prescription.med_name')}</th>
                    <th className="p-4">{t('prescription.med_dose')}</th>
                    <th className="p-4 text-center">{t('prescription.med_frequency')}</th>
                    <th className="p-4">{t('prescription.med_duration')}</th>
                    <th className="p-4">{t('prescription.med_instructions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultation.medications.map((med, index) => (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-center text-slate-400 font-medium">{index + 1}</td>
                        <td className="p-4 font-medium text-slate-900">{med.name}</td>
                        <td className="p-4 text-slate-600">{med.dose}</td>
                        <td className="p-4">
                          {med.frequency ? (
                            <div className="text-center font-medium text-slate-700">{med.frequency}</div>
                          ) : (
                            <div className="flex justify-center gap-1">
                              <span className={cn("px-2 py-1 rounded text-xs font-bold w-8 text-center", med.freqMorning ? "bg-primary/10 text-primary" : "text-slate-300 bg-slate-50")}>M</span>
                              <span className={cn("px-2 py-1 rounded text-xs font-bold w-8 text-center", med.freqNoon ? "bg-primary/10 text-primary" : "text-slate-300 bg-slate-50")}>A</span>
                              <span className={cn("px-2 py-1 rounded text-xs font-bold w-8 text-center", med.freqNight ? "bg-primary/10 text-primary" : "text-slate-300 bg-slate-50")}>N</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">{med.duration}</td>
                        <td className="p-4 text-slate-600">{med.instructions}</td>
                      </tr>
                      {med.notes && (
                        <tr className="bg-amber-50/50">
                          <td colSpan={6} className="px-4 py-2 text-xs text-amber-700 italic pl-16">
                            Note: {med.notes}
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

        {/* Advice & Followup */}
        <div className="grid gap-8 pt-4">
          {consultation.advice && (
            <section className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">{t('prescription.advice')}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{consultation.advice}</p>
            </section>
          )}

          {consultation.followup && (
            <section className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-blue-900">
              <span className="text-xl">📅</span>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-1">{t('prescription.followup')}</h3>
                <p className="font-medium">{consultation.followup}</p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-12 pb-6">
        <div className="flex justify-between items-end mb-8">
          <div className="text-xs text-slate-400 max-w-md">
            <p>{t('prescription.footer_text')}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-32 border-b border-slate-300 mb-2"></div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Signature</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <span>Powered by OrthoLife</span>
          </div>
          <img src="/qr-code.png" alt="QR Code" className="h-12 w-12 opacity-80 mix-blend-multiply" />
        </div>
      </footer>
    </div>
  );
});

Prescription.displayName = 'Prescription';
