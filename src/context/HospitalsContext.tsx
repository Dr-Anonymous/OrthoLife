import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConsultant } from './ConsultantContext';
import { areLocationsEqual } from '@/lib/utils';


export interface HospitalSettings {
    op_fees: number;
    free_visit_duration_days: number;
    address?: string | { en?: string; te?: string };
    [key: string]: any; // Allow extensibility
}

export interface Hospital {
    id: string;
    name: string;
    logoUrl: string; // Mapped from logo_url
    lat: number;
    lng: number;
    settings: HospitalSettings;
    consultantId?: string | null;
}

interface HospitalsContextType {
    hospitals: Hospital[];
    isLoading: boolean;
    error: string | null;
    getHospitalByName: (name: string) => Hospital | undefined;
    refreshHospitals: () => Promise<void>;
}

/**
 * Hospitals Context
 * 
 * Provides global state for configured hospital branches.
 * Features:
 * - Fetches hospital branch profiles linked to the current consultant.
 * - Resolves snake_case DB columns to camelCase frontend format.
 * - Implements simple localStorage caching to avoid redundant fetch requests.
 */
const HospitalsContext = createContext<HospitalsContextType | undefined>(undefined);

export const HospitalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { consultant } = useConsultant();

    const fetchHospitals = async () => {
        const activeConsultantId = consultant?.id;
        
        if (!activeConsultantId) {
            setHospitals([]);
            setIsLoading(false);
            return;
        }

        // 1. Try to load from cache first
        const cacheKey = `hospitals_cache_${activeConsultantId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setHospitals(JSON.parse(cached));
                setIsLoading(false);
            } catch (e) {
                console.error("Failed to parse hospital cache", e);
            }
        }

        try {
            const { data, error } = await supabase
                .from('hospitals')
                .select('*')
                .or(`consultant_id.eq.${activeConsultantId},consultant_id.is.null`);

            if (error) throw error;

            // Transform snake_case DB columns to camelCase frontend interface
            const transformed: Hospital[] = data.map((h: any) => ({
                id: h.id,
                name: h.name,
                logoUrl: h.logo_url,
                lat: h.lat,
                lng: h.lng,
                settings: h.settings || { op_fees: 0, free_visit_duration_days: 14 },
                consultantId: h.consultant_id
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

    useEffect(() => {
        fetchHospitals();
    }, [consultant?.id]);

    const getHospitalByName = (name: string) => hospitals.find(h => areLocationsEqual(h.name, name));

    return (
        <HospitalsContext.Provider value={{ hospitals, isLoading, error, getHospitalByName, refreshHospitals: fetchHospitals }}>
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
