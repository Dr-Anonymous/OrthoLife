import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Save, Trash2, Edit, Languages } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Medication {
  id?: string;
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
  frequency_te?: string;
  instructions_te?: string;
  notes_te?: string;
}

interface SavedMedicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicationsUpdate: () => void;
}

const SavedMedicationsModal: React.FC<SavedMedicationsModalProps> = ({ isOpen, onClose, onMedicationsUpdate }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [newMed, setNewMed] = useState<Medication>({
    name: '',
    dose: '',
    freqMorning: false,
    freqNoon: false,
    freqNight: false,
    frequency: '',
    duration: '',
    instructions: '',
    notes: '',
    frequency_te: '',
    instructions_te: '',
    notes_te: '',
  });

  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  const debouncedInstructions = useDebounce(newMed.instructions, 500);
  const debouncedFrequency = useDebounce(newMed.frequency, 500);
  const debouncedNotes = useDebounce(newMed.notes, 500);

  const translateField = async (text: string, field: keyof Medication) => {
    if (!text) return;
    setIsTranslating(field);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { text, targetLanguage: 'te' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const translatedText = data.translatedText;

      const teluguField = `${field}_te` as keyof Medication;
      setNewMed(prev => ({ ...prev, [teluguField]: translatedText }));

    } catch (error) {
      console.error('Translation error:', error);
      toast({ variant: 'destructive', title: 'Translation failed' });
    } finally {
      setIsTranslating(null);
    }
  };

  useEffect(() => {
    if (debouncedInstructions) translateField(debouncedInstructions, 'instructions');
  }, [debouncedInstructions]);

  useEffect(() => {
    if (debouncedFrequency) translateField(debouncedFrequency, 'frequency');
  }, [debouncedFrequency]);

  useEffect(() => {
    if (debouncedNotes) translateField(debouncedNotes, 'notes');
  }, [debouncedNotes]);

  const fetchMedications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('saved_medications').select('*').order('name');
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch saved medications.' });
    } else {
      setMedications(data.map(d => ({...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night})));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedications();
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof Medication, value: string | boolean) => {
    setNewMed(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOrUpdateMedication = async () => {
    if (!newMed.name) {
      toast({ variant: 'destructive', title: 'Error', description: 'Medication name is required.' });
      return;
    }

    setIsLoading(true);
    const { error } = isEditing
      ? await supabase.from('saved_medications').update({
          name: newMed.name,
          dose: newMed.dose,
          freq_morning: newMed.freqMorning,
          freq_noon: newMed.freqNoon,
          freq_night: newMed.freqNight,
          frequency: newMed.frequency,
          duration: newMed.duration,
          instructions: newMed.instructions,
          notes: newMed.notes,
          instructions_te: newMed.instructions_te,
          frequency_te: newMed.frequency_te,
          notes_te: newMed.notes_te,
        }).eq('id', isEditing)
      : await supabase.from('saved_medications').insert([{
          name: newMed.name,
          dose: newMed.dose,
          freq_morning: newMed.freqMorning,
          freq_noon: newMed.freqNoon,
          freq_night: newMed.freqNight,
          frequency: newMed.frequency,
          duration: newMed.duration,
          instructions: newMed.instructions,
          notes: newMed.notes,
          instructions_te: newMed.instructions_te,
          frequency_te: newMed.frequency_te,
          notes_te: newMed.notes_te,
        }]);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${isEditing ? 'update' : 'add'} medication.` });
      setIsLoading(false);
    } else {
      toast({ title: 'Success', description: `Medication ${isEditing ? 'updated' : 'added'} successfully.` });
      resetForm();
      await fetchMedications();
      onMedicationsUpdate();
    }
  };

  const handleDeleteMedication = async (id: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('saved_medications').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete medication.' });
      setIsLoading(false);
    } else {
      toast({ title: 'Success', description: 'Medication deleted successfully.' });
      await fetchMedications();
      onMedicationsUpdate();
    }
  };

  const startEditing = (med: Medication) => {
    setIsEditing(med.id!);
    setNewMed(med);
    setIsCustom(!!med.frequency);
  };

  const resetForm = () => {
    setIsEditing(null);
    setNewMed({ name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, frequency: '', duration: '', instructions: '', notes: '', frequency_te: '', instructions_te: '', notes_te: '' });
    setIsCustom(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Saved Medications</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{isEditing ? 'Edit Medication' : 'Add New Medication'}</h3>
            <div className="space-y-2">
              <Label htmlFor="med-name">Name</Label>
              <Input id="med-name" value={newMed.name} onChange={e => handleInputChange('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-dose">Dose</Label>
              <Input id="med-dose" value={newMed.dose} onChange={e => handleInputChange('dose', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <div className="flex items-center gap-6">
                {!isCustom && (
                  <>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newMed.freqMorning} onChange={e => handleInputChange('freqMorning', e.target.checked)} className="rounded border-border" />
                      Morning
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newMed.freqNoon} onChange={e => handleInputChange('freqNoon', e.target.checked)} className="rounded border-border" />
                      Noon
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newMed.freqNight} onChange={e => handleInputChange('freqNight', e.target.checked)} className="rounded border-border" />
                      Night
                    </Label>
                  </>
                )}
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustom}
                    onChange={() => {
                      const newIsCustom = !isCustom;
                      setIsCustom(newIsCustom);
                      if (newIsCustom) {
                        handleInputChange('freqMorning', false);
                        handleInputChange('freqNoon', false);
                        handleInputChange('freqNight', false);
                      } else {
                        handleInputChange('frequency', '');
                      }
                    }}
                    className="rounded border-border"
                  />
                  Custom
                </Label>
              </div>
              {isCustom && (
                <div className="space-y-2">
                  <Input id="med-frequency" value={newMed.frequency} onChange={e => handleInputChange('frequency', e.target.value)} placeholder="e.g., once a week" />
                  {isTranslating === 'frequency' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Input id="med-frequency-te" value={newMed.frequency_te} onChange={e => handleInputChange('frequency_te', e.target.value)} placeholder="Telugu Frequency" />}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-duration">Duration</Label>
              <Input id="med-duration" value={newMed.duration} onChange={e => handleInputChange('duration', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-instructions">Instructions</Label>
              <Input id="med-instructions" value={newMed.instructions} onChange={e => handleInputChange('instructions', e.target.value)} />
              {isTranslating === 'instructions' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Input id="med-instructions-te" value={newMed.instructions_te} onChange={e => handleInputChange('instructions_te', e.target.value)} placeholder="Telugu Instructions" />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-notes">Notes</Label>
              <Input id="med-notes" value={newMed.notes} onChange={e => handleInputChange('notes', e.target.value)} />
              {isTranslating === 'notes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Input id="med-notes-te" value={newMed.notes_te} onChange={e => handleInputChange('notes_te', e.target.value)} placeholder="Telugu Notes" />}
            </div>
            <div className="flex justify-end space-x-2">
              {isEditing && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
              <Button onClick={handleAddOrUpdateMedication} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span className="ml-2">{isEditing ? 'Update' : 'Add'}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Saved List</h3>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
              {isLoading && medications.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                medications.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="font-medium">({med.id}) {med.name}</span>
                    <div className="space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => startEditing(med)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMedication(med.id!)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavedMedicationsModal;