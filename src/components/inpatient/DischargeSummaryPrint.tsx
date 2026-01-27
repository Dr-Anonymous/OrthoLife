import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { InPatient, DischargeData, CourseDetails } from '@/types/inPatients';
import { MessageSquare, Clock, Calendar, Pill, Sun, CloudSun, Moon, Syringe, FileText, User, AlertTriangle, ClipboardList, Activity } from 'lucide-react';
import { DAMA_TEXT } from '@/utils/dischargeConstants';

interface DischargeSummaryPrintProps {
    patientSnapshot: {
        name: string;
        dob: string;
        sex: string;
        phone: string;
        id: string;
    };
    courseDetails: CourseDetails;
    dischargeData: DischargeData;
    language: string;
    logoUrl: string;
    className?: string;
    noBackground?: boolean;
    forceDesktop?: boolean;
    dischargeDate?: string;
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
    dischargeDate
}, ref) => {
    const { t, i18n } = useTranslation();

    React.useEffect(() => {
        i18n.changeLanguage(language);
    }, [language, i18n]);

    const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

    return (
        <div ref={ref} className={cn("p-8 font-sans text-sm bg-background text-foreground flex flex-col min-h-[296mm]", className)} style={{ fontFamily: 'var(--font-sans)' }}>
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
                <section className="grid grid-cols-1 gap-4">
                    {courseDetails.diagnosis && (
                        <div>
                            <h3 className="font-heading font-semibold text-primary mb-1">Diagnosis</h3>
                            <p className="whitespace-pre-wrap text-sm">{courseDetails.diagnosis}</p>
                        </div>
                    )}
                    {courseDetails.procedure && (
                        <div>
                            <h3 className="font-heading font-semibold text-primary mb-1">Procedure Performed</h3>
                            <p className="whitespace-pre-wrap text-sm">
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
                    <section>
                        <h3 className="font-heading font-semibold text-primary mb-1">Operation Notes</h3>
                        <p className="whitespace-pre-wrap text-sm">{courseDetails.operation_notes}</p>
                    </section>
                )}

                {/* Clinical Notes / Post Op Care */}
                {(dischargeData.clinical_notes || dischargeData.post_op_care) && (
                    <section className="grid grid-cols-1 gap-6">
                        {dischargeData.clinical_notes && (
                            <div>
                                <h3 className="font-heading font-semibold text-primary mb-1">Clinical Course / Notes</h3>
                                <p className="whitespace-pre-wrap text-sm">{dischargeData.clinical_notes}</p>
                            </div>
                        )}
                        {dischargeData.post_op_care && (
                            <div>
                                <h3 className="font-heading font-semibold text-primary mb-1">Post-Op Care & Advice</h3>
                                <p className="whitespace-pre-wrap text-sm">{dischargeData.post_op_care}</p>
                            </div>
                        )}
                    </section>
                )}

                {/* New Sections: Red Flags, Wound Care, Activity */}
                {(dischargeData.red_flags || dischargeData.wound_care || dischargeData.activity) && (
                    <section className="space-y-4">
                        {/* Red Flags - Print Friendly Red Box */}
                        {dischargeData.red_flags && (
                            <div className="border border-red-500 bg-red-50 p-4 rounded-md print:border-black print:bg-transparent">
                                <h3 className="font-heading font-semibold text-red-700 flex items-center gap-2 mb-2 print:text-black">
                                    <AlertTriangle className="h-5 w-5 text-red-600 print:text-black" />
                                    {language === 'te' ? 'జాగ్రత్తలు / ప్రమాద సంకేతాలు' : 'Emergency Red Flags'}
                                </h3>
                                <p className="whitespace-pre-wrap text-sm">{dischargeData.red_flags}</p>
                            </div>
                        )}

                        {/* Wound Care */}
                        {dischargeData.wound_care && (
                            <div>
                                <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    {language === 'te' ? 'గాయం జాగ్రత్తలు' : 'Wound Care Instructions'}
                                </h3>
                                <p className="whitespace-pre-wrap text-sm">{dischargeData.wound_care}</p>
                            </div>
                        )}

                        {/* Activity */}
                        {dischargeData.activity && (
                            <div>
                                <h3 className="font-heading font-semibold text-primary mb-1 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    {language === 'te' ? 'శారీరక కదలికలు' : 'Activity & Physiotherapy'}
                                </h3>
                                <p className="whitespace-pre-wrap text-sm">{dischargeData.activity}</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Medications */}
                {dischargeData.medications && dischargeData.medications.length > 0 && (
                    <section>
                        <h3 className="font-heading font-semibold text-primary mb-2 flex items-center gap-2">
                            <Pill className="h-4 w-4" />
                            {t('prescription.medication', 'Medications at Discharge')}
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
                                    {dischargeData.medications.map((med, index) => (
                                        <React.Fragment key={index}>
                                            <tr>
                                                <td className="border border-border p-2">{index + 1}</td>
                                                <td className="border border-border p-2">{med.name}</td>
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

                {/* Review Date */}
                {dischargeData.review_date && (
                    <section className="mt-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                        <h3 className="font-heading font-semibold text-primary flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Review Date
                        </h3>
                        <p className="text-sm font-medium ml-7">{format(new Date(dischargeData.review_date), 'dd MMM yyyy')}</p>
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
            </main>

            {/* Print Footer Spacer - Reserves space so content doesn't get hidden behind fixed footer */}
            <div className="hidden print:block h-24" aria-hidden="true" />

            {/* Footer */}
            <footer
                className="mt-auto p-2 border-t-2 border-primary-light rounded-b-lg flex justify-between items-center print:fixed print:bottom-0 print:left-0 print:right-0 print:w-full print:bg-white print:z-50 print:m-0 print:px-8 print:mb-4"
                style={{ backgroundImage: noBackground ? 'none' : backgroundPattern }}
            >
                <p className="text-primary font-semibold text-xs" dangerouslySetInnerHTML={{ __html: t('prescription.footer_text') }} />
                <img src="/images/assets/qr-code.png" alt="QR Code" className="h-16 w-16" />
            </footer>
        </div >
    );
});
DischargeSummaryPrint.displayName = 'DischargeSummaryPrint';
