import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Stethoscope, Plus } from 'lucide-react';
import { SortableMedicationItem } from '@/components/consultation/SortableMedicationItem';
import { Medication } from '@/types/consultation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface MedicationManagerProps {
    medications: Medication[];
    initialMedications?: Medication[];
    sensors: any; // Using any for dnd-kit sensors mainly due to complex types
    handleDragEnd: (event: DragEndEvent) => void;
    handleMedChange: (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => void;
    removeMedication: (index: number) => void;
    savedMedications: Medication[];
    setExtraData: React.Dispatch<React.SetStateAction<any>>;
    medicationNameInputRef: React.RefObject<HTMLInputElement | null>;
    fetchSavedMedications: () => void;
    language: string;
    medFrequencyRefs: React.MutableRefObject<{ [key: string]: HTMLTextAreaElement | null }>;
    medDurationRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medInstructionsRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medNotesRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    addMedication: () => void;
    suggestedMedications: Medication[];
    handleMedicationSuggestionClick: (med: Medication) => void;
    currentLocation?: string;
    affordabilityPreference?: string;
    onAffordabilityChange?: (val: string) => void;
    medicationSuggestionMode?: 'composition' | 'brand';
    consultationId?: string;
    isMasterAdmin?: boolean;

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
    language,
    medFrequencyRefs,
    medDurationRefs,
    medInstructionsRefs,
    medNotesRefs,
    addMedication,
    suggestedMedications,
    handleMedicationSuggestionClick,
    initialMedications,
    currentLocation,
    affordabilityPreference = 'none',
    onAffordabilityChange,
    medicationSuggestionMode = 'composition',
    consultationId,
    isMasterAdmin = false
}) => {
    // Track previous length to detect additions
    const prevMedicationsLength = React.useRef(medications.length);
    const shouldFocusNewMedication = React.useRef(false);

    const medicationsRef = React.useRef(medications);
    React.useEffect(() => {
        medicationsRef.current = medications;
    }, [medications]);

    const handleManualAdd = () => {
        const currentMeds = medicationsRef.current;
        const lastMed = currentMeds[currentMeds.length - 1];
        const isLastEmpty = lastMed &&
            !(lastMed.composition || '').trim() &&
            !(lastMed.dose || '').trim() &&
            !(lastMed.frequency || '').trim() &&
            !(lastMed.duration || '').trim() &&
            !(lastMed.instructions || '').trim() &&
            !(lastMed.notes || '').trim() &&
            !lastMed.freqMorning &&
            !lastMed.freqNoon &&
            !lastMed.freqNight;

        if (isLastEmpty) {
            shouldFocusNewMedication.current = true;
            setTimeout(() => {
                if (medicationNameInputRef.current) {
                    medicationNameInputRef.current.focus();
                }
            }, 10);
            return;
        }

        shouldFocusNewMedication.current = true;
        addMedication();
    };

    const handleSuggestionAdd = (med: Medication) => {
        shouldFocusNewMedication.current = false;
        handleMedicationSuggestionClick(med);
    };

    React.useEffect(() => {
        if (medications.length > prevMedicationsLength.current && shouldFocusNewMedication.current) {
            // New medication added manually, focus the last one
            // We need a slight timeout to allow the DOM to update and the ref to be attached
            setTimeout(() => {
                if (medicationNameInputRef.current) {
                    medicationNameInputRef.current.focus();
                }
            }, 0);

            // Reset flag immediately after triggering focus
            shouldFocusNewMedication.current = false;
        }

        prevMedicationsLength.current = medications.length;
    }, [medications.length, medicationNameInputRef]);

    // Keyboard shortcut for adding medication
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                handleManualAdd();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [addMedication, handleManualAdd]);



    // Autoswap Engine (Automatic Trigger)
    // Only trigger when preferences CHANGE, not on initial consultation load
    const lastConsultationId = React.useRef<string | undefined>(consultationId);
    const lastLocation = React.useRef<string | undefined>(currentLocation);
    const lastPreference = React.useRef<string | undefined>(affordabilityPreference);

    React.useEffect(() => {
        // If the consultation changed, update refs and skip autoswap
        if (consultationId !== lastConsultationId.current) {
            lastConsultationId.current = consultationId;
            lastLocation.current = currentLocation;
            lastPreference.current = affordabilityPreference;
            return;
        }

        // Only trigger if location or preference actually changed from what was loaded/set
        if (currentLocation !== lastLocation.current || affordabilityPreference !== lastPreference.current) {
            if (currentLocation || affordabilityPreference !== 'none') {
                handleAutoswap(true); // true means silent if already optimal
            }
            lastLocation.current = currentLocation;
            lastPreference.current = affordabilityPreference;
        }
    }, [currentLocation, affordabilityPreference, savedMedications, consultationId]);

    const handleAutoswap = (silentIfOptimal = false) => {
        if (!currentLocation && affordabilityPreference === 'none') {
            if (!silentIfOptimal) {
                toast({ title: "No Optimization Criteria", description: "Set a location or cost preference first." });
            }
            return;
        }
        if (!savedMedications || savedMedications.length === 0) return;

        let updated = false;
        let swapCount = 0;
        const newMeds = medicationsRef.current.map(med => {
            if (!med.savedMedicationId) return med;
            const savedItem = savedMedications.find(s => s.id === med.savedMedicationId);
            if (!savedItem || !savedItem.brand_metadata || savedItem.brand_metadata.length === 0) return med;

            // Filter by location
            let validBrands = savedItem.brand_metadata.filter(b => !b.locations || b.locations.length === 0 || b.locations.includes(currentLocation || ''));
            // If no location matches, fallback to all (or maybe skip if explicit location required? for now fallback)
            if (validBrands.length === 0) validBrands = [...savedItem.brand_metadata];

            // Sort by cost per unit
            if (affordabilityPreference === 'cheap') {
                validBrands.sort((a, b) => ((a.cost || 0) / (a.packSize || 1)) - ((b.cost || 0) / (b.packSize || 1)));
            } else if (affordabilityPreference === 'costly') {
                validBrands.sort((a, b) => ((b.cost || 0) / (b.packSize || 1)) - ((a.cost || 0) / (a.packSize || 1)));
            }

            const bestBrand = validBrands[0];
            // If the best brand is different from the currently selected brand
            if (bestBrand && bestBrand.name !== med.brandName) {
                updated = true;
                swapCount++;
                return {
                    ...med,
                    brandName: bestBrand.name
                };
            }
            return med;
        });

        if (updated) {
            setExtraData((prev: any) => ({ ...prev, medications: newMeds }));
            toast({
                title: "Medications Optimized",
                description: `Swapped ${swapCount} medication(s) based on your preferences.`,
            });
        } else if (!silentIfOptimal) {
            toast({
                title: "Already Optimal",
                description: "Prescriptions already match your criteria.",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                    </div>
                    {onAffordabilityChange && (
                        <div className="flex items-center gap-2 ml-4">
                            <Select value={affordabilityPreference} onValueChange={onAffordabilityChange}>
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue placeholder="Cost pref." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Standard</SelectItem>
                                    <SelectItem value="cheap">Economy</SelectItem>
                                    <SelectItem value="costly">Premium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 ml-4">
                        {suggestedMedications.map((med) => {
                            const displayName = medicationSuggestionMode === 'brand' && med.brandName ? med.brandName : med.composition;
                            return (
                                <Button key={med.id} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleSuggestionAdd(med)}>
                                    {displayName}
                                </Button>
                            );
                        })}
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
                                language={language}
                                medFrequencyRefs={medFrequencyRefs}
                                medDurationRefs={medDurationRefs}
                                medInstructionsRefs={medInstructionsRefs}
                                medNotesRefs={medNotesRefs}
                                initialMedications={initialMedications}
                                handleManualAdd={handleManualAdd}
                                currentLocation={currentLocation}
                                affordabilityPreference={affordabilityPreference}
                                medicationSuggestionMode={medicationSuggestionMode}
                                isMasterAdmin={isMasterAdmin}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
            <div className="flex justify-end items-center gap-2">
                <Button type="button" onClick={handleManualAdd} variant="outline" size="icon" className="rounded-full">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add Medication</span>
                </Button>
            </div>
        </div>
    );
};
