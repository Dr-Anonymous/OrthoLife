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
  brand_metadata?: { name: string; cost?: number; packSize?: number; locations?: string[] }[];
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
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const filteredMeds = medications.filter(med => 
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (med.brand_metadata && med.brand_metadata.some(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredMeds.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % filteredMeds.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + filteredMeds.length) % filteredMeds.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeMed = filteredMeds[activeSuggestionIndex];
      if (activeMed) {
        startEditing(activeMed);
      }
    }
  };


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
      if (newMed.instructions && debouncedInstructions === newMed.instructions && debouncedInstructions !== newMed.instructions_te) {
        translateField(debouncedInstructions, 'instructions_te');
      } else if (!newMed.instructions && newMed.instructions_te) {
        setNewMed(prev => ({ ...prev, instructions_te: '' }));
      }

      if (newMed.frequency && debouncedFrequency === newMed.frequency && debouncedFrequency !== newMed.frequency_te) {
        translateField(debouncedFrequency, 'frequency_te');
      } else if (!newMed.frequency && newMed.frequency_te) {
        setNewMed(prev => ({ ...prev, frequency_te: '' }));
      }

      if (newMed.duration && debouncedDuration === newMed.duration && debouncedDuration !== newMed.duration_te) {
        translateField(debouncedDuration, 'duration_te');
      } else if (!newMed.duration && newMed.duration_te) {
        setNewMed(prev => ({ ...prev, duration_te: '' }));
      }

      if (newMed.notes && debouncedNotes === newMed.notes && debouncedNotes !== newMed.notes_te) {
        translateField(debouncedNotes, 'notes_te');
      } else if (!newMed.notes && newMed.notes_te) {
        setNewMed(prev => ({ ...prev, notes_te: '' }));
      }
    }
  }, [
    debouncedInstructions, debouncedFrequency, debouncedDuration, debouncedNotes, 
    newMed.instructions, newMed.frequency, newMed.duration, newMed.notes,
    isEditing
  ]);


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
            <div className="space-y-4 border p-4 rounded-md bg-muted/30">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Brand Metadata</Label>
                  <p className="text-[10px] text-muted-foreground italic">Add brands, costs, and locations for this composition.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] uppercase tracking-wider font-bold"
                  onClick={() => handleInputChange('brand_metadata', [...(newMed.brand_metadata || []), { name: '', packSize: 10 }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Brand
                </Button>
              </div>
              
              <div className="space-y-3">
                {(newMed.brand_metadata || []).map((b, i) => (
                  <div key={i} className="bg-background border rounded-lg p-3 shadow-sm relative group space-y-3">
                    {/* Row 1: Brand Name and Delete */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Brand Name</Label>
                        <Input 
                          placeholder="e.g. Dolo 650" 
                          value={b.name} 
                          className="h-8 text-xs"
                          onChange={e => {
                            const arr = [...(newMed.brand_metadata || [])];
                            arr[i].name = e.target.value;
                            handleInputChange('brand_metadata', arr);
                          }} 
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" 
                        onClick={() => {
                          const arr = [...(newMed.brand_metadata || [])];
                          arr.splice(i, 1);
                          handleInputChange('brand_metadata', arr);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Row 2: MRP, Pack, Locations */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">MRP (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={b.cost?.toString() || ''} 
                          className="h-8 text-xs font-mono"
                          onChange={e => {
                            const arr = [...(newMed.brand_metadata || [])];
                            arr[i].cost = e.target.value ? Number(e.target.value) : undefined;
                            handleInputChange('brand_metadata', arr);
                          }} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Pack</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          title="Number of units per pack (e.g. 10 tablets)"
                          value={b.packSize?.toString() || ''} 
                          className="h-8 text-xs font-mono"
                          onChange={e => {
                            const arr = [...(newMed.brand_metadata || [])];
                            arr[i].packSize = e.target.value ? Number(e.target.value) : undefined;
                            handleInputChange('brand_metadata', arr);
                          }} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Locations</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-between px-2 h-8 text-[10px] font-normal border-dashed">
                              <span className="truncate">
                                {b.locations?.length ? `${b.locations.length} locs` : 'All'}
                              </span>
                              <MapPin className="w-2.5 h-2.5 ml-1 text-muted-foreground shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[180px] p-2" align="end">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Available At</p>
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
                                  <label htmlFor={`loc-${i}-${h.id}`} className="text-[10px] cursor-pointer truncate font-medium">
                                    {h.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    {b.cost && b.packSize && (
                      <div className="mt-2 pt-2 border-t border-dashed flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70">
                        <span>Analysis</span>
                        <span>₹{(b.cost / b.packSize).toFixed(2)} per unit</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="med-instructions" className="text-xs font-semibold">Instructions</Label>
                <Input id="med-instructions" value={newMed.instructions} onChange={e => handleInputChange('instructions', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 opacity-80">
                <Label htmlFor="med-instructions-te" className="text-xs font-semibold text-muted-foreground">Instructions (Te)</Label>
                <Input id="med-instructions-te" value={newMed.instructions_te} onChange={e => handleInputChange('instructions_te', e.target.value)} disabled={isTranslating} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="med-duration" className="text-xs font-semibold">Duration</Label>
                <Input id="med-duration" value={newMed.duration} onChange={e => handleInputChange('duration', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 opacity-80">
                <Label htmlFor="med-duration-te" className="text-xs font-semibold text-muted-foreground">Duration (Te)</Label>
                <Input id="med-duration-te" value={newMed.duration_te || ''} onChange={e => handleInputChange('duration_te', e.target.value)} disabled={isTranslating} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="med-notes" className="text-xs font-semibold">Notes</Label>
                <Input id="med-notes" value={newMed.notes} onChange={e => handleInputChange('notes', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 opacity-80">
                <Label htmlFor="med-notes-te" className="text-xs font-semibold text-muted-foreground">Notes (Te)</Label>
                <Input id="med-notes-te" value={newMed.notes_te} onChange={e => handleInputChange('notes_te', e.target.value)} disabled={isTranslating} className="h-9" />
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
                  onKeyDown={handleKeyDown}
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
                filteredMeds.map((med, idx) => (
                    <div 
                      key={med.id} 
                      className={`flex items-center justify-between p-2 border rounded-md transition-colors ${idx === activeSuggestionIndex ? 'bg-primary/10 border-primary/50' : ''}`}
                    >
                      <div>
                        <span className="font-medium block">{med.name}</span>
                        {med.brand_metadata && med.brand_metadata.length > 0 && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {med.brand_metadata.map(b => {
                              const up = b.cost && b.packSize ? (b.cost / b.packSize).toFixed(2) : b.cost;
                              return `${b.name} (₹${up}${b.packSize && b.packSize > 1 ? '/u' : ''})`;
                            }).join(', ')}
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