import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DischargeSummaryPrint } from '@/components/inpatient/DischargeSummaryPrint';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, History, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PatientSelectionModal from '@/components/PatientSelectionModal';

const DischargeSummaryDownload = () => {
    const { patientPhone } = useParams<{ patientPhone: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const [summaryData, setSummaryData] = useState<any>(null);
    const [consultationConsultant, setConsultationConsultant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allSummaries, setAllSummaries] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [inputPhone, setInputPhone] = useState('');
    const [isPatientSelectionModalOpen, setIsPatientSelectionModalOpen] = useState(false);
    const [patientList, setPatientList] = useState<any[]>([]);

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

                // If single patient, fetch summary directly
                fetchSummaryForPatient(patientData[0]);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchPatients();
    }, [patientPhone]);

    const fetchSummaryForPatient = async (patientData: any) => {
        setLoading(true);
        try {
            // 2. Fetch all discharged in_patient records
            const { data: dbData, error: dbError } = await supabase
                .from('in_patients')
                .select('*')
                .eq('patient_id', patientData.id)
                .eq('status', 'discharged')
                .order('discharge_date', { ascending: false });

            if (dbError) throw new Error(`Error fetching summaries: ${dbError.message}`);

            if (dbData && dbData.length > 0) {
                setAllSummaries(dbData);
                // By default select the latest one
                handleSelectSummary(dbData[0]);
            } else {
                setError("No discharge summary found for this patient");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSummary = async (inPatientData: any) => {
        setSummaryData({
            ...inPatientData.discharge_summary,
            id: inPatientData.id,
            language: inPatientData.language, // Use saved language preference
            savedDischargeDate: inPatientData.discharge_date
        });
        setConsultationConsultant(null); // Reset while loading new one
        setShowHistory(false); // Close timeline on selection

        // 3. Fetch consultant details if available
        if (inPatientData.consultant_id) {
            const { data: consultantData, error: consultantError } = await supabase
                .from('consultants')
                .select('*')
                .eq('id', inPatientData.consultant_id)
                .maybeSingle();

            if (!consultantError && consultantData) {
                setConsultationConsultant(consultantData);
            }
        }
    };

    const getPrintOptions = () => {
        if (!consultationConsultant?.messaging_settings) return undefined;
        const settings = consultationConsultant.messaging_settings as any;
        const locationPrintOptions = settings.location_print_options || {};
        
        // Try to get location from summaryData if available, or first key
        const location = (summaryData as any)?.location || Object.keys(locationPrintOptions)[0];
        if (!location) return undefined;

        const dbOptions = locationPrintOptions[location];
        if (!dbOptions) return undefined;

        return {
            ...dbOptions,
            letterheadMode: false,
            footerMask: false,
            fontSize: dbOptions.fontSize || 'standard',
            signatureAlignment: dbOptions.signatureAlignment || 'right'
        };
    };

    const printOptions = getPrintOptions();

    const handlePatientSelect = (selectedPatient: any) => {
        setIsPatientSelectionModalOpen(false);
        fetchSummaryForPatient(selectedPatient);
    };

    const handleDownload = async () => {
        if (summaryData && printRef.current) {
            setDownloadStarted(true);
            try {
                const element = printRef.current;
                const opt = {
                    margin: [0, 0, 0, 0],
                    filename: `Discharge-Summary-${summaryData.patient_snapshot.name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
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
            navigate(`/d/${inputPhone.trim()}`);
        }
    };

    if (!patientPhone) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">Download Discharge Summary</CardTitle>
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
                <span className="ml-2">Loading summary...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-500 gap-4">
                <p>{error}</p>
                <Button variant="outline" onClick={() => navigate('/d')}>
                    Try Another Number
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center relative">
            <PatientSelectionModal
                isOpen={isPatientSelectionModalOpen}
                patients={patientList}
                onSelect={handlePatientSelect}
            />

            <div className="bg-white w-full max-w-3xl min-h-0 shadow-none sm:shadow-lg sm:my-8 sm:rounded-lg">
                {/* Preview */}
                {summaryData && (
                    <DischargeSummaryPrint
                        ref={contentRef}
                        patientSnapshot={summaryData.patient_snapshot}
                        courseDetails={summaryData.course_details}
                        dischargeData={summaryData.discharge_data}
                        language={summaryData.language || i18n.language}
                        logoUrl={consultationConsultant?.logo_url || "/images/logos/logo.png"}
                        className="min-h-[297mm]"
                        dischargeDate={summaryData.savedDischargeDate}
                        showMargins={false}
                        consultant={consultationConsultant}
                        printOptions={printOptions}
                        showSignSeal={false}
                    />
                )}
            </div>

            {/* Collapsible Vertical Timeline */}
            {allSummaries.length > 1 && (
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
                            {allSummaries.map((s, idx) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSelectSummary(s)}
                                    className="flex items-center gap-3 group transition-all duration-300 relative"
                                >
                                    <span 
                                        className={cn(
                                            "text-[10px] font-bold bg-white/95 backdrop-blur-sm border px-2 py-1 rounded shadow-md transition-all",
                                            summaryData?.id === s.id ? "border-primary text-primary" : "text-muted-foreground border-transparent"
                                        )}
                                    >
                                        {s.discharge_date ? format(new Date(s.discharge_date), 'dd MMM yyyy') : 'No Date'}
                                        {idx === 0 && " (Latest)"}
                                    </span>
                                    <div 
                                        className={cn(
                                            "h-10 w-10 rounded-full border-2 flex items-center justify-center bg-white shadow-xl transition-all duration-300 shrink-0",
                                            summaryData?.id === s.id 
                                                ? "border-primary text-primary scale-110 ring-4 ring-primary/20" 
                                                : "border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary"
                                        )}
                                    >
                                        <span className="text-[10px] font-black">{allSummaries.length - idx}</span>
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
            {summaryData && (
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
                <div ref={printRef} style={{ width: '210mm', minHeight: '296mm', backgroundColor: 'white' }}>
                    {summaryData && (
                        <DischargeSummaryPrint
                            patientSnapshot={summaryData.patient_snapshot}
                            courseDetails={summaryData.course_details}
                            dischargeData={summaryData.discharge_data}
                            language={summaryData.language || i18n.language}
                            logoUrl={consultationConsultant?.logo_url || "/images/logos/logo.png"}
                            forceDesktop={true}
                            dischargeDate={summaryData.savedDischargeDate}
                            showMargins={false}
                            consultant={consultationConsultant}
                            printOptions={printOptions}
                            showSignSeal={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DischargeSummaryDownload;
