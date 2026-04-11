import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AutosuggestInput, { Suggestion } from '@/components/ui/AutosuggestInput';
import { Check, GripVertical, Loader2, PlusCircle, X } from 'lucide-react';
import { cn, normalizeMedName } from '@/lib/utils';
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
    currentLocation?: string;
    affordabilityPreference?: string;
    isMasterAdmin?: boolean;
    isReadOnly?: boolean;
    pharmacyMeds?: any[];
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
    handleManualAdd,
    currentLocation,
    affordabilityPreference,
    isMasterAdmin = false,
    isReadOnly = false,
    pharmacyMeds = []
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
        if (!!med.frequency) {
            setIsCustom(true);
        }
    }, [med.frequency]);

    const isSavedInMaster = savedMedications.some(savedMed => {
        const nameMatches = normalizeMedName(savedMed.composition) === normalizeMedName(med.composition);
        const doseMatches = (savedMed.dose || '').toLowerCase().trim() === (med.dose || '').toLowerCase().trim();
        return nameMatches && doseMatches;
    });

    const handleSaveToMaster = async () => {
        if (!med.composition) {
            toast({
                variant: 'destructive',
                title: 'Cannot save',
                description: 'Please enter a name for the medication.',
            });
            return;
        }
        setIsSavingFavorite(true);
        try {
            const isTelugu = language === 'te';
            const payload: any = {
                composition: med.composition,
                brand_metadata: med.brand_metadata || [],
                dose: med.dose,
                freq_morning: med.freqMorning,
                freq_noon: med.freqNoon,
                freq_night: med.freqNight,
                // If language is Telugu, med.frequency contains Telugu and med.frequency_te contains English
                // We must un-swap them for the database payload
                frequency: isTelugu ? med.frequency_te : med.frequency,
                frequency_te: isTelugu ? med.frequency : med.frequency_te,
                duration: isTelugu ? med.duration_te : med.duration,
                duration_te: isTelugu ? med.duration : med.duration_te,
                instructions: isTelugu ? med.instructions_te : med.instructions,
                instructions_te: isTelugu ? med.instructions : med.instructions_te,
                notes: isTelugu ? med.notes_te : med.notes,
                notes_te: isTelugu ? med.notes : med.notes_te,
            };

            // Translation Logic
            const translate = async (text: string, targetLang: string, sourceLang: string = 'en') => {
                if (!text || !text.trim()) return '';
                try {
                    const { data, error } = await supabase.functions.invoke('translate-content', {
                        body: { text, targetLanguage: targetLang, sourceLanguage: sourceLang },
                    });
                    if (error) throw error;
                    return data?.translatedText || '';
                } catch (e) {
                    console.error('Translation error:', e);
                    return '';
                }
            };

            // Bidirectional Translation based on current input
            if (isTelugu) {
                // If Telugu is the active language, translate missing English fields
                if (payload.instructions_te && !payload.instructions) payload.instructions = await translate(payload.instructions_te, 'en', 'te');
                if (payload.duration_te && !payload.duration) payload.duration = await translate(payload.duration_te, 'en', 'te');
                if (payload.frequency_te && !payload.frequency) payload.frequency = await translate(payload.frequency_te, 'en', 'te');
                if (payload.notes_te && !payload.notes) payload.notes = await translate(payload.notes_te, 'en', 'te');
            } else {
                // If English is the active language, translate missing Telugu fields
                if (payload.instructions && !payload.instructions_te) payload.instructions_te = await translate(payload.instructions, 'te', 'en');
                if (payload.duration && !payload.duration_te) payload.duration_te = await translate(payload.duration, 'te', 'en');
                if (payload.frequency && !payload.frequency_te) payload.frequency_te = await translate(payload.frequency, 'te', 'en');
                if (payload.notes && !payload.notes_te) payload.notes_te = await translate(payload.notes, 'te', 'en');
            }

            // If we have a brandName that isn't already the composition name
            // and it's not in brand_metadata, record it
            if (med.brandName && normalizeMedName(med.brandName) !== normalizeMedName(med.composition)) {
                const brandExists = (payload.brand_metadata as any[]).some(b => normalizeMedName(b.name) === normalizeMedName(med.brandName!));
                if (!brandExists) {
                    payload.brand_metadata = [{ name: med.brandName }, ...(payload.brand_metadata as any[])];
                }
            }

            const { error } = await supabase
                .from('saved_medications')
                .insert([payload]);

            if (error) throw error;
            toast({
                title: 'Medication Saved',
                description: `${med.composition} has been added to your master list.`,
            });
            fetchSavedMedications();
        } catch (error) {
            console.error('Error saving medication:', error);
            toast({
                variant: 'destructive',
                title: 'Error saving',
                description: (error as Error).message,
            });
        } finally {
            setIsSavingFavorite(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="p-4 border border-border relative">
                <div {...(isReadOnly ? {} : listeners)} className={cn("absolute top-1/2 -left-6 -translate-y-1/2 p-2 text-muted-foreground", !isReadOnly && "cursor-grab")}>
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
                                        className={cn(
                                            "h-6 w-6 transition-all duration-300",
                                            isSavedInMaster ? "text-green-500 bg-green-50 hover:bg-green-100" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        )}
                                        onClick={handleSaveToMaster}
                                        disabled={isSavingFavorite || isSavedInMaster || isReadOnly}
                                        title={isSavedInMaster ? "Already in saved medications" : "Add to saved medications"}
                                    >
                                        {isSavingFavorite ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : isSavedInMaster ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <PlusCircle className="h-3.5 w-3.5" />
                                        )}
                                        <span className="sr-only">Add to saved medications</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeMedication(index)}
                                        disabled={isReadOnly}
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Remove medication</span>
                                    </Button>
                                </div>
                            </div>
                            <AutosuggestInput
                                inputProps={{
                                    className: getStyle('composition', med.composition)
                                }}
                                ref={medicationNameInputRef}
                                value={med.brandName || med.composition || ''}
                                onChange={(value, cursor) => {
                                    handleMedChange(index, 'composition', value, cursor);
                                    if (med.brandName || med.savedMedicationId) {
                                        handleMedChange(index, 'brandName', undefined);
                                        handleMedChange(index, 'savedMedicationId', undefined);
                                    }
                                }}
                                disabled={isReadOnly}
                                suggestions={(() => {
                                    const items: Suggestion[] = [];

                                    // 1. Add Saved Medications (Favorites) first
                                    savedMedications.forEach(m => {
                                        const brands = m.brand_metadata || [];
                                        const allBrandNames = brands.map(b => b.name).join(' ');

                                        // Always add composition first
                                        items.push({
                                            id: m.id!,
                                            name: m.composition,
                                            label: m.composition,
                                            dose: m.dose,
                                            searchTerms: `${m.composition} ${allBrandNames}`
                                        });

                                        // Add brands as sub-items
                                        brands.forEach(brand => {
                                            const unitPrice = brand.cost && brand.packSize ? (brand.cost / brand.packSize).toFixed(2) : null;
                                            const costLabel = unitPrice ? `₹${unitPrice}/u` : brand.cost ? `₹${brand.cost}` : '';
                                            items.push({
                                                id: m.id!,
                                                name: brand.name,
                                                label: costLabel ? `${brand.name} (${costLabel})` : brand.name,
                                                isBrand: true,
                                                searchTerms: `${m.composition} ${brand.name}`
                                            });
                                        });
                                    });

                                    // 2. Add Pharmacy Medications as fallback
                                    const normalizedSavedNames = new Set<string>();
                                    savedMedications.forEach(s => {
                                        normalizedSavedNames.add(normalizeMedName(s.composition));
                                        s.brand_metadata?.forEach(b => normalizedSavedNames.add(normalizeMedName(b.name)));
                                    });

                                    if (pharmacyMeds) {
                                        pharmacyMeds.forEach(pm => {
                                            const normPmName = normalizeMedName(pm.name);
                                            const isAlreadySaved = Array.from(normalizedSavedNames).some(savedName => 
                                                savedName && (normPmName.includes(savedName) || savedName.includes(normPmName))
                                            );

                                            if (!isAlreadySaved) {
                                                const categoryPrefix = pm.category ? `${pm.category.substring(0, 3)}. ` : '';
                                                const fullName = categoryPrefix + pm.name;
                                                items.push({
                                                    id: `pharmacy-${pm.id}`,
                                                    name: fullName,
                                                    label: `${fullName} (Pharmacy)`,
                                                    searchTerms: fullName
                                                });
                                            }
                                        });
                                    }

                                    return items;
                                })()}
                                onSuggestionSelected={suggestion => {
                                    const isPharmacy = String(suggestion.id).startsWith('pharmacy-');
                                    const realId = isPharmacy ? String(suggestion.id).replace('pharmacy-', '') : suggestion.id;
                                    
                                    if (!isPharmacy) {
                                        const savedMed = savedMedications.find(m => m.id === realId);
                                        if (savedMed) {
                                            const isBrand = suggestion.name !== savedMed.composition;
                                            const finalBrandName = isBrand ? suggestion.name : undefined;

                                            const medToAdd = language === 'te' ? {
                                                ...savedMed,
                                                id: crypto.randomUUID(),
                                                composition: savedMed.composition,
                                                savedMedicationId: savedMed.id,
                                                brandName: finalBrandName,
                                                frequency_te: savedMed.frequency || '',
                                                duration_te: savedMed.duration || '',
                                                instructions_te: savedMed.instructions || '',
                                                notes_te: savedMed.notes || '',
                                                frequency: savedMed.frequency_te || savedMed.frequency,
                                                duration: savedMed.duration_te || savedMed.duration,
                                                instructions: savedMed.instructions_te || savedMed.instructions,
                                                notes: savedMed.notes_te || savedMed.notes,
                                            } : {
                                                ...savedMed,
                                                id: crypto.randomUUID(),
                                                composition: savedMed.composition,
                                                savedMedicationId: savedMed.id,
                                                brandName: finalBrandName,
                                            };

                                            setExtraData(prev => ({
                                                ...prev,
                                                medications: prev.medications.map((m, i) => i === index ? medToAdd : m)
                                            }));
                                        }
                                    } else {
                                        // Selected from Pharmacy (Not in favorites)
                                        // Use suggestion.name instead of pm.name because it has the category prefix (Tab., Cap., etc.)
                                        handleMedChange(index, 'composition', suggestion.name);
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
                                disabled={isReadOnly}
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
                                            disabled={isReadOnly}
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
                                            disabled={isReadOnly}
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
                                            disabled={isReadOnly}
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
                                            // Fill with default if empty
                                            if (!med.frequency || !med.frequency.trim()) {
                                                const defaultText = language === 'te' ? 'అవసరమైతే' : 'if needed';
                                                handleMedChange(index, 'frequency', defaultText);
                                            }
                                        } else {
                                            handleMedChange(index, 'frequency', '');
                                        }
                                    }}
                                    className="rounded border-border"
                                    disabled={isReadOnly}
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
                                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                    className={getStyle('frequency', med.frequency)}
                                    disabled={isReadOnly}
                                />
                                {(!med.frequency) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(language === 'te'
                                            ? ["అవసరమైతే", "రోజు విడిచి రోజు", "వారానికి ఒకసారి", "వారానికి 2 సార్లు", "నెలకోసారి"]
                                            : ["If needed", "Alt-days", "Once a week", "2/week", "1/month"]
                                        ).map(text => (
                                            <div
                                                key={text}
                                                className="text-[10px] px-1.5 py-0.5 border rounded-full cursor-pointer hover:bg-muted text-muted-foreground bg-background transition-colors"
                                                onClick={() => !isReadOnly && handleMedChange(index, 'frequency', text)}
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
                                disabled={isReadOnly}
                            />
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
                                                    onClick={() => !isReadOnly && handleMedChange(index, 'duration', `${number} ${unit}`)}
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
                                disabled={isReadOnly}
                            />
                            {(!med.instructions) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {(language === 'te' ? ["ఆహరం ముందు", "ఆహరం తర్వాత"] : ["Bef. food", "Aft. food"]).map(text => (
                                        <div
                                            key={text}
                                            className="text-[10px] px-1.5 py-0.5 border rounded-full cursor-pointer hover:bg-muted text-muted-foreground bg-background transition-colors"
                                            onClick={() => !isReadOnly && handleMedChange(index, 'instructions', text)}
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
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </Card >
        </div >
    );
};
