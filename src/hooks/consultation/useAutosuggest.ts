import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Medication } from '@/components/consultation/MedicationItem';

export const useAutosuggest = (
    debouncedComplaints: string,
    debouncedDiagnosis: string,
    extraData: any,
    suggestedMedications: Medication[],
    suggestedAdvice: string[],
    suggestedInvestigations: string[],
    suggestedFollowup: string[],
    dispatch: React.Dispatch<any>
) => {
    const { i18n } = useTranslation();

    useEffect(() => {
        const fetchSuggestions = async (text: string) => {
            if (text.trim() === '') return;

            try {
                const { data, error } = await supabase.functions.invoke('get-autofill-medications', {
                    body: { text, language: i18n.language },
                });

                if (error) throw error;
                if (!data) return;

                const { medications, advice, investigations, followup } = data;

                if (medications && medications.length > 0) {
                    const newMedications = medications.map((med: any) => ({
                        ...med,
                        id: crypto.randomUUID(),
                        freqMorning: med.freq_morning,
                        freqNoon: med.freq_noon,
                        freqNight: med.freq_night,
                    }));

                    const existingMedNames = new Set(extraData.medications.map((m: Medication) => m.name));
                    const uniqueNewMeds = newMedications.filter((m: Medication) => !existingMedNames.has(m.name));

                    const suggestedMedNames = new Set(suggestedMedications.map((m: Medication) => m.name));
                    const finalNewMeds = uniqueNewMeds.filter((m: Medication) => !suggestedMedNames.has(m.name));
                    dispatch({ type: 'SET_SUGGESTED_MEDICATIONS', payload: [...suggestedMedications, ...finalNewMeds] });
                }

                if (advice) {
                    const adviceItems = advice.split('\n').filter((item: string) => item.trim() !== '');
                    const uniqueAdviceItems = adviceItems.filter((item: string) => !extraData.advice.includes(item));
                    const newItems = uniqueAdviceItems.filter((item: string) => !suggestedAdvice.includes(item));
                    dispatch({ type: 'SET_SUGGESTED_ADVICE', payload: [...suggestedAdvice, ...newItems] });
                }

                if (investigations) {
                    const investigationItems = investigations.split('\n').filter((item: string) => item.trim() !== '');
                    const uniqueInvestigationItems = investigationItems.filter((item: string) => !extraData.investigations.includes(item));
                    const newItems = uniqueInvestigationItems.filter((item: string) => !suggestedInvestigations.includes(item));
                    dispatch({ type: 'SET_SUGGESTED_INVESTIGATIONS', payload: [...suggestedInvestigations, ...newItems] });
                }

                if (followup) {
                    const followupItems = followup.split('\n').filter((item: string) => item.trim() !== '');
                    const uniqueFollowupItems = followupItems.filter((item: string) => !extraData.followup.includes(item));
                    const newItems = uniqueFollowupItems.filter((item: string) => !suggestedFollowup.includes(item));
                    dispatch({ type: 'SET_SUGGESTED_FOLLOWUP', payload: [...suggestedFollowup, ...newItems] });
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        };

        dispatch({ type: 'SET_SUGGESTED_MEDICATIONS', payload: [] });
        dispatch({ type: 'SET_SUGGESTED_ADVICE', payload: [] });
        dispatch({ type: 'SET_SUGGESTED_INVESTIGATIONS', payload: [] });
        dispatch({ type: 'SET_SUGGESTED_FOLLOWUP', payload: [] });

        fetchSuggestions(debouncedComplaints);
        fetchSuggestions(debouncedDiagnosis);
    }, [debouncedComplaints, debouncedDiagnosis, i18n.language]);
};
