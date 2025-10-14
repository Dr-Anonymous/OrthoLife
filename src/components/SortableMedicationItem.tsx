import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AutosuggestInput from '@/components/ui/AutosuggestInput';

export interface Medication {
  id: string;
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  duration: string;
  instructions: string;
}

interface SortableMedicationItemProps {
  med: Medication;
  index: number;
  handleMedChange: (index: number, field: keyof Medication, value: any) => void;
  removeMedication: (index: number) => void;
  savedMedications: Medication[];
  setExtraData: React.Dispatch<React.SetStateAction<any>>;
}

const SortableMedicationItem = ({ med, index, handleMedChange, removeMedication, savedMedications, setExtraData }: SortableMedicationItemProps) => {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="p-4 border border-border relative">
        <div {...listeners} className="absolute top-1/2 -left-6 -translate-y-1/2 p-2 cursor-grab text-muted-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => removeMedication(index)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove medication</span>
        </Button>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Medicine Name</Label>
              <AutosuggestInput
                value={med.name}
                onChange={value => handleMedChange(index, 'name', value)}
                suggestions={savedMedications.map(m => ({ id: m.id, name: m.name }))}
                onSuggestionSelected={suggestion => {
                  const savedMed = savedMedications.find(m => m.id === suggestion.id);
                  if (savedMed) {
                    setExtraData(prev => {
                      const newMeds = [...prev.medications];
                      newMeds[index] = { ...savedMed, id: crypto.randomUUID(), name: savedMed.name };
                      return { ...prev, medications: newMeds };
                    });
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
            <div className="flex items-center gap-6">
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
            </div>
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
        </div>
      </Card>
    </div>
  );
};

export default SortableMedicationItem;