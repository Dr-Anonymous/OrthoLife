import { useCallback, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable';
import { Medication } from '@/types/consultation';

interface UseMedicationManagerOptions {
  medications: Medication[];
  onMedicationsChange: (meds: Medication[]) => void;
  isReadOnly?: boolean;
  affordabilityPreference?: string;
  currentLocation?: string;
}

export function useMedicationManager({
  medications,
  onMedicationsChange,
  isReadOnly = false,
  affordabilityPreference = 'none',
  currentLocation = ''
}: UseMedicationManagerOptions) {
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addMedication = useCallback(() => {
    if (isReadOnly) return;
    const newMed: Medication = {
      id: crypto.randomUUID(),
      composition: '', 
      dose: '', 
      frequency: '', 
      duration: '', 
      instructions: '', 
      notes: '',
      freqMorning: false, 
      freqNoon: false, 
      freqNight: false
    };
    onMedicationsChange([...medications, newMed]);
  }, [isReadOnly, medications, onMedicationsChange]);

  const removeMedication = useCallback((index: number) => {
    if (isReadOnly) return;
    onMedicationsChange(medications.filter((_, i) => i !== index));
  }, [isReadOnly, medications, onMedicationsChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = medications.findIndex((m) => m.id === active.id);
      const newIndex = medications.findIndex((m) => m.id === over?.id);
      onMedicationsChange(arrayMove(medications, oldIndex, newIndex));
    }
  }, [isReadOnly, medications, onMedicationsChange]);

  const handleMedicationSuggestionClick = useCallback((med: Medication, currentLanguage: string) => {
    if (isReadOnly) return;
    const isTelugu = currentLanguage === 'te';

    let finalBrandName: string | undefined = med.brandName;

    if (affordabilityPreference !== 'none') {
      let validBrands = med.brand_metadata?.filter(b => !b.locations || b.locations.length === 0 || b.locations.includes(currentLocation)) || [];
      if (validBrands.length === 0 && med.brand_metadata) {
        validBrands = [...med.brand_metadata];
      }

      if (validBrands.length > 0) {
        if (affordabilityPreference === 'cheap') {
          validBrands.sort((a, b) => ((a.cost || 0) / (a.packSize || 1)) - ((b.cost || 0) / (b.packSize || 1)));
        } else if (affordabilityPreference === 'costly') {
          validBrands.sort((a, b) => ((b.cost || 0) / (b.packSize || 1)) - ((a.cost || 0) / (a.packSize || 1)));
        }
        finalBrandName = validBrands[0].name;
      }
    }

    const newMed: Medication = {
      id: crypto.randomUUID(),
      composition: med.composition || (med as any).name || '',
      savedMedicationId: med.id,
      brandName: finalBrandName,
      brand_metadata: med.brand_metadata,
      dose: med.dose || '',
      freqMorning: med.freqMorning || false,
      freqNoon: med.freqNoon || false,
      freqNight: med.freqNight || false,
      frequency: (isTelugu && med.frequency_te) ? med.frequency_te : (med.frequency || ''),
      duration: (isTelugu && med.duration_te) ? med.duration_te : (med.duration || ''),
      instructions: (isTelugu && med.instructions_te) ? med.instructions_te : (med.instructions || ''),
      notes: (isTelugu && med.notes_te) ? med.notes_te : (med.notes || ''),
      frequency_te: isTelugu ? (med.frequency || '') : (med.frequency_te || ''),
      duration_te: isTelugu ? (med.duration || '') : (med.duration_te || ''),
      instructions_te: isTelugu ? (med.instructions || '') : (med.instructions_te || ''),
      notes_te: isTelugu ? (med.notes || '') : (med.notes_te || '')
    };

    const emptyRowIndex = medications.findIndex(m => !m.composition);
    
    if (emptyRowIndex !== -1) {
      const newMeds = [...medications];
      newMeds[emptyRowIndex] = { ...newMed, id: medications[emptyRowIndex].id }; // Preserve existing ID for DND
      onMedicationsChange(newMeds);
    } else {
      onMedicationsChange([...medications, newMed]);
    }
  }, [isReadOnly, medications, onMedicationsChange, affordabilityPreference, currentLocation]);

  const updateMedication = useCallback((index: number, updates: Partial<Medication>) => {
    if (isReadOnly) return;
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], ...updates };
    onMedicationsChange(newMeds);
  }, [isReadOnly, medications, onMedicationsChange]);

  return {
    addMedication,
    removeMedication,
    handleDragEnd,
    handleMedicationSuggestionClick,
    updateMedication,
    sensors
  };
}
