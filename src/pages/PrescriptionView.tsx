import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/components/Prescription';
import { HOSPITALS } from '@/config/constants';
import { Loader2 } from 'lucide-react';

const PrescriptionView = () => {
    const { phoneNumber } = useParams();
    const [consultation, setConsultation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestConsultation = async () => {
            if (!phoneNumber) return;

            try {
                setLoading(true);
                // Fetch patient by phone number first to get ID
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('phone', phoneNumber)
                    .single();

                if (patientError) throw new Error('Patient not found');

                // Fetch latest consultation
                const { data: consultationData, error: consultationError } = await supabase
                    .from('consultations')
                    .select('*, patients(*)')
                    .eq('patient_id', patientData.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (consultationError) throw new Error('Consultation not found');

                setConsultation(consultationData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestConsultation();
    }, [phoneNumber]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !consultation) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500">
                {error || 'No prescription found'}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-4">
            <Prescription
                patient={consultation.patients}
                consultation={consultation.consultation_data}
                consultationDate={new Date(consultation.created_at)}
                age={consultation.patients.dob ? Math.floor((new Date().getTime() - new Date(consultation.patients.dob).getTime()) / 31557600000) : ''}
                language="en" // Default to English or fetch from consultation if available
                logoUrl={HOSPITALS.find(h => h.name === 'OrthoLife')?.logoUrl}
            />
        </div>
    );
};

export default PrescriptionView;
