import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HospitalSettings {
    op_fees: number;
    free_visit_duration_days: number;
    [key: string]: any; // Allow extensibility
}

export interface Hospital {
    id: string;
    name: string;
    logoUrl: string; // Mapped from logo_url
    lat: number;
    lng: number;
    settings: HospitalSettings;
}

interface HospitalsContextType {
    hospitals: Hospital[];
    isLoading: boolean;
    error: string | null;
    getHospitalByName: (name: string) => Hospital | undefined;
}

const HospitalsContext = createContext<HospitalsContextType | undefined>(undefined);

export const HospitalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const { data, error } = await supabase
                    .from('hospitals')
                    .select('*');

                if (error) throw error;

                // Transform snake_case DB columns to camelCase frontend interface
                const transformed: Hospital[] = data.map((h: any) => ({
                    id: h.id,
                    name: h.name,
                    logoUrl: h.logo_url,
                    lat: h.lat,
                    lng: h.lng,
                    settings: h.settings || { op_fees: 0, free_visit_duration_days: 14 }
                }));

                setHospitals(transformed);
            } catch (err: any) {
                console.error('Error fetching hospitals:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHospitals();
    }, []);

    const getHospitalByName = (name: string) => hospitals.find(h => h.name === name);

    return (
        <HospitalsContext.Provider value={{ hospitals, isLoading, error, getHospitalByName }}>
            {children}
        </HospitalsContext.Provider>
    );
};

export const useHospitals = () => {
    const context = useContext(HospitalsContext);
    if (context === undefined) {
        throw new Error('useHospitals must be used within a HospitalsProvider');
    }
    return context;
};
