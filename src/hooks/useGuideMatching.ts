import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Guide, MatchedGuide } from '@/types/consultation';
import { getMatchingGuides } from '@/lib/guideMatching';

export const useGuideMatching = (debouncedAdvice: string, language: string) => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [matchedGuides, setMatchedGuides] = useState<MatchedGuide[]>([]);

    useEffect(() => {
        const fetchGuides = async () => {
            const { data, error } = await supabase
                .from('guides')
                .select('id, title, description, categories(name), guide_translations(language, title, description)');

            if (!error && data) {
                setGuides(data as unknown as Guide[]);
            }
        };
        fetchGuides();
    }, []);

    useEffect(() => {
        setMatchedGuides(getMatchingGuides(debouncedAdvice, guides, language));
    }, [debouncedAdvice, guides, language]);

    return { matchedGuides, guides };
};
