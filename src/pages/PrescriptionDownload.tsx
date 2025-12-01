import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/components/Prescription';
import { HOSPITALS } from '@/config/constants';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

const PrescriptionDownload = () => {
    const { patientPhone } = useParams<{ patientPhone: string }>();
    const { i18n } = useTranslation();
    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [downloadStarted, setDownloadStarted] = useState(false);

    useEffect(() => {
        const fetchConsultation = async () => {
            if (!patientPhone) {
                setError("No phone number provided");
                setLoading(false);
                return;
            }

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
        if (consultation && contentRef.current && !downloadStarted) {
            setDownloadStarted(true);
            // Small delay to ensure rendering is complete
            setTimeout(() => {
                const element = contentRef.current;
                const opt = {
                    margin: 0,
                    filename: `Prescription-${consultation.patient.name}-${format(new Date(consultation.created_at), 'yyyy-MM-dd')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
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
            <div className="flex items-center justify-center h-screen text-red-500">
                {error}
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
                {/* We render the prescription here so html2pdf can capture it. 
              It serves as a preview as well. */}
                {consultation && (
                    <Prescription
                        ref={contentRef}
                        patient={consultation.patient}
                        consultation={consultation.consultation_data}
                        consultationDate={new Date(consultation.created_at)}
                        age={consultation.patient.dob ? Math.floor((new Date().getTime() - new Date(consultation.patient.dob).getTime()) / 31557600000) : ''}
                        language={i18n.language}
                        logoUrl={HOSPITALS.find(h => h.name === 'OrthoLife')?.logoUrl || '/images/logos/logo.png'}
                    />
                )}
            </div>
        </div>
    );
};

export default PrescriptionDownload;
