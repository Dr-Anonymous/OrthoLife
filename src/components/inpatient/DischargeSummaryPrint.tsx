import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DischargeData, CourseDetails } from '@/types/inPatients';
import { Clock, Calendar, Pill, Sun, CloudSun, Moon, AlertTriangle, ClipboardList, Activity, FileText, Syringe, MessageSquare, Stethoscope } from 'lucide-react';
import { Consultant, PrintOptions } from '@/types/consultation';
import { DAMA_TEXT } from '@/utils/dischargeConstants';

interface DischargeSummaryPrintProps {
    patientSnapshot: {
        name: string;
        dob: string;
        sex: string;
        phone: string;
        id: string;
        location?: string;
    };
    courseDetails: CourseDetails;
    dischargeData: DischargeData;
    language: string;
    logoUrl: string;
    className?: string;
    noBackground?: boolean;
    forceDesktop?: boolean;
    dischargeDate?: string;
    showMargins?: boolean;
    consultant?: Consultant | null;
    printOptions?: PrintOptions;
    showSignSeal?: boolean;
}

export const DischargeSummaryPrint = React.forwardRef<HTMLDivElement, DischargeSummaryPrintProps>(({
    patientSnapshot,
    courseDetails,
    dischargeData,
    language,
    logoUrl,
    className,
    noBackground,
    forceDesktop,
    dischargeDate,
    showMargins = true,
    consultant,
    printOptions,
    showSignSeal = true
}, ref) => {
    const effectivePrintOptions = printOptions || {
        letterheadMode: false,
        fontSize: 'standard',
        signatureAlignment: 'right'
    };
    const TRANSLATIONS: any = {
        en: {
            'discharge.diagnosis': 'Diagnosis',
            'discharge.procedure': 'Procedure Performed',
            'discharge.operation_notes': 'Operation Notes',
            'discharge.clinical_notes': 'Clinical Course / Notes',
            'discharge.post_op_care': 'Post-Op Care & Advice',
            'discharge.wound_care': 'Wound Care Instructions',
            'discharge.activity': 'Activity & Physiotherapy',
            'discharge.emergency_red_flags': 'Emergency Red Flags',
            'discharge.review_date': 'Review Date',
            'prescription.medication': 'Medications at Discharge',
            'prescription.med_name': 'Name',
            'prescription.med_dose': 'Dose',
            'prescription.med_frequency': 'Frequency',
            'prescription.med_morning': 'Morning',
            'prescription.med_noon': 'A.Noon',
            'prescription.med_night': 'Night',
            'prescription.med_duration': 'Duration',
            'prescription.med_instructions': 'Instructions',
            'prescription.footer_text': 'Visit <a href="https://ortho.life/my" target="_blank" class="underline">ortho.life/my</a> to access your prescriptions, diets, and exercises anytime.'
        },
        te: {
            'discharge.diagnosis': 'రోగ నిర్ధారణ',
            'discharge.procedure': 'చేసిన శస్త్రచికిత్స',
            'discharge.operation_notes': 'ఆపరేషన్ గమనికలు',
            'discharge.clinical_notes': 'క్లినికల్ కోర్సు / గమనికలు',
            'discharge.post_op_care': 'శస్త్రచికిత్స అనంతర జాగ్రత్తలు & సలహాలు',
            'discharge.wound_care': 'గాయం జాగ్రత్తలు',
            'discharge.activity': 'శారీరక కదలికలు',
            'discharge.emergency_red_flags': 'జాగ్రత్తలు / ప్రమాద సంకేతాలు',
            'discharge.review_date': 'తదుపరి సందర్శన తేదీ',
            'prescription.medication': 'డిశ్చార్జ్ మందులు',
            'prescription.med_name': 'పేరు',
            'prescription.med_dose': 'మోతాదు',
            'prescription.med_frequency': 'తరచుదనం',
            'prescription.med_morning': 'ఉదయం',
            'prescription.med_noon': 'మధ్యాహ్నం',
            'prescription.med_night': 'రాత్రి',
            'prescription.med_duration': 'వ్యవధి',
            'prescription.med_instructions': 'సూచనలు',
            'prescription.footer_text': 'మీ ప్రిస్క్రిప్షన్లు, డైట్, మరియు వ్యాయామాలను ఎప్పుడైనా చూడటానికి <a href="https://ortho.life/my" target="_blank" class="underline">ortho.life/my</a> సందర్శించండి.'
        }
    };

    const t = (key: string, defaultValue?: string) => {
        const langObj = TRANSLATIONS[language] || TRANSLATIONS.en;
        return langObj[key] || defaultValue || key;
    };

    const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

    const cName = typeof consultant?.name === 'object' ? (consultant?.name?.[language === 'te' ? 'te' : 'en'] || consultant?.name?.en) : (consultant?.name || '');
    const cQuals = typeof consultant?.qualifications === 'object' ? (consultant?.qualifications?.[language === 'te' ? 'te' : 'en'] || consultant?.qualifications?.en) : (consultant?.qualifications || '');
    const cSpec = typeof consultant?.specialization === 'object' ? (consultant?.specialization?.[language === 'te' ? 'te' : 'en'] || consultant?.specialization?.en) : (consultant?.specialization || '');

    return (
        <div ref={ref} className="font-sans mx-auto print:m-0 relative w-full max-w-full overflow-hidden" style={{ width: forceDesktop ? '210mm' : '100%', maxWidth: '210mm' }}>
            <div

                className={cn(
                    "bg-background text-foreground min-h-[296mm] print:p-0 w-full box-border relative",
                    showMargins ? "pl-16 pr-8 py-8" : "px-4 sm:px-8 py-8",
                    effectivePrintOptions.fontSize === 'compact' ? 'text-[11px]' :
                        effectivePrintOptions.fontSize === 'large' ? 'text-base' : 'text-sm',
                    className
                )}
                style={{ fontFamily: 'var(--font-sans)', width: '100%' }}
            >
                <table className="w-full text-left">
                    <thead className="print:table-header-group">
                        <tr><td><div className="h-4"></div></td></tr>
                    </thead>
                    <tfoot className="print:table-footer-group">
                        <tr>
                            <td className="w-full">
                                {/* Unconditional spacer to reserve space for pre-printed footers or digital footers on every page */}
                                <div className="h-[3.5cm] print:block hidden"></div>
                            </td>
                        </tr>
                    </tfoot>
                    <tbody>
                        <tr>
                            <td className="w-full">
                                {/* Header or Spacer for Letterhead */}
                                {effectivePrintOptions.letterheadMode ? (
                                    <div className="h-[3.3cm] w-full" />
                                ) : (
                                    <header
                                        className={cn(
                                            "flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg gap-4 mb-4",
                                            forceDesktop ? "flex-row" : "flex-col sm:flex-row"
                                        )}
                                        style={{ backgroundImage: noBackground ? 'none' : backgroundPattern }}
                                    >
                                        <div className="flex items-center">
                                            <img src={logoUrl} alt="Clinic Logo" className={cn("w-auto", forceDesktop ? "h-20" : "h-16 sm:h-20", logoUrl !== '/images/logos/logo.png' && (forceDesktop ? "h-24" : "sm:h-24"))} />
                                        </div>
                                        <div className={cn(forceDesktop ? "text-right" : "text-center sm:text-right")}>
                                            <h2 className={cn("font-heading font-bold text-primary", forceDesktop ? "text-xl" : "text-lg sm:text-xl")} style={{ fontFamily: 'var(--font-heading)' }}>{cName}</h2>
                                            <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>{cQuals}</p>
                                            <p className={cn("text-muted-foreground", forceDesktop ? "text-base" : "text-sm sm:text-base")}>{cSpec}</p>
                                            <p className={cn("mt-2 text-gray-700", forceDesktop ? "text-base" : "text-sm sm:text-base", !forceDesktop && "flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-0")}>
                                                {consultant?.phone ? (
                                                    <a href={`tel:+91${consultant.phone}`} className="font-semibold hover:underline">📞 {consultant.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</a>
                                                ) : (
                                                    <a href="tel:+919866812555" className="font-semibold hover:underline">📞 98668 12555</a>
                                                )}
                                                <span className={cn("mx-2", !forceDesktop && "hidden sm:inline")}>|</span>
                                                {consultant?.email ? (
                                                    <a href={`mailto:${consultant.email}`} className="font-semibold hover:underline">📧 {consultant.email}</a>
                                                ) : (
                                                    <a href="mailto:info@ortho.life" className="font-semibold hover:underline">📧 info@ortho.life</a>
                                                )}
                                            </p>
                                        </div>
                                    </header>
                                )}

                                <main className="flex-grow space-y-2 pt-1 pb-4">
                                    {/* Title */}
                                    <div className="text-center">
                                        <h1 className="text-lg font-bold uppercase tracking-wide text-primary">Discharge Summary</h1>
                                    </div>

                                    {/* Patient Details */}
                                    <section className={cn("border border-border rounded-lg bg-muted/10 break-inside-avoid", forceDesktop ? "p-4 grid grid-cols-2 gap-4" : "p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4")} style={{ pageBreakInside: 'avoid' }}>
                                        <div className={cn("grid grid-cols-[auto_1fr] gap-y-1", forceDesktop ? "gap-x-4" : "gap-x-2 sm:gap-x-4", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
                                            <span className="font-semibold text-muted-foreground">Name:</span>
                                            <span className="font-semibold">{patientSnapshot.name}</span>
                                            <span className="font-semibold text-muted-foreground">Age/Sex:</span>
                                            <span>{patientSnapshot.dob ? `${new Date().getFullYear() - new Date(patientSnapshot.dob).getFullYear()}` : 'N/A'}/{patientSnapshot.sex}</span>
                                        </div>
                                        <div className={cn("grid grid-cols-[auto_1fr] gap-y-1", forceDesktop ? "gap-x-4" : "gap-x-2 sm:gap-x-4", forceDesktop ? "text-base" : "text-sm sm:text-base")}>
                                            <span className="font-semibold text-muted-foreground">Admission Date:</span>
                                            <span>{courseDetails.admission_date ? format(new Date(courseDetails.admission_date), 'dd MMM yyyy') : 'N/A'}</span>
                                            <span className="font-semibold text-muted-foreground">Discharge Date:</span>
                                            <span className="text-sm">{dischargeDate ? format(new Date(dischargeDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}</span>
                                        </div>
                                    </section>

                                    {/* Diagnosis & Procedure */}
                                    <section className="grid grid-cols-1 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                        {courseDetails.diagnosis && (
                                            <div>
                                                <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    {t('discharge.diagnosis')}
                                                </h3>
                                                <p className="whitespace-pre-wrap">{courseDetails.diagnosis}</p>
                                            </div>
                                        )}
                                        {courseDetails.procedure && (
                                            <div>
                                                <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                    <Syringe className="h-4 w-4" />
                                                    {t('discharge.procedure')}
                                                </h3>
                                                <p className="whitespace-pre-wrap">
                                                    {courseDetails.procedure}
                                                    {courseDetails.procedure_date && (
                                                        <span className=""> on {format(new Date(courseDetails.procedure_date), 'dd MMM yyyy')}</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </section>

                                    {/* Operation Notes */}
                                    {courseDetails.operation_notes && (
                                        <section className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                <ClipboardList className="h-4 w-4" />
                                                {t('discharge.operation_notes')}
                                            </h3>
                                            <p className="whitespace-pre-wrap">{courseDetails.operation_notes}</p>
                                        </section>
                                    )}

                                    {/* Clinical Notes (Course in Hospital) */}
                                    {dischargeData.clinical_notes && (
                                        <section className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4" />
                                                {t('discharge.clinical_notes')}
                                            </h3>
                                            <p className="whitespace-pre-wrap">{dischargeData.clinical_notes}</p>
                                        </section>
                                    )}

                                    {/* Medications - Moved UP for visibility */}
                                    {dischargeData.medications && dischargeData.medications.length > 0 && (
                                        <section className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="font-heading font-semibold text-primary mb-2 leading-none flex items-center gap-2">
                                                <Pill className="h-4 w-4" />
                                                {t('prescription.medication', 'Medications at Discharge')}
                                            </h3>
                                            <div className="overflow-x-auto max-w-[calc(100vw-2.5rem)] sm:max-w-none">
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
                                                        {dischargeData.medications.map((med, index) => (
                                                            <React.Fragment key={index}>
                                                                <tr>
                                                                    <td className="border border-border p-2">{index + 1}</td>
                                                                    <td className="border border-border p-2">{(med as any).brandName || (med as any).composition || (med as any).name || ''}</td>
                                                                    <td className="border border-border p-2">{med.dose}</td>
                                                                    {med.frequency ? (
                                                                        <td colSpan={3} className="border border-border p-2 text-center">{med.frequency}</td>
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
                                                                        <td colSpan={8} className="border border-border p-2 text-xs italic text-muted-foreground">{med.notes}</td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    )}

                                    {/* Advice Section: Post-Op / Wound / Activity / Red Flags */}
                                    {(dischargeData.post_op_care || dischargeData.wound_care || dischargeData.activity || dischargeData.red_flags) && (
                                        <section className="space-y-4">

                                            {/* Post-Op Care */}
                                            {dischargeData.post_op_care && (
                                                <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                    <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                        <MessageSquare className="h-4 w-4" />
                                                        {t('discharge.post_op_care')}
                                                    </h3>
                                                    <p className="whitespace-pre-wrap">{dischargeData.post_op_care}</p>
                                                </div>
                                            )}

                                            {/* Wound Care */}
                                            {dischargeData.wound_care && (
                                                <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                    <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                        <ClipboardList className="h-4 w-4" />
                                                        {t('discharge.wound_care')}
                                                    </h3>
                                                    <p className="whitespace-pre-wrap">{dischargeData.wound_care}</p>
                                                </div>
                                            )}

                                            {/* Activity */}
                                            {dischargeData.activity && (
                                                <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                    <h3 className="font-heading font-semibold text-primary mb-1 leading-none flex items-center gap-2">
                                                        <Activity className="h-4 w-4" />
                                                        {t('discharge.activity')}
                                                    </h3>
                                                    <p className="whitespace-pre-wrap">{dischargeData.activity}</p>
                                                </div>
                                            )}

                                            {/* Red Flags - Print Friendly Red Box */}
                                            {dischargeData.red_flags && (
                                                <div className="border border-red-500 bg-red-50 p-4 rounded-md print:border-black print:bg-transparent break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                                    <h3 className="font-heading font-semibold text-red-700 leading-none flex items-center gap-2 mb-2 print:text-black">
                                                        <AlertTriangle className="h-5 w-5 text-red-600 print:text-black" />
                                                        {t('discharge.emergency_red_flags')}
                                                    </h3>
                                                    <p className="whitespace-pre-wrap">{dischargeData.red_flags}</p>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {/* Review Date */}
                                    {dischargeData.review_date && (
                                        <section className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="font-heading font-semibold text-primary leading-none flex items-center gap-2">
                                                <Calendar className="h-5 w-5" />
                                                {t('discharge.review_date')}
                                            </h3>
                                            <p className="font-medium ml-7">{format(new Date(dischargeData.review_date), 'dd MMM yyyy')}</p>
                                        </section>
                                    )}

                                    {/* DAMA Clause */}
                                    {dischargeData.dama_clause && (
                                        <section className="mt-8 border-t border-dashed pt-4">
                                            <p className="text-xs text-muted-foreground text-justify italic">
                                                *** {dischargeData.dama_description || (language === 'te' ? DAMA_TEXT.te : DAMA_TEXT.en)}
                                            </p>
                                        </section>
                                    )}

                                    {/* Signature Block */}
                                    {showSignSeal && (consultant?.sign_url || consultant?.seal_url) && (
                                        <div className={cn(
                                            "mt-8 flex items-end px-8 break-inside-avoid relative z-[60]",
                                            effectivePrintOptions.signatureAlignment === 'left' ? "justify-start" :
                                                effectivePrintOptions.signatureAlignment === 'center' ? "justify-center" : "justify-end"
                                        )} style={{ pageBreakInside: 'avoid' }}>
                                            <div className="text-center">
                                                {consultant?.sign_url && (
                                                    <img src={consultant.sign_url} alt="Doctor's Signature" className="h-16" />
                                                )}
                                                <div className="relative">
                                                    {consultant?.seal_url && (
                                                        <img src={consultant.seal_url} alt="Doctor's Seal" className="h-20 absolute -top-12 left-1/2 -translate-x-1/2 opacity-40 z-[-1]" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </main>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer - Visual only, fixed for print, flex box for screen */}
                {!effectivePrintOptions.letterheadMode && (
                    <footer
                        className={cn(
                            "mt-auto w-full p-2 border-t-2 border-primary-light flex justify-between items-center bg-white z-50 print:fixed print:bottom-0 print:left-0 print:right-0 print:mb-0 mb-4 break-inside-avoid",
                            showMargins ? "print:pl-16 print:pr-8 pl-16 pr-8" : "print:px-8 px-8"
                        )}
                        style={{ backgroundImage: noBackground ? 'none' : backgroundPattern, pageBreakInside: 'avoid' }}
                    >
                        <p className="text-primary font-semibold text-xs" dangerouslySetInnerHTML={{ __html: t('prescription.footer_text') }} />
                        <img src="/images/assets/qr-code.png" alt="QR Code" className="h-16 w-16" />
                    </footer>
                )}
                {/* Smart Footer Mask for pre-printed errors */}
                {effectivePrintOptions.letterheadMode && effectivePrintOptions.footerMask && (
                    <div
                        className="absolute print:fixed bg-black print:bg-black z-[100] flex items-center justify-center"
                        style={{
                            bottom: `${Number(effectivePrintOptions.footerMaskCoords?.bottom || 0) - 0.1}cm`,
                            right: `${Number(effectivePrintOptions.footerMaskCoords?.right || 0) - 1}cm`,
                            width: `${effectivePrintOptions.footerMaskCoords?.width}cm`,
                            height: `${effectivePrintOptions.footerMaskCoords?.height}cm`,
                            pointerEvents: 'none',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                        }}
                    />
                )}
            </div>
        </div>
    );
});
