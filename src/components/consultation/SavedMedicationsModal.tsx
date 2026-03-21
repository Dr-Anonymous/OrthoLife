import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
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
import { Loader2, X, Plus, Save, Trash2, Edit, Search, MapPin } from 'lucide-react';
import { useHospitals } from '@/context/HospitalsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface Medication {
  id?: string;
  name: string; // This acts as the generic/composition name now
  brand_metadata?: { name: string; cost?: number; locations?: string[] }[];
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  duration_te?: string;
  instructions: string;
  notes: string;
  instructions_te?: string;
  frequency_te?: string;
  notes_te?: string;
}

interface SavedMedicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicationsUpdate: () => void;
}

/**
 * SavedMedicationsModal Component
 * 
 * CRUD interface for managing the "Saved Medications" master list.
 * Features:
 * - Add/Edit/Delete medications.
 * - Auto-translation of instructions/notes to Telugu via `translate-content` function.
 * - Searchable list of saved medications.
 * - Custom frequency support.
 */
const SavedMedicationsModal: React.FC<SavedMedicationsModalProps> = ({ isOpen, onClose, onMedicationsUpdate }) => {
  const { hospitals } = useHospitals();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [newMed, setNewMed] = useState<Medication>({
    name: '',
    brand_metadata: [],
    dose: '',
    freqMorning: false,
    freqNoon: false,
    freqNight: false,
    frequency: '',
    duration: '',
    duration_te: '',
    instructions: '',
    notes: '',
    instructions_te: '',
    frequency_te: '',
    notes_te: '',
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const debouncedInstructions = useDebounce(newMed.instructions, 500);
  const debouncedFrequency = useDebounce(newMed.frequency, 500);
  const debouncedDuration = useDebounce(newMed.duration, 500);
  const debouncedNotes = useDebounce(newMed.notes, 500);
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    const translateField = async (text: string, field: keyof Medication) => {
      if (!text || !text.trim()) return;
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: { text, targetLanguage: 'te' },
        });
        if (error) throw error;
        if (data?.translatedText) {
          setNewMed(prev => ({ ...prev, [field]: data.translatedText }));
        }
      } catch (err) {
        console.error(`Translation error for ${field}:`, err);
        toast({ variant: 'destructive', title: `Translation Error`, description: `Could not translate ${field}.` });
      } finally {
        setIsTranslating(false);
      }
    };

    if (!isEditing) {
      if (debouncedInstructions !== newMed.instructions_te) translateField(debouncedInstructions, 'instructions_te');
      if (debouncedFrequency !== newMed.frequency_te) translateField(debouncedFrequency, 'frequency_te');
      if (debouncedDuration !== newMed.duration_te) translateField(debouncedDuration, 'duration_te');
      if (debouncedNotes !== newMed.notes_te) translateField(debouncedNotes, 'notes_te');
    }
  }, [debouncedInstructions, debouncedFrequency, debouncedDuration, debouncedNotes, isEditing]);


  useEffect(() => {
    if (isEditing && newMed.id) {
      const translateFields = async () => {
        setIsTranslating(true);
        try {
          const translate = async (text: string) => {
            if (!text || !text.trim()) return '';
            const { data, error } = await supabase.functions.invoke('translate-content', {
              body: { text, targetLanguage: 'te' },
            });
            if (error) throw error;
            return data?.translatedText || '';
          };

          const [instructions_te, frequency_te, duration_te, notes_te] = await Promise.all([
            newMed.instructions ? translate(newMed.instructions) : Promise.resolve(''),
            newMed.frequency ? translate(newMed.frequency) : Promise.resolve(''),
            newMed.duration ? translate(newMed.duration) : Promise.resolve(''),
            newMed.notes ? translate(newMed.notes) : Promise.resolve(''),
          ]);

          setNewMed(prev => ({ ...prev, instructions_te, frequency_te, duration_te, notes_te }));

        } catch (err) {
          console.error('Translation error:', err);
          toast({ variant: 'destructive', title: 'Translation Error', description: (err as Error).message });
        } finally {
          setIsTranslating(false);
        }
      };

      if (!newMed.instructions_te && !newMed.frequency_te && !newMed.duration_te && !newMed.notes_te) {
        translateFields();
      }
    }
  }, [isEditing, newMed.id]);

  const fetchMedications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('saved_medications').select('*').order('name');
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch saved medications.' });
    } else {
      setMedications(data.map(d => ({ ...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedications();
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof Medication, value: any) => {
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
        brand_metadata: newMed.brand_metadata || [],
        dose: newMed.dose,
        freq_morning: newMed.freqMorning,
        freq_noon: newMed.freqNoon,
        freq_night: newMed.freqNight,
        frequency: newMed.frequency,
        duration: newMed.duration,
        duration_te: newMed.duration_te,
        instructions: newMed.instructions,
        notes: newMed.notes,
        instructions_te: newMed.instructions_te,
        frequency_te: newMed.frequency_te,
        notes_te: newMed.notes_te,
      }).eq('id', isEditing)
      : await supabase.from('saved_medications').insert([{
        name: newMed.name,
        brand_metadata: newMed.brand_metadata || [],
        dose: newMed.dose,
        freq_morning: newMed.freqMorning,
        freq_noon: newMed.freqNoon,
        freq_night: newMed.freqNight,
        frequency: newMed.frequency,
        duration: newMed.duration,
        duration_te: newMed.duration_te,
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
    setNewMed({ name: '', brand_metadata: [], dose: '', freqMorning: false, freqNoon: false, freqNight: false, frequency: '', duration: '', duration_te: '', instructions: '', notes: '', instructions_te: '', frequency_te: '', notes_te: '' });
    setIsCustom(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Saved Medications</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{isEditing ? 'Edit Medication' : 'Add New Medication'}</h3>
            <div className="space-y-2">
              <Label htmlFor="med-name">Name (Composition)</Label>
              <Input id="med-name" value={newMed.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="e.g. Aceclofenac + Paracetamol" />
            </div>
            <div className="space-y-4 border p-4 rounded-md">
              <div className="flex justify-between items-center">
                <Label>Brand Metadata</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('brand_metadata', [...(newMed.brand_metadata || []), { name: '' }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Brand
                </Button>
              </div>
              {(newMed.brand_metadata || []).map((b, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start mt-2 border-b pb-2">
                  <div className="col-span-5">
                    <Input placeholder="Brand name" value={b.name} onChange={e => {
                        const arr = [...(newMed.brand_metadata || [])];
                        arr[i].name = e.target.value;
                        handleInputChange('brand_metadata', arr);
                    }} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" placeholder="Cost" value={b.cost?.toString() || ''} onChange={e => {
                        const arr = [...(newMed.brand_metadata || [])];
                        arr[i].cost = e.target.value ? Number(e.target.value) : undefined;
                        handleInputChange('brand_metadata', arr);
                    }} />
                  </div>
                  <div className="col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between px-2 h-10 font-normal">
                          <span className="truncate">
                            {b.locations?.length ? `${b.locations.length} locs` : 'All Locs'}
                          </span>
                          <MapPin className="w-3 h-3 ml-1 text-muted-foreground shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-2" align="start">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Select Locations</p>
                          {hospitals.map(h => (
                            <div key={h.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`loc-${i}-${h.id}`} 
                                checked={(b.locations || []).includes(h.name)} 
                                onCheckedChange={(checked) => {
                                  const arr = [...(newMed.brand_metadata || [])];
                                  const currentLocs = arr[i].locations || [];
                                  if (checked) {
                                    arr[i].locations = [...currentLocs, h.name];
                                  } else {
                                    arr[i].locations = currentLocs.filter(name => name !== h.name);
                                  }
                                  handleInputChange('brand_metadata', arr);
                                }} 
                              />
                              <label htmlFor={`loc-${i}-${h.id}`} className="text-xs cursor-pointer truncate">
                                {h.name}
                              </label>
                            </div>
                          ))}
                          {hospitals.length === 0 && <p className="text-xs italic text-muted-foreground">No locations found</p>}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-1 pt-1 justify-self-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 text-destructive" onClick={() => {
                        const arr = [...(newMed.brand_metadata || [])];
                        arr.splice(i, 1);
                        handleInputChange('brand_metadata', arr);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="med-frequency">Frequency</Label>
                    <Input id="med-frequency" value={newMed.frequency} onChange={e => handleInputChange('frequency', e.target.value)} placeholder="e.g., once a week" />
                  </div>
                  {isCustom && (
                    <div className="space-y-2">
                      <Label htmlFor="med-frequency-te">Frequency (Telugu)</Label>
                      <Input id="med-frequency-te" value={newMed.frequency_te} onChange={e => handleInputChange('frequency_te', e.target.value)} disabled={isTranslating} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="med-duration">Duration</Label>
                <Input id="med-duration" value={newMed.duration} onChange={e => handleInputChange('duration', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-duration-te">Duration (Telugu)</Label>
                <Input id="med-duration-te" value={newMed.duration_te || ''} onChange={e => handleInputChange('duration_te', e.target.value)} disabled={isTranslating} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="med-instructions">Instructions</Label>
                <Input id="med-instructions" value={newMed.instructions} onChange={e => handleInputChange('instructions', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-instructions-te">Instructions (Telugu)</Label>
                <Input id="med-instructions-te" value={newMed.instructions_te} onChange={e => handleInputChange('instructions_te', e.target.value)} disabled={isTranslating} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="med-notes">Notes</Label>
                <Input id="med-notes" value={newMed.notes} onChange={e => handleInputChange('notes', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-notes-te">Notes (Telugu)</Label>
                <Input id="med-notes-te" value={newMed.notes_te} onChange={e => handleInputChange('notes_te', e.target.value)} disabled={isTranslating} />
              </div>
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Saved List</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search saved meds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-40 pl-8"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
              {isLoading && medications.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                medications
                  .filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()) || (med.brand_metadata && med.brand_metadata.some(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))))
                  .map(med => (
                    <div key={med.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div>
                        <span className="font-medium block">{med.name}</span>
                        {med.brand_metadata && med.brand_metadata.length > 0 && (
                          <span className="text-xs text-muted-foreground block">
                            {med.brand_metadata.map(b => `${b.name} (₹${b.cost || '-'})`).join(', ')}
                          </span>
                        )}
                      </div>
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