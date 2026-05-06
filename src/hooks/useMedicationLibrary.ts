import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Medication } from '@/types/consultation';

export function useMedicationLibrary() {
  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('saved_medications')
      .select('*')
      .order('composition');

    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        ...item,
        composition: item.composition || '',
        dose: item.dose || '',
        frequency: item.frequency || '',
        duration: item.duration || '',
        instructions: item.instructions || '',
        notes: item.notes || '',
        freqMorning: item.freq_morning ?? false,
        freqNoon: item.freq_noon ?? false,
        freqNight: item.freq_night ?? false
      }));
      setSavedMedications(mappedData as Medication[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  return {
    savedMedications,
    isLoading,
    refreshLibrary: fetchLibrary
  };
}
