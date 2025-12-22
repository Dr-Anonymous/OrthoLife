import React from 'react';
import { DndContext, closestCenter, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Stethoscope, Plus } from 'lucide-react';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { SortableMedicationItem } from '@/components/consultation/SortableMedicationItem';
import { Medication } from '@/types/consultation';

interface MedicationManagerProps {
    medications: Medication[];
    sensors: any; // Using any for dnd-kit sensors mainly due to complex types
    handleDragEnd: (event: DragEndEvent) => void;
    handleMedChange: (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => void;
    removeMedication: (index: number) => void;
    savedMedications: Medication[];
    setExtraData: React.Dispatch<React.SetStateAction<any>>;
    medicationNameInputRef: React.RefObject<HTMLInputElement | null>;
    fetchSavedMedications: () => void;
    i18n: any;
    medFrequencyRefs: React.MutableRefObject<{ [key: string]: HTMLTextAreaElement | null }>;
    medDurationRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medInstructionsRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medNotesRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    addMedication: () => void;
    suggestedMedications: Medication[];
    handleMedicationSuggestionClick: (med: Medication) => void;

    // Referred To Section (Keep passing props for now if colocated, or can separate)
    // Actually the plan said "MedicationManager" extracts the medication list.
    // Referred To is separate in UI but adjacent.
    // I will extraction ONLY medications here as per name.
}

/**
 * MedicationManager Component
 * 
 * Manages the list of prescribed medications.
 * Features:
 * - Drag and Drop reordering using `@dnd-kit`.
 * - Detailed medication entry (Name, Dose, Frequency, Duration, Instructions).
 * - Suggestion buttons for quick addition.
 * - Integration with `SortableMedicationItem` for individual row logic.
 */
export const MedicationManager: React.FC<MedicationManagerProps> = ({
    medications,
    sensors,
    handleDragEnd,
    handleMedChange,
    removeMedication,
    savedMedications,
    setExtraData,
    medicationNameInputRef,
    fetchSavedMedications,
    i18n,
    medFrequencyRefs,
    medDurationRefs,
    medInstructionsRefs,
    medNotesRefs,
    addMedication,
    suggestedMedications,
    handleMedicationSuggestionClick
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {suggestedMedications.map((med) => (
                            <Button key={med.id} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleMedicationSuggestionClick(med)}>
                                {med.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4 pl-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={medications.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        {medications.map((med, index) => (
                            <SortableMedicationItem
                                key={med.id}
                                med={med}
                                index={index}
                                handleMedChange={handleMedChange}
                                removeMedication={removeMedication}
                                savedMedications={savedMedications}
                                setExtraData={setExtraData}
                                medicationNameInputRef={index === medications.length - 1 ? medicationNameInputRef : null}
                                fetchSavedMedications={fetchSavedMedications}
                                i18n={i18n}
                                medFrequencyRefs={medFrequencyRefs}
                                medDurationRefs={medDurationRefs}
                                medInstructionsRefs={medInstructionsRefs}
                                medNotesRefs={medNotesRefs}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
            <div className="flex justify-end items-center gap-2">
                <Button type="button" onClick={addMedication} variant="outline" size="icon" className="rounded-full">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add Medication</span>
                </Button>
            </div>
        </div>
    );
};
