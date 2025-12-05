import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/components/Prescription';
import { HOSPITALS } from '@/config/constants';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cleanConsultationData } from '@/lib/utils';

const PrescriptionDownload = () => {
    const { patientPhone } = useParams<{ patientPhone: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [inputPhone, setInputPhone] = useState('');

    useEffect(() => {
        const fetchConsultation = async () => {
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
                    .eq('phone', patientPhone)
                    .maybeSingle();

                if (patientError) throw patientError;
                if (!patientData) {
                    throw new Error("Patient not found");
                }

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

                    setConsultation(sorted[0]);
                } else {
                    setError("No consultations found for this patient");
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchConsultation();
    }, [patientPhone]);

    useEffect(() => {
        if (consultation && printRef.current && !downloadStarted) {
            setDownloadStarted(true);
            // Small delay to ensure rendering is complete
            setTimeout(() => {
                const element = printRef.current;
                const opt = {
                    margin: [0, 0, 0, 0], // Top, Left, Bottom, Right margins in mm
                    filename: `Prescription-${consultation.patient.name}-${format(new Date(consultation.created_at), 'yyyy-MM-dd')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                (html2pdf as any)().from(element).set(opt).save().then(() => {
                    // Optional: Show completion message or redirect
                }).catch((err: any) => {
                    console.error("PDF generation failed", err);
                    setError("Failed to generate PDF");
                });
            }, 1000);
        }
    }, [consultation, downloadStarted]);

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
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
            <div className="mb-4 text-center">
                <h1 className="text-xl font-bold">Prescription Download</h1>
                <p className="text-gray-600">Your download should start automatically...</p>
            </div>

            <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-3xl w-full">
                {/* Preview */}
                {consultation && (
                    <Prescription
                        ref={contentRef}
                        patient={consultation.patient}
                        consultation={cleanConsultationData(consultation.consultation_data)}
                        consultationDate={new Date(consultation.created_at)}
                        age={consultation.patient.dob ? Math.floor((new Date().getTime() - new Date(consultation.patient.dob).getTime()) / 31557600000) : ''}
                        language={consultation.language || i18n.language}
                        logoUrl={HOSPITALS.find(h => h.name === consultation.location)?.logoUrl || HOSPITALS.find(h => h.name === 'OrthoLife')?.logoUrl || '/images/logos/logo.png'}
                    />
                )}
            </div>

            {/* Hidden Print Version - Fixed A4 Width */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div ref={printRef} style={{ width: '210mm', minHeight: '296mm', backgroundColor: 'white' }}>
                    {consultation && (
                        <Prescription
                            className="min-h-[296mm]"
                            patient={consultation.patient}
                            consultation={cleanConsultationData(consultation.consultation_data)}
                            consultationDate={new Date(consultation.created_at)}
                            age={consultation.patient.dob ? Math.floor((new Date().getTime() - new Date(consultation.patient.dob).getTime()) / 31557600000) : ''}
                            language={consultation.language || i18n.language}
                            logoUrl={HOSPITALS.find(h => h.name === consultation.location)?.logoUrl || HOSPITALS.find(h => h.name === 'OrthoLife')?.logoUrl || '/images/logos/logo.png'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrescriptionDownload;
