import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Consultant } from '@/types/consultation';
import { toast } from 'sonner';

interface ConsultantContextType {
    consultant: Consultant | null;
    isLoading: boolean;
    error: string | null;
    isMasterAdmin: boolean;
    refreshConsultant: () => Promise<void>;
}

const ConsultantContext = createContext<ConsultantContextType | undefined>(undefined);

export const ConsultantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [consultant, setConsultant] = useState<Consultant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConsultant = useCallback(async () => {
        if (authLoading) return;
        if (!user?.phoneNumber) {
            setConsultant(null);
            setIsLoading(false);
            return;
        }

        try {
            const rawPhone = user.phoneNumber;
            const formattedPhone = rawPhone.replace(/\D/g, '').slice(-10);

            const { data, error: fetchError } = await supabase
                .from('consultants')
                .select('*')
                .ilike('phone', `%${formattedPhone}`)
                .eq('is_active', true)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (data) setConsultant(data as unknown as Consultant);
        } catch (err: any) {
            console.error('Error fetching consultant profile:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, authLoading]);

    const refreshConsultant = async () => {
        await fetchConsultant();
    };

    useEffect(() => {
        fetchConsultant();
    }, [fetchConsultant]);

    const value = {
        consultant,
        isLoading: authLoading || isLoading,
        error,
        isMasterAdmin: consultant?.is_admin || false,
        refreshConsultant
    };

    return (
        <ConsultantContext.Provider value={value}>
            {children}
        </ConsultantContext.Provider>
    );
};

export const useConsultant = () => {
    const context = useContext(ConsultantContext);
    if (context === undefined) {
        throw new Error('useConsultant must be used within a ConsultantProvider');
    }
    return context;
};
