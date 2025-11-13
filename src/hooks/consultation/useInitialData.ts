import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ConsultationContext } from '@/context/ConsultationContext';

export const useInitialData = () => {
    const { dispatch } = React.useContext(ConsultationContext);

    const fetchSavedMedications = async () => {
        const { data, error } = await supabase.from('saved_medications').select('*').order('name');
        if (error) {
            console.error('Error fetching saved medications:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching saved medications',
                description: error.message,
            });
        } else {
            dispatch({ type: 'SET_SAVED_MEDICATIONS', payload: data.map((d: any) => ({ ...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night })) });
        }
    };

    const fetchTextShortcuts = async () => {
        const { data, error } = await supabase
            .from('text_shortcuts')
            .select('id, shortcut, expansion');
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Error fetching text shortcuts',
                description: error.message,
            });
        } else {
            dispatch({ type: 'SET_TEXT_SHORTCUTS', payload: data || [] });
        }
    };

    useEffect(() => {
        fetchSavedMedications();
        fetchTextShortcuts();
    }, []);
};
