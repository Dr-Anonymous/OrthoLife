import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, GripVertical, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { ConsultationContext } from '@/context/ConsultationContext';
import { useTranslation } from 'react-i18next';

export interface Medication {
  id: string;
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
  instructions_te?: string;
  frequency_te?: string;
  notes_te?: string;
}

const SortableMedicationItem = ({ med, index, handleMedChange, removeMedication, savedMedications, medicationNameInputRef, fetchSavedMedications }: { med: Medication, index: number, handleMedChange: (index: number, field: keyof Medication, value: any) => void, removeMedication: (index: number) => void, savedMedications: Medication[], medicationNameInputRef: React.RefObject<HTMLInputElement | null>, fetchSavedMedications: () => void }) => {
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

  const { dispatch } = React.useContext(ConsultationContext);
  const { i18n } = useTranslation();

  const [isCustom, setIsCustom] = useState(!!med.frequency);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  useEffect(() => {
    setIsCustom(!!med.frequency);
  }, [med.frequency]);

  const isFavorite = savedMedications.some(savedMed => savedMed.name.toLowerCase() === med.name.toLowerCase());

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
      const { data, error } = await supabase
        .from('saved_medications')
        .insert([{
          name: med.name,
          dose: med.dose,
          freq_morning: med.freqMorning,
          freq_noon: med.freqNoon,
          freq_night: med.freqNight,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          notes: med.notes,
        }]);

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
                ref={medicationNameInputRef}
                value={med.name}
                onChange={value => handleMedChange(index, 'name', value)}
                suggestions={savedMedications.map(m => ({ id: m.id, name: m.name }))}
                onSuggestionSelected={suggestion => {
                  const savedMed = savedMedications.find(m => m.id === suggestion.id);
                  if (savedMed) {
                    const medToAdd = i18n.language === 'te' ? {
                      ...savedMed,
                      id: crypto.randomUUID(),
                      name: savedMed.name,
                      instructions: savedMed.instructions_te || savedMed.instructions,
                      frequency: savedMed.frequency_te || savedMed.frequency,
                      notes: savedMed.notes_te || savedMed.notes,
                    } : { ...savedMed, id: crypto.randomUUID(), name: savedMed.name };

                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'name', value: medToAdd.name } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'dose', value: medToAdd.dose } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'freqMorning', value: medToAdd.freqMorning } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'freqNoon', value: medToAdd.freqNoon } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'freqNight', value: medToAdd.freqNight } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'frequency', value: medToAdd.frequency } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'duration', value: medToAdd.duration } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'instructions', value: medToAdd.instructions } });
                    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field: 'notes', value: medToAdd.notes } });
                  }
                }}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dosage</Label>
              <Input
                value={med.dose}
                onChange={e => handleMedChange(index, 'dose', e.target.value)}
                placeholder="e.g., 500mg"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
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
                      checked={med.freqMorning}
                      onChange={e => handleMedChange(index, 'freqMorning', e.target.checked)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqMorning', !med.freqMorning))}
                      className="rounded border-border"
                    />
                    <span className="text-sm">Morning</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={med.freqNoon}
                      onChange={e => handleMedChange(index, 'freqNoon', e.target.checked)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqNoon', !med.freqNoon))}
                      className="rounded border-border"
                    />
                    <span className="text-sm">Noon</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={med.freqNight}
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
            {isCustom &&
              <Textarea
                value={med.frequency}
                onChange={e => handleMedChange(index, 'frequency', e.target.value)}
                placeholder="e.g., once a week"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            }
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duration</Label>
              <Input
                value={med.duration}
                onChange={e => handleMedChange(index, 'duration', e.target.value)}
                placeholder="e.g., 7 days"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instructions</Label>
              <Input
                value={med.instructions}
                onChange={e => handleMedChange(index, 'instructions', e.target.value)}
                placeholder="Special instructions"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Input
              value={med.notes}
              onChange={e => handleMedChange(index, 'notes', e.target.value)}
              placeholder="e.g., side effects"
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
export default SortableMedicationItem;
