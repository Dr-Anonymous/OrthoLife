import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { cleanAdviceLine } from '@/lib/utils';
import { MessageSquare, Clock, Calendar, Pill, Sun, CloudSun, Moon, Syringe, Share, Bone, Activity, User, Stethoscope } from 'lucide-react';

interface Medication {
  composition: string;
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
  showDoctorProfile?: boolean;
  showSignSeal?: boolean;
  onlyMedicationsAndFollowup?: boolean;
  showMargins?: boolean;
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
export const Prescription = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age, language, logoUrl, qrCodeUrl, noBackground, className, forceDesktop, visitType, showDoctorProfile = true, showSignSeal = false, onlyMedicationsAndFollowup = false, showMargins = true }, ref) => {
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

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div ref={ref} className={cn("font-sans text-sm bg-background text-foreground", className)} style={{ fontFamily: 'var(--font-sans)' }} data-testid="prescription">

      {/* Page 1: Prescription Details */}
      <div className={cn(
        "min-h-[296mm] py-8 flex flex-col relative box-border",
        showMargins ? "pl-16 pr-8" : "px-8"
      )}>
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
              <a href="tel:+919866812555" className="font-semibold hover:underline">📞 98668 12555</a>
              <span className={cn("mx-2", !forceDesktop && "hidden sm:inline")}>|</span>
              <a href="mailto:info@ortho.life" className="font-semibold hover:underline">📧 info@ortho.life</a>
            </p>
          </div>
        </header>

        <main className="flex-grow space-y-2 pt-1">
          {/* Title */}
          <div className="text-center">
            <h1 className={cn("text-lg font-bold uppercase tracking-wide text-primary", visitType === 'paid' && "underline decoration-2 underline-offset-4")}>
              {onlyMedicationsAndFollowup ? "Prescription" : "Out-Patient Summary"}
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
          {(consultation.bp || consultation.temperature || consultation.weight || consultation.allergy) && !onlyMedicationsAndFollowup && (
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
          {!onlyMedicationsAndFollowup && (
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
                      return <div key={i}>{displayLine}</div>
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

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

        {/* Footer Group */}
        <div className="mt-auto break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          {showSignSeal && (
            <div className="flex justify-end mb-2 mr-4">
              <div className="relative flex items-center justify-center">
                <img src="/images/assets/sign.png" alt="Doctor's Signature" className="h-16 w-auto relative z-10" />
                <div className="absolute opacity-50 z-0" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                  <img src="/images/assets/seal.png" alt="Doctor's Seal" className="h-24 w-32" />
                </div>
              </div>
            </div>
          )}
          <footer
            className="mt-4 p-2 border-t-2 border-primary-light rounded-b-lg flex justify-between items-center bg-white"
            style={{ backgroundImage: noBackground ? 'none' : backgroundPattern }}
          >
            <p className="text-primary font-semibold text-xs" dangerouslySetInnerHTML={{ __html: t('prescription.footer_text') }} />
            <img src={qrCodeUrl || "/images/assets/qr-code.png"} alt="QR Code" className="h-16 w-16" />
          </footer>
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
          <div className="border-4 border-primary/20 rounded-xl p-6 flex flex-col justify-start bg-white h-full relative overflow-hidden">

            {language === 'te' ? (
              // Telugu Content
              <div className="text-foreground relative z-10 flex flex-col gap-5 h-full">

                {/* Top Section: Split Layout (Name & Image) */}
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 pb-6">
                  {/* Left: Text Info */}
                  <div className="flex-1 space-y-2 sm:space-y-4 text-center sm:text-left w-full">
                    <h2 className="text-2xl sm:text-4xl font-bold text-primary font-heading tracking-tight">మీ వైద్యుని గురించి తెలుసుకోండి</h2>

                    {/* Mobile Image */}
                    <div className="block sm:hidden print:hidden flex justify-center py-4">
                      <img
                        src="/images/doctors/manojBW.jpg"
                        alt="Dr. Samuel Manoj Cherukuri"
                        className="w-32 h-32 rounded-xl border-4 border-primary/20 object-cover shadow-md"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">డాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి</h3>
                      <p className="text-base sm:text-lg font-semibold text-muted-foreground">MBBS, MS Ortho (మణిపాల్)</p>
                      <p className="text-base sm:text-lg font-medium text-foreground/80 leading-snug">కన్సల్టెంట్ ఆర్థోపెడిక్, జాయింట్ రీప్లేస్మెంట్ & స్పైన్ సర్జన్</p>
                    </div>
                  </div>

                  {/* Right: Image */}
                  <div className="hidden sm:block print:block flex-shrink-0 pt-2 sm:pt-0">
                    <img
                      src="/images/doctors/manojBW.jpg"
                      alt="Dr. Samuel Manoj Cherukuri"
                      className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl border-4 border-primary/20 object-cover shadow-md grayscale-0 print:grayscale-[30%]"
                    />
                  </div>
                </div>

                {/* Middle: Full Width About Section */}
                <div className="border-b-2 border-primary/10 pb-8">
                  <p className="text-lg leading-relaxed text-justify text-muted-foreground">
                    డాక్టర్ మనోజ్ గారు మణిపాల్ హాస్పిటల్ నుండి ప్రత్యేక శిక్షణ పొంది, ఎముకలు మరియు కీళ్ల సమస్యలకు అత్యాధునిక చికిత్సను అందిస్తున్నారు. శస్త్రచికిత్స నైపుణ్యంతో పాటు ఆధునిక వైద్య పద్ధతుల కలయికతో మెరుగైన ఫలితాలను అందిస్తారు.
                  </p>
                </div>

                {/* Bottom Section: Full Width Services */}
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2 border-b border-primary/10 pb-1">
                    <Activity className="h-5 w-5 text-primary" />
                    ప్రత్యేక సేవలు
                  </h3>
                  <p className="text-base font-semibold text-primary/90 mb-3">8+ సంవత్సరాల అనుభవం మరియు 5000 పైగా శస్త్రచికిత్సలు</p>

                  <ul className="space-y-2 text-base">
                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Bone className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">ట్రామా & ఫ్రాక్చర్ కేర్</strong>
                        <span className="text-muted-foreground text-sm">క్లిష్టమైన ఎముకల విరుగుడుకు అధునాతన చికిత్స మరియు శస్త్రచికిత్సలు.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Activity className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">ఆర్థ్రోస్కోపీ (కీహోల్ సర్జరీ)</strong>
                        <span className="text-muted-foreground text-sm">లిగమెంట్ మరియు క్రీడా గాయాలకు అతి తక్కువ కోతతో చేసే అధునాతన శస్త్రచికిత్స.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <User className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">జాయింట్ రీప్లేస్మెంట్</strong>
                        <span className="text-muted-foreground text-sm">మోకాలి మరియు తుంటి కీళ్ల మార్పిడి శస్త్రచికిత్సలు (Total Knee & Hip Replacement).</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Stethoscope className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">వెన్నెముక (Spine) సంరక్షణ</strong>
                        <span className="text-muted-foreground text-sm">నడుము మరియు మెడ నొప్పికి శస్త్రచికిత్స మరియు శస్త్రచికిత్స లేని పరిష్కారాలు.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Syringe className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">రీజెనరేటివ్ మెడిసిన్</strong>
                        <span className="text-muted-foreground text-sm">కీళ్ల నొప్పుల నివారణకు PRP (Platelet Rich Plasma) మరియు గుజ్జు (Visco) ఇంజెక్షన్లు.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Footer Note */}
                <div className="text-center text-sm text-muted-foreground pt-4 border-t border-primary/10">
                  <p className="font-semibold text-primary">ఆర్థోలైఫ్, రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్, RTO కార్యాలయం దగ్గర, కాకినాడ -03</p>
                  <p>అపాయింట్‌మెంట్ కోసం సంప్రదించండి: <strong className="whitespace-nowrap">99 838 49 838</strong></p>
                </div>
              </div>

            ) : (
              // English Content
              <div className="text-foreground relative z-10 flex flex-col gap-5 h-full">

                {/* Top Section: Split Layout (Name & Image) */}
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 pb-6">
                  {/* Left: Text Info */}
                  <div className="flex-1 space-y-2 sm:space-y-4 text-center sm:text-left w-full">
                    <h2 className="text-2xl sm:text-4xl font-bold text-primary font-heading tracking-tight">Know Your Doctor</h2>

                    {/* Mobile Image */}
                    <div className="block sm:hidden print:hidden flex justify-center py-4">
                      <img
                        src="/images/doctors/manojBW.jpg"
                        alt="Dr. Samuel Manoj Cherukuri"
                        className="w-32 h-32 rounded-xl border-4 border-primary/20 object-cover shadow-md"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">Dr. Samuel Manoj Cherukuri</h3>
                      <p className="text-base sm:text-lg font-semibold text-muted-foreground">MBBS, MS Ortho (Manipal)</p>
                      <p className="text-base sm:text-lg font-medium text-foreground/80 leading-snug">Consultant Orthopaedic, Joint Replacement & Spine Surgeon</p>
                    </div>
                  </div>

                  {/* Right: Image */}
                  <div className="hidden sm:block print:block flex-shrink-0 pt-2 sm:pt-0">
                    <img
                      src="/images/doctors/manojBW.jpg"
                      alt="Dr. Samuel Manoj Cherukuri"
                      className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl border-4 border-primary/20 object-cover shadow-md grayscale-0 print:grayscale-[30%]"
                    />
                  </div>
                </div>

                {/* Middle: Full Width About Section */}
                <div className="border-b-2 border-primary/10 pb-8">
                  <p className="text-lg leading-relaxed text-justify text-muted-foreground">
                    Dr. Manoj brings specialized training from Manipal Hospital to provide advanced musculoskeletal care. His practice blends surgical precision with modern biological treatments, focusing on restoring mobility and quality of life.
                  </p>
                </div>

                {/* Bottom Section: Full Width Services */}
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2 border-b border-primary/10 pb-1">
                    <Activity className="h-5 w-5 text-primary" />
                    Specialized Services
                  </h3>
                  <p className="text-base font-semibold text-primary/90 mb-3">8+ years and 5000+ surgeries experience</p>

                  <ul className="space-y-2 text-base">
                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Bone className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">Trauma & Fracture Care</strong>
                        <span className="text-muted-foreground text-sm">Advanced fixation techniques for complex injuries and fractures.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Activity className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">Arthroscopy (Keyhole Surgery)</strong>
                        <span className="text-muted-foreground text-sm">Minimally invasive ligament and sports injury repair for faster recovery.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <User className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">Joint Replacement</strong>
                        <span className="text-muted-foreground text-sm">Total Knee and Hip replacements ensuring lasting mobility.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Stethoscope className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">Spine Care</strong>
                        <span className="text-muted-foreground text-sm">Comprehensive surgical and non-surgical management of back and neck pain.</span>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 border border-primary/5">
                      <Syringe className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <strong className="block text-primary text-lg mb-0.5">Regenerative Medicine</strong>
                        <span className="text-muted-foreground text-sm">PRP (Platelet Rich Plasma) and Viscosupplementation for joint preservation.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Footer Note */}
                <div className="text-center text-sm text-muted-foreground pt-4 border-t border-primary/10">
                  <p className="font-semibold text-primary">OrthoLife, Road No. 3, R R Nagar, Near RTO office, Kakinada -03</p>
                  <p>For Appointments, Contact: <strong className="whitespace-nowrap">99 838 49 838</strong></p>
                </div>

              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
});

Prescription.displayName = 'Prescription';
