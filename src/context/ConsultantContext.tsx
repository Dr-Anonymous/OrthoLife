import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Consultant } from '@/types/consultation';
import { toast } from 'sonner';

interface ConsultantContextType {
    consultant: Consultant | null;
    isLoading: boolean;
    error: string | null;
    isMasterAdmin: boolean;
}

const ConsultantContext = createContext<ConsultantContextType | undefined>(undefined);

export const ConsultantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [consultant, setConsultant] = useState<Consultant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    console.log(`[ConsultantContext] Provider State: Loading=${authLoading}, User=${user?.phoneNumber || 'No User'}`);

    useEffect(() => {
        const fetchConsultant = async () => {
            console.log(`[ConsultantContext] fetchConsultant triggered...`);
            if (authLoading) {
                console.log(`[ConsultantContext] Skipping fetch - Auth is still loading`);
                return;
            }

            if (!user?.phoneNumber) {
                setConsultant(null);
                setIsLoading(false);
                return;
            }

            try {
                // Get last 10 digits for matching
                const rawPhone = user.phoneNumber;
                console.log(`[ConsultantContext] User Object:`, { uid: user.uid, phoneNumber: user.phoneNumber });

                if (!rawPhone) {
                    console.warn(`[ConsultantContext] No phone number available for user ${user.uid}`);
                    setConsultant(null);
                    setIsLoading(false);
                    return;
                }

                const formattedPhone = rawPhone.replace(/\D/g, '').slice(-10);
                console.log(`[ConsultantContext] Derived Pattern: %${formattedPhone}`);

                const { data, error: fetchError } = await supabase
                    .from('consultants')
                    .select('*')
                    .ilike('phone', `%${formattedPhone}`)
                    .eq('is_active', true)
                    .maybeSingle();

                if (fetchError) {
                    console.error('[ConsultantContext] Supabase Error:', fetchError);
                    throw fetchError;
                }

                if (data) {
                    console.log(`[ConsultantContext] Successfully found consultant:`, data);
                    setConsultant(data as unknown as Consultant);
                } else {
                    console.warn(`[ConsultantContext] No consultant row found in DB for phone pattern %${formattedPhone}`);
                    setConsultant(null);
                }
            } catch (err: any) {
                console.error('Error fetching consultant profile:', err);
                setError(err.message);
                toast.error('Failed to load doctor profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchConsultant();
    }, [user, authLoading]);

    const value = {
        consultant,
        isLoading: authLoading || isLoading,
        error,
        isMasterAdmin: consultant?.is_admin || false
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
