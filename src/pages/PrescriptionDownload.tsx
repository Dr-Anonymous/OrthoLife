import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/components/consultation/Prescription';
import { useHospitals } from '@/context/HospitalsContext';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, History, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cleanConsultationData, cn } from '@/lib/utils';
import PatientSelectionModal from '@/components/PatientSelectionModal';


const PrescriptionDownload = () => {
    const { patientPhone } = useParams<{ patientPhone: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const { getHospitalByName } = useHospitals();
    const [consultation, setConsultation] = useState<any>(null);
    const [consultationConsultant, setConsultationConsultant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [inputPhone, setInputPhone] = useState('');
    const [isPatientSelectionModalOpen, setIsPatientSelectionModalOpen] = useState(false);
    const [patientList, setPatientList] = useState<any[]>([]);
    const [allConsultations, setAllConsultations] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            if (!patientPhone) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // 1. Find patient by phone
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .select('id, name, dob, sex, phone')
                    .eq('phone', patientPhone);

                if (patientError) throw patientError;

                if (!patientData || patientData.length === 0) {
                    throw new Error("Patient not found");
                }

                if (patientData.length > 1) {
                    setPatientList(patientData);
                    setIsPatientSelectionModalOpen(true);
                    setLoading(false);
                    return;
                }

                // If single patient, fetch consultations directly
                fetchConsultationsForPatient(patientData[0]);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchPatients();
    }, [patientPhone]);

    const fetchConsultationsForPatient = async (patientData: any) => {
        setLoading(true);
        try {
            // 2. Fetch consultations
            const { data: dbData, error: dbError } = await supabase.functions.invoke('get-consultations', {
                body: { patientId: patientData.id },
            });

            if (dbError) throw new Error(`Error fetching consultations: ${dbError.message}`);

            if (dbData.consultations && dbData.consultations.length > 0) {
                // Sort by created_at desc to get the latest
                const sorted = dbData.consultations.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                setAllConsultations(sorted);
                // By default select the latest one
                handleSelectConsultation(sorted[0]);
            } else {
                setError("No consultations found for this patient");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleSelectConsultation = async (currentConsultation: any) => {
        setConsultation(currentConsultation);
        setConsultationConsultant(null); // Reset while loading new one
        setShowHistory(false); // Close timeline on selection

        // 3. Fetch consultant details if available
        if (currentConsultation.consultant_id) {
            const { data: consultantData, error: consultantError } = await supabase
                .from('consultants')
                .select('*')
                .eq('id', currentConsultation.consultant_id)
                .maybeSingle();

            if (!consultantError && consultantData) {
                setConsultationConsultant(consultantData);
            }
        }
    };

    const handlePatientSelect = (selectedPatient: any) => {
        setIsPatientSelectionModalOpen(false);
        fetchConsultationsForPatient(selectedPatient);
    };

    const handleDownload = async () => {
        if (consultation && printRef.current) {
            setDownloadStarted(true);
            try {
                const element = printRef.current;
                const opt = {
                    margin: [0, 0, 0, 0],
                    filename: `Prescription-${consultation.patient.name}-${format(new Date(consultation.created_at), 'yyyy-MM-dd')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: false, logging: false, scrollY: 0 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                await (html2pdf as any)().from(element).set(opt).save();
                setDownloadStarted(false);
            } catch (err) {
                console.error("PDF generation failed", err);
                setError("Failed to generate PDF");
                setDownloadStarted(false);
            }
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputPhone.trim()) {
            navigate(`/prescription/${inputPhone.trim()}`);
        }
    };

    if (!patientPhone) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">Download Prescription</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="tel"
                                    placeholder="Enter Patient Phone Number"
                                    value={inputPhone}
                                    onChange={(e) => setInputPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Search className="mr-2 h-4 w-4" />
                                Search & Download
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading prescription...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-500 gap-4">
                <p>{error}</p>
                <Button variant="outline" onClick={() => navigate('/prescription')}>
                    Try Another Number
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center relative pb-24">
            <PatientSelectionModal
                isOpen={isPatientSelectionModalOpen}
                patients={patientList}
                onSelect={handlePatientSelect}
            />

            <div className="bg-white w-full max-w-3xl min-h-0 shadow-none sm:shadow-lg sm:my-8 sm:rounded-lg overflow-hidden">
                {/* Preview */}
                {consultation && (
                    <Prescription
                        ref={contentRef}
                        patient={consultation.patient}
                        consultation={cleanConsultationData(consultation.consultation_data)}
                        consultationDate={new Date(consultation.created_at)}
                        age={consultation.patient.dob ? Math.floor((new Date().getTime() - new Date(consultation.patient.dob).getTime()) / 31557600000) : ''}
                        language={consultation.language || i18n.language}
                        logoUrl={getHospitalByName(consultation.location)?.logoUrl || consultationConsultant?.logo_url || getHospitalByName('OrthoLife')?.logoUrl || '/images/logos/logo.png'}
                        hospitalName={consultation.location}
                        className="min-h-[297mm]"
                        showMargins={false}
                        consultant={consultationConsultant}
                        showSignSeal={false}
                        printOptions={(() => {
                            if (!consultationConsultant) return undefined;
                            const settings = consultationConsultant.messaging_settings as any;
                            const location = consultation.location || 'OrthoLife';
                            const options = settings?.location_print_options?.[location] || settings?.location_print_options?.['OrthoLife'];
                            if (!options) return undefined;
                            return { ...options, letterheadMode: false, footerMask: false };
                        })()}
                    />
                )}
            </div>

            {/* Collapsible Vertical Timeline */}
            {allConsultations.length > 1 && (
                <div className="fixed right-6 bottom-24 flex flex-col items-end gap-3 z-40">
                    {/* History Items - Floating Above Toggle */}
                    <div 
                        className={cn(
                            "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
                            showHistory 
                                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                                : "opacity-0 scale-95 translate-y-4 pointer-events-none"
                        )}
                    >
                        <div className="flex flex-col items-end gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-2 px-2">
                            {allConsultations.map((c, idx) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelectConsultation(c)}
                                    className="flex items-center gap-3 group transition-all duration-300 relative"
                                >
                                    <span 
                                        className={cn(
                                            "text-[10px] font-bold bg-white/95 backdrop-blur-sm border px-2 py-1 rounded shadow-md transition-all",
                                            consultation?.id === c.id ? "border-primary text-primary" : "text-muted-foreground border-transparent"
                                        )}
                                    >
                                        {format(new Date(c.created_at), 'dd MMM yyyy')}
                                        {idx === 0 && " (Latest)"}
                                    </span>
                                    <div 
                                        className={cn(
                                            "h-10 w-10 rounded-full border-2 flex items-center justify-center bg-white shadow-xl transition-all duration-300 shrink-0",
                                            consultation?.id === c.id 
                                                ? "border-primary text-primary scale-110 ring-4 ring-primary/20" 
                                                : "border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary"
                                        )}
                                    >
                                        <span className="text-[10px] font-black">{allConsultations.length - idx}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <Button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                            "h-12 w-12 rounded-full shadow-lg transition-all duration-300 p-0",
                            showHistory ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-primary"
                        )}
                        size="icon"
                    >
                        {showHistory ? <X className="h-6 w-6 text-white" /> : <History className="h-6 w-6 text-white" />}
                    </Button>
                </div>
            )}

            {/* Floating Download Button */}
            {consultation && (
                <Button
                    onClick={handleDownload}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 p-0 hover:scale-105 transition-transform"
                    disabled={downloadStarted}
                    size="icon"
                >
                    {downloadStarted ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                    )}
                </Button>
            )}

            {/* Hidden Print Version - Fixed A4 Width */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div ref={printRef} style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'white' }}>
                    {consultation && (
                        <Prescription
                            className="min-h-[297mm]"
                            patient={consultation.patient}
                            consultation={cleanConsultationData(consultation.consultation_data)}
                            consultationDate={new Date(consultation.created_at)}
                            age={consultation.patient.dob ? Math.floor((new Date().getTime() - new Date(consultation.patient.dob).getTime()) / 31557600000) : ''}
                            language={consultation.language || i18n.language}
                            logoUrl={getHospitalByName(consultation.location)?.logoUrl || consultationConsultant?.logo_url || getHospitalByName('OrthoLife')?.logoUrl || '/images/logos/logo.png'}
                            hospitalName={consultation.location}
                            qrCodeUrl="/images/assets/qr-code.png"
                            noBackground={true}
                            forceDesktop={true}
                            visitType={consultation.visit_type}
                            showMargins={false}
                            consultant={consultationConsultant}
                            showSignSeal={false}
                            printOptions={(() => {
                                if (!consultationConsultant) return undefined;
                                const settings = consultationConsultant.messaging_settings as any;
                                const location = consultation.location || 'OrthoLife';
                                const options = settings?.location_print_options?.[location] || settings?.location_print_options?.['OrthoLife'];
                                if (!options) return undefined;
                                return { ...options, letterheadMode: false, footerMask: false };
                            })()}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrescriptionDownload;
