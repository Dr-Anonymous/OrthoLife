import { useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Medication } from '@/types/consultation';

interface UseMedicationManagerOptions {
  medications: Medication[];
  onMedicationsChange: (meds: Medication[] | ((prev: Medication[]) => Medication[])) => void;
  isReadOnly?: boolean;
}

export function useMedicationManager({ 
  medications, 
  onMedicationsChange, 
  isReadOnly 
}: UseMedicationManagerOptions) {

  const addMedication = useCallback(() => {
    if (isReadOnly) return;
    const newMed: Medication = {
      id: crypto.randomUUID(),
      composition: '',
      brandName: '',
      dose: '',
      freqMorning: false,
      freqNoon: false,
      freqNight: false,
      frequency: '',
      duration: '',
      instructions: '',
      notes: ''
    };
    onMedicationsChange(prev => [...prev, newMed]);
  }, [onMedicationsChange, isReadOnly]);

  const removeMedication = useCallback((index: number) => {
    if (isReadOnly) return;
    onMedicationsChange(prev => prev.filter((_, i) => i !== index));
  }, [onMedicationsChange, isReadOnly]);

  const handleMedChange = useCallback((index: number, field: keyof Medication, value: any) => {
    if (isReadOnly) return;
    onMedicationsChange(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      
      updated[index] = { ...updated[index], [field]: value };
      
      // If composition is manually changed, clear brand metadata
      if (field === 'composition' && !value.includes('//')) {
        updated[index].brandName = '';
        updated[index].savedMedicationId = '';
      }
      
      return updated;
    });
  }, [onMedicationsChange, isReadOnly]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onMedicationsChange(prev => {
        const oldIndex = prev.findIndex(m => m.id === active.id);
        const newIndex = prev.findIndex(m => m.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, [onMedicationsChange, isReadOnly]);

  const handleMedicationSuggestionClick = useCallback((med: Medication, language: string = 'en') => {
    if (isReadOnly) return;
    onMedicationsChange(prev => {
      const isTelugu = language === 'te';
      const emptyIndex = prev.findIndex(m => !m.composition && !m.dose && !m.frequency && !m.duration);
      
      const newMed: Medication = {
        ...med,
        id: crypto.randomUUID(),
        composition: med.composition || (med as any).name || '',
        frequency: (isTelugu && med.frequency_te) ? med.frequency_te : (med.frequency || ''),
        duration: (isTelugu && med.duration_te) ? med.duration_te : (med.duration || ''),
        instructions: (isTelugu && med.instructions_te) ? med.instructions_te : (med.instructions || ''),
        notes: (isTelugu && med.notes_te) ? med.notes_te : (med.notes || ''),
        // Preserve both versions for potential future language swaps
        frequency_te: isTelugu ? (med.frequency || '') : (med.frequency_te || ''),
        duration_te: isTelugu ? (med.duration || '') : (med.duration_te || ''),
        instructions_te: isTelugu ? (med.instructions || '') : (med.instructions_te || ''),
        notes_te: isTelugu ? (med.notes || '') : (med.notes_te || '')
      };
      
      if (emptyIndex !== -1) {
        const updated = [...prev];
        updated[emptyIndex] = newMed;
        return updated;
      }
      return [...prev, newMed];
    });
  }, [onMedicationsChange, isReadOnly]);

  return {
    addMedication,
    removeMedication,
    handleMedChange,
    handleDragEnd,
    handleMedicationSuggestionClick
  };
}
