import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ConsultationContext } from '@/context/ConsultationContext';
import { Medication } from '@/components/consultation/MedicationItem';

export const useTranslationManager = () => {
    const { state, dispatch } = React.useContext(ConsultationContext);
    const { extraData } = state;
    const { i18n } = useTranslation();
    const translationCache = useRef<any>({ en: {}, te: {} });

    const handleLanguageChange = async (lang: string) => {
        const fromLang = lang === 'en' ? 'te' : 'en';

        translationCache.current[fromLang] = {
            advice: extraData.advice,
            followup: extraData.followup,
            medications: extraData.medications.map((m: any) => ({
                id: m.id,
                instructions: m.instructions,
                frequency: m.frequency,
                notes: m.notes,
            })),
        };

        if (translationCache.current[lang].advice !== undefined) {
            dispatch({
                type: 'SET_EXTRA_DATA',
                payload: {
                    ...extraData,
                    advice: translationCache.current[lang].advice,
                    followup: translationCache.current[lang].followup,
                    medications: extraData.medications.map((med: Medication) => {
                        const cachedMed = translationCache.current[lang].medications.find((m: any) => m.id === med.id);
                        return cachedMed ? { ...med, ...cachedMed } : med;
                    }),
                },
            });
            return;
        }

        if (lang === 'te') {
            try {
                const translate = async (text: string) => {
                    if (!text || !text.trim()) return text;
                    const { data, error } = await supabase.functions.invoke('translate-content', {
                        body: { text, targetLanguage: 'te' },
                    });
                    if (error) throw error;
                    return data?.translatedText || text;
                };

                const newAdvice = await translate(extraData.advice);
                const newFollowup = await translate(extraData.followup);
                const newMedications = await Promise.all(
                    extraData.medications.map(async (med: Medication) => ({
                        ...med,
                        instructions: await translate(med.instructions),
                        frequency: await translate(med.frequency),
                        notes: await translate(med.notes),
                    }))
                );

                dispatch({
                    type: 'SET_EXTRA_DATA',
                    payload: {
                        ...extraData,
                        advice: newAdvice,
                        followup: newFollowup,
                        medications: newMedications,
                    },
                });
            } catch (error) {
                console.error('Translation error:', error);
                toast({ variant: 'destructive', title: 'Translation Error', description: (error as Error).message });
            }
        }
    };

    useEffect(() => {
        handleLanguageChange(i18n.language);
    }, [i18n.language]);
};
