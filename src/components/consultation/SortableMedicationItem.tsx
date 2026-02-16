import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { GripVertical, Loader2, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Medication } from '@/types/consultation';

interface SortableMedicationItemProps {
    med: Medication;
    index: number;
    handleMedChange: (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => void;
    removeMedication: (index: number) => void;
    savedMedications: Medication[];
    setExtraData: React.Dispatch<React.SetStateAction<any>>;
    medicationNameInputRef: React.RefObject<HTMLInputElement | null>;
    fetchSavedMedications: () => void;
    medFrequencyRefs: React.MutableRefObject<{ [key: string]: HTMLTextAreaElement | null }>;
    medDurationRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medInstructionsRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    medNotesRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
    language: string;
    initialMedications?: Medication[];
    handleManualAdd?: () => void;
}

export const SortableMedicationItem: React.FC<SortableMedicationItemProps> = ({
    med,
    index,
    handleMedChange,
    removeMedication,
    savedMedications,
    setExtraData,
    medicationNameInputRef,
    fetchSavedMedications,
    medFrequencyRefs,
    medDurationRefs,
    medInstructionsRefs,
    medNotesRefs,
    language,
    initialMedications,
    handleManualAdd
}) => {
    // Helper to determine if a field is autofilled (unchanged from initial) and highlighted
    const getStyle = (field: keyof Medication, value: any) => {
        if (!initialMedications) return ""; // Default style

        // Find corresponding initial medication by ID
        const initialMed = initialMedications.find(m => m.id === med.id);
        if (!initialMed) return ""; // New medication (or id mismatch), no highlight

        const initialValue = initialMed[field];
        // Check if value equals initial value AND value is not empty/falsy
        // We trim strings to be safe
        const isUnchanged = String(value).trim() === String(initialValue || '').trim();
        const hasContent = value && String(value).trim().length > 0;

        if (isUnchanged && hasContent) {
            return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
        }
        return ""; // Default style
    };
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: med.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isCustom, setIsCustom] = useState(!!med.frequency);
    const [isSavingFavorite, setIsSavingFavorite] = useState(false);

    useEffect(() => {
        setIsCustom(!!med.frequency);
    }, [med.frequency]);

    const isFavorite = savedMedications.some(savedMed => (savedMed.name || '').toLowerCase() === (med.name || '').toLowerCase());

    const handleFavoriteClick = async () => {
        if (!med.name) {
            toast({
                variant: 'destructive',
                title: 'Cannot save favorite',
                description: 'Please enter a name for the medication.',
            });
            return;
        }
        setIsSavingFavorite(true);
        try {
            const isTelugu = language === 'te';
            const payload: any = {
                name: med.name,
                dose: med.dose,
                freq_morning: med.freqMorning,
                freq_noon: med.freqNoon,
                freq_night: med.freqNight,
            };

            if (isTelugu) {
                payload.frequency_te = med.frequency;
                payload.duration_te = med.duration;
                payload.instructions_te = med.instructions;
                payload.notes_te = med.notes;
            } else {
                payload.frequency = med.frequency;
                payload.duration = med.duration;
                payload.instructions = med.instructions;
                payload.notes = med.notes;
                // Maintain the possibly existing te values if they exist in the object and we are in EN
                if (med.duration_te) payload.duration_te = med.duration_te;
                if (med.frequency_te) payload.frequency_te = med.frequency_te;
                if (med.instructions_te) payload.instructions_te = med.instructions_te;
                if (med.notes_te) payload.notes_te = med.notes_te;
            }

            const { data, error } = await supabase
                .from('saved_medications')
                .insert([payload]);

            if (error) throw error;
            toast({
                title: 'Favorite saved',
                description: `${med.name} has been added to your saved medications.`,
            });
            fetchSavedMedications();
        } catch (error) {
            console.error('Error saving favorite medication:', error);
            toast({
                variant: 'destructive',
                title: 'Error saving favorite',
                description: (error as Error).message,
            });
        } finally {
            setIsSavingFavorite(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="p-4 border border-border relative">
                <div {...listeners} className="absolute top-1/2 -left-6 -translate-y-1/2 p-2 cursor-grab text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Medicine Name</Label>
                                <div className="flex items-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-yellow-500"
                                        onClick={handleFavoriteClick}
                                        disabled={isSavingFavorite || isFavorite}
                                    >
                                        {isSavingFavorite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-500")} />}
                                        <span className="sr-only">Save as favorite</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeMedication(index)}
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Remove medication</span>
                                    </Button>
                                </div>
                            </div>
                            <AutosuggestInput
                                inputProps={{
                                    className: getStyle('name', med.name)
                                }}
                                ref={medicationNameInputRef}
                                value={med.name || ''}
                                onChange={value => handleMedChange(index, 'name', value)}
                                suggestions={savedMedications.map(m => ({ id: m.id, name: m.name }))}
                                onSuggestionSelected={suggestion => {
                                    const savedMed = savedMedications.find(m => m.id === suggestion.id);
                                    if (savedMed) {
                                        const medToAdd = language === 'te' ? {
                                            ...savedMed,
                                            id: crypto.randomUUID(),
                                            name: savedMed.name,
                                            instructions: savedMed.instructions_te || savedMed.instructions,
                                            frequency: savedMed.frequency_te || savedMed.frequency,
                                            duration: savedMed.duration_te || savedMed.duration,
                                            notes: savedMed.notes_te || savedMed.notes,
                                        } : { ...savedMed, id: crypto.randomUUID(), name: savedMed.name };

                                        setExtraData(prev => {
                                            const newMeds = [...prev.medications];
                                            newMeds[index] = medToAdd;
                                            return { ...prev, medications: newMeds };
                                        });
                                    }
                                    if (handleManualAdd) handleManualAdd();
                                }}
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Dosage</Label>
                            <Input
                                value={med.dose || ''}
                                onChange={e => handleMedChange(index, 'dose', e.target.value, e.target.selectionStart)}
                                placeholder="e.g., 500mg"
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                className={getStyle('dose', med.dose)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Frequency</Label>
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            {!isCustom &&
                                <>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={med.freqMorning || false}
                                            onChange={e => handleMedChange(index, 'freqMorning', e.target.checked)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqMorning', !med.freqMorning))}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm">Morning</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={med.freqNoon || false}
                                            onChange={e => handleMedChange(index, 'freqNoon', e.target.checked)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqNoon', !med.freqNoon))}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm">Noon</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={med.freqNight || false}
                                            onChange={e => handleMedChange(index, 'freqNight', e.target.checked)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqNight', !med.freqNight))}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm">Night</span>
                                    </label>
                                </>
                            }
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isCustom}
                                    onChange={() => {
                                        const newIsCustom = !isCustom;
                                        setIsCustom(newIsCustom);
                                        if (newIsCustom) {
                                            handleMedChange(index, 'freqMorning', false);
                                            handleMedChange(index, 'freqNoon', false);
                                            handleMedChange(index, 'freqNight', false);
                                        } else {
                                            handleMedChange(index, 'frequency', '');
                                        }
                                    }}
                                    className="rounded border-border"
                                />
                                <span className="text-sm">Custom</span>
                            </label>
                        </div>
                        {isCustom && (
                            <>
                                <Textarea
                                    ref={el => medFrequencyRefs.current[`${index}.frequency`] = el}
                                    value={med.frequency || ''}
                                    onChange={e => handleMedChange(index, 'frequency', e.target.value, e.target.selectionStart)}
                                    placeholder="e.g., once a week"
                                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                    className={getStyle('frequency', med.frequency)}
                                />
                                {(!med.frequency) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(language === 'te'
                                            ? ["వారానికి ఒకసారి", "అవసరమైతే"]
                                            : ["1/week", "If needed"]
                                        ).map(text => (
                                            <div
                                                key={text}
                                                className="text-[10px] px-1.5 py-0.5 border rounded-full cursor-pointer hover:bg-muted text-muted-foreground bg-background transition-colors"
                                                onClick={() => handleMedChange(index, 'frequency', text)}
                                            >
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Duration</Label>
                            <Input
                                ref={el => medDurationRefs.current[`${index}.duration`] = el}
                                value={med.duration || ''}
                                onChange={e => handleMedChange(index, 'duration', e.target.value, e.target.selectionStart)}
                                placeholder="e.g., 7 days"
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                className={getStyle('duration', med.duration)}
                            />
                            {/* Smart Duration Helpers */}
                            {(() => {
                                const val = (med.duration || '').trim();
                                const match = val.match(/^(\d+)/);
                                const number = match ? parseInt(match[1]) : null;

                                if (number !== null) {
                                    const isPlural = number > 1;
                                    const units = language === 'te'
                                        ? (isPlural ? ["రోజులు", "వారాలు", "నెలలు"] : ["రోజు", "వారం", "నెల"])
                                        : (isPlural ? ["days", "weeks", "months"] : ["day", "week", "month"]);

                                    return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {units.map(unit => (
                                                <div
                                                    key={unit}
                                                    className="text-[10px] px-1.5 py-0.5 border rounded-full cursor-pointer hover:bg-muted text-muted-foreground bg-background transition-colors"
                                                    onClick={() => handleMedChange(index, 'duration', `${number} ${unit}`)}
                                                >
                                                    {unit}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Instructions</Label>
                            <Input
                                ref={el => medInstructionsRefs.current[`${index}.instructions`] = el}
                                value={med.instructions || ''}
                                onChange={e => handleMedChange(index, 'instructions', e.target.value, e.target.selectionStart)}
                                placeholder="Special instructions"
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                className={getStyle('instructions', med.instructions)}
                            />
                            {(!med.instructions) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {(language === 'te' ? ["ఆహరం ముందు", "ఆహరం తర్వాత"] : ["Bef. food", "Aft. food"]).map(text => (
                                        <div
                                            key={text}
                                            className="text-[10px] px-1.5 py-0.5 border rounded-full cursor-pointer hover:bg-muted text-muted-foreground bg-background transition-colors"
                                            onClick={() => handleMedChange(index, 'instructions', text)}
                                        >
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Notes</Label>
                        <Input
                            ref={el => medNotesRefs.current[`${index}.notes`] = el}
                            value={med.notes || ''}
                            onChange={e => handleMedChange(index, 'notes', e.target.value, e.target.selectionStart)}
                            placeholder="e.g., side effects"
                            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            className={getStyle('notes', med.notes)}
                        />
                    </div>
                </div>
            </Card >
        </div >
    );
};
