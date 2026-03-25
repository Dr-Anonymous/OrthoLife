import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConsultant } from './ConsultantContext';

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

    const { consultant } = useConsultant();

    useEffect(() => {
        const fetchHospitals = async () => {
            if (!consultant) return;

            // 1. Try to load from cache first (per-consultant cache)
            const cacheKey = `hospitals_cache_${consultant.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    setHospitals(JSON.parse(cached));
                    setIsLoading(false); // Show cached content immediately
                } catch (e) {
                    console.error("Failed to parse hospital cache", e);
                }
            }

            try {
                const { data, error } = await supabase
                    .from('hospitals')
                    .select('*')
                    .eq('consultant_id', consultant.id);

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
                // 2. Update cache
                localStorage.setItem(cacheKey, JSON.stringify(transformed));

            } catch (err: any) {
                console.error('Error fetching hospitals:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHospitals();
    }, [consultant?.id]);

    const getHospitalByName = (name: string) => hospitals.find(h => h.name.toLowerCase() === name.toLowerCase());

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
