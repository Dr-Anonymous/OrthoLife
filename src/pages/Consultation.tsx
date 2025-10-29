import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Stethoscope, X, GripVertical, Plus, Printer, Languages, Folder, BarChart } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import SavedMedicationsModal from '@/components/SavedMedicationsModal';
import KeywordManagementModal from '@/components/KeywordManagementModal';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { useDebounce } from '@/hooks/useDebounce';

interface Medication {
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
}

import { User, Phone, Calendar as CalendarIcon } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  drive_id: string | null;
}

interface Consultation {
  id: string;
  patient: Patient;
}

const SortableMedicationItem = ({ med, index, handleMedChange, removeMedication, savedMedications, setExtraData }: { med: Medication, index: number, handleMedChange: (index: number, field: keyof Medication, value: any) => void, removeMedication: (index: number) => void, savedMedications: Medication[], setExtraData: React.Dispatch<React.SetStateAction<any>> }) => {
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

  useEffect(() => {
    setIsCustom(!!med.frequency);
  }, [med.frequency]);

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

const Consultation = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pendingConsultations, setPendingConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);

  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));

  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: 'after 2 weeks/immediately- if worsening of any symptoms.',
    medications: [ ] as Medication[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExtraData(prev => {
        const oldIndex = prev.medications.findIndex(m => m.id === active.id);
        const newIndex = prev.medications.findIndex(m => m.id === over.id);
        return {
          ...prev,
          medications: arrayMove(prev.medications, oldIndex, newIndex),
        };
      });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [age, setAge] = useState<number | ''>('');

  const debouncedComplaints = useDebounce(extraData.complaints, 500);
  const debouncedDiagnosis = useDebounce(extraData.diagnosis, 500);

  useEffect(() => {
    const autofillMeds = async (text: string) => {
      if (text.trim() === '') return;

      try {
        const { data, error } = await supabase.functions.invoke('get-autofill-medications', {
          body: { text },
        });

        if (error) throw error;

        const { medications, advice } = data;

        if (medications && medications.length > 0) {
          const newMedications = medications.map(med => ({
            ...med,
            id: crypto.randomUUID(),
            freqMorning: med.freq_morning,
            freqNoon: med.freq_noon,
            freqNight: med.freq_night,
            frequency: med.frequency,
            notes: med.notes,
          }));

          setExtraData(prev => {
            const existingMedNames = new Set(prev.medications.map(m => m.name));
            const filteredNewMeds = newMedications.filter(m => !existingMedNames.has(m.name));
            const newAdvice = prev.advice.includes(advice) ? prev.advice : [prev.advice, advice].filter(Boolean).join('\n');

            return {
              ...prev,
              advice: newAdvice,
              medications: [...prev.medications, ...filteredNewMeds],
            };
          });
        } else if (advice) {
          setExtraData(prev => ({
            ...prev,
            advice: prev.advice.includes(advice) ? prev.advice : [prev.advice, advice].filter(Boolean).join('\n'),
          }));
        }
      } catch (error) {
        console.error('Error autofilling medications:', error);
      }
    };

    autofillMeds(debouncedComplaints);
    autofillMeds(debouncedDiagnosis);
  }, [debouncedComplaints, debouncedDiagnosis]);

  const fetchSavedMedications = async () => {
    const { data, error } = await supabase.from('saved_medications').select('*').order('name');
    if (error) {
      console.error('Error fetching saved medications:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching saved medications',
        description: error.message,
      });
    } else {
      setSavedMedications(data.map(d => ({...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night})));
    }
  };

  useEffect(() => {
    fetchSavedMedications();
  }, []);

  const fetchConsultations = async (date: Date) => {
    setIsFetchingConsultations(true);
    setPendingConsultations([]);
    setSelectedConsultation(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-pending-consultations', {
        body: { date: format(date, 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPendingConsultations(data.consultations || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching consultations',
        description: error.message,
      });
    } finally {
      setIsFetchingConsultations(false);
    }
  }

  useEffect(() => {
    if (selectedDate) {
        fetchConsultations(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedConsultation) {
        setEditablePatientDetails(selectedConsultation.patient);
        setExtraData({
            complaints: '',
            findings: '',
            investigations: '',
            diagnosis: '',
            advice: '',
            followup: 'after 2 weeks/immediately- if worsening of any symptoms.',
            medications: [ ],
        });
    } else {
        setEditablePatientDetails(null);
    }
  }, [selectedConsultation]);

  useEffect(() => {
    if (editablePatientDetails?.dob) {
      const dobDate = new Date(editablePatientDetails.dob);
      if (!isNaN(dobDate.getTime())) {
        setAge(calculateAge(dobDate));
        setCalendarDate(dobDate);
      }
    } else {
      setAge('');
    }
  }, [editablePatientDetails?.dob]);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setAge(newAge);
    if (editablePatientDetails && newAge !== '' && !isNaN(newAge)) {
      const today = new Date();
      const birthYear = today.getFullYear() - newAge;
      const currentDob = editablePatientDetails.dob ? new Date(editablePatientDetails.dob) : today;
      const newDob = new Date(birthYear, currentDob.getMonth(), currentDob.getDate());
      handlePatientDetailsChange('dob', format(newDob, 'yyyy-MM-dd'));
      setCalendarDate(newDob);
    }
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(calendarDate);
    newDate.setFullYear(parseInt(year));
    setCalendarDate(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(parseInt(month));
    setCalendarDate(newDate);
  };

  const handlePatientDetailsChange = (field: keyof Omit<Patient, 'drive_id'>, value: string) => {
    if (editablePatientDetails) {
        setEditablePatientDetails(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

    const handleDateChange = (date: Date | undefined) => {
    if (editablePatientDetails && date) {
        setEditablePatientDetails(prev => prev ? { ...prev, dob: format(date, 'yyyy-MM-dd') } : null);
    }
    setIsDatePickerOpen(false);
    };

  const handleExtraChange = (field: string, value: string) => {
    setExtraData(prev => ({ ...prev, [field]: value }));
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string | boolean) => {
    if (field === 'name' && typeof value === 'string' && value.startsWith('//')) {
      setIsMedicationsModalOpen(true);
      setExtraData(prev => {
        const newMeds = [...prev.medications];
        newMeds[index].name = '';
        return { ...prev, medications: newMeds };
      });
      return;
    }

    if (field === 'name' && typeof value === 'string' && value.includes('@')) {
      setIsKeywordModalOpen(true);
      setExtraData(prev => {
        const newMeds = [...prev.medications];
        const med = newMeds[index];
        newMeds[index] = { ...med, name: med.name.replace('@', '') };
        return { ...prev, medications: newMeds };
      });
      return;
    }

    setExtraData(prev => {
      const newMeds = [...prev.medications];
      newMeds[index][field] = value as never;
      return { ...prev, medications: newMeds };
    });
  };

  const addMedication = () => {
    setExtraData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        { id: crypto.randomUUID(), name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, frequency: '', duration: '', instructions: '', notes: '' }
      ]
    }));
  };

  const removeMedication = (index: number) => {
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleTranslateAll = async () => {
    const textsToTranslate = {
      advice: extraData.advice,
      followup: extraData.followup,
      medications: extraData.medications.map(med => ({
        instructions: med.instructions,
        frequency: med.frequency,
        notes: med.notes,
      })),
    };

    if (
      !(textsToTranslate.advice || '').trim() &&
      !(textsToTranslate.followup || '').trim() &&
      textsToTranslate.medications.every(
        med =>
          !(med.instructions || '').trim() &&
          !(med.frequency || '').trim() &&
          !(med.notes || '').trim()
      )
    ) {
      toast({
        variant: 'destructive',
        title: 'Nothing to translate',
        description:
          'Please enter some text in Advice, Follow-up, or Medication fields before translating.',
      });
      return;
    }

    setIsTranslating(true);

    try {
      const translate = (text: string | null | undefined) => {
        const textToTranslate = text || '';
        if (!textToTranslate.trim()) return Promise.resolve(text);
        return supabase.functions
          .invoke('translate-content', {
            body: { text: textToTranslate, targetLanguage: 'te' },
          })
          .then(result => {
            if (result.error) throw new Error(result.error.message);
            if (result.data?.error) throw new Error(result.data.error);
            return result.data?.translatedText || text;
          });
      };

      const [translatedAdvice, translatedFollowup] = await Promise.all([
        translate(textsToTranslate.advice),
        translate(textsToTranslate.followup),
      ]);

      const translatedMedications = await Promise.all(
        textsToTranslate.medications.map(async med => ({
          instructions: await translate(med.instructions),
          frequency: await translate(med.frequency),
          notes: await translate(med.notes),
        }))
      );

      setExtraData(prev => ({
        ...prev,
        advice: translatedAdvice,
        followup: translatedFollowup,
        medications: prev.medications.map((med, index) => ({
          ...med,
          instructions: translatedMedications[index].instructions,
          frequency: translatedMedications[index].frequency,
          notes: translatedMedications[index].notes,
        })),
      }));

      toast({
        title: 'Translation Successful',
        description: 'The relevant fields have been translated to Telugu.',
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Error',
        description:
          (error as Error).message ||
          'Could not translate the text. Please try again.',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleOrderNow = async () => {
    if (!selectedConsultation || !editablePatientDetails) return;
    setIsOrdering(true);
    try {
      const payload = {
        templateId: "1lcWQlx9YdMPBed6HbZKm8cPrFGghS43AmPXGhf9lBG0",
        patientId: selectedConsultation.patient.id,
        name: editablePatientDetails.name,
        dob: editablePatientDetails.dob,
        sex: editablePatientDetails.sex,
        phone: editablePatientDetails.phone,
        age: String(age),
        complaints: extraData.complaints,
        investigations: extraData.investigations,
        diagnosis: extraData.diagnosis,
        folderId: editablePatientDetails.drive_id,
      };

      const { data, error } = await supabase.functions.invoke('create-docs-investigations', {
        body: payload,
      });

      if (error) throw new Error(error.message || 'Failed to create investigations document');
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error ordering investigations:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to order investigations. Please try again.' });
    } finally {
      setIsOrdering(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation || !editablePatientDetails) return;
    setIsSubmitting(true);
    try {
      const payload = {
        templateId: "1Wm5gXKW1AwVcdQVmlekOSHN60u32QNIoqGpP_NyDlw4",
        patientId: selectedConsultation.patient.id,
        name: editablePatientDetails.name,
        dob: editablePatientDetails.dob,
        sex: editablePatientDetails.sex,
        phone: editablePatientDetails.phone,
        age: String(age),
        complaints: extraData.complaints,
        findings: extraData.findings,
        investigations: extraData.investigations,
        diagnosis: extraData.diagnosis,
        advice: extraData.advice,
        followup: extraData.followup,
        medications: JSON.stringify(extraData.medications),
        folderId: editablePatientDetails.drive_id,
      };

      const { data, error } = await supabase.functions.invoke('create-docs-prescription', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Failed to create prescription');
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }

      await supabase.from('consultations').update({ status: 'completed' }).eq('id', selectedConsultation.id);

      toast({
        title: "Prescription Generated",
        description: `Prescription for ${editablePatientDetails.name} has been generated.`,
      });

      if(selectedDate) fetchConsultations(selectedDate);
      setSelectedConsultation(null);

    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate prescription.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-7xl">
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold text-primary">
              <Stethoscope className="w-7 h-7" />
              Doctor's Consultation
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              View pending consultations and manage prescriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label>Consultation Date</Label>
                            <Link to="/consultation-stats">
                                <BarChart className="w-5 h-5 text-primary hover:text-primary/80" />
                            </Link>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label>Pending Consultations</Label>
                        {isFetchingConsultations ? (
                            <div className="flex justify-center items-center h-32">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-2 mt-2">
                                {pendingConsultations.map(c => (
                                    <Button key={c.id} variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setSelectedConsultation(c)}>
                                        {c.patient.name}
                                    </Button>
                                ))}
                                {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No consultations for this date.</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-3">
                {selectedConsultation && editablePatientDetails ? (
                    <form onSubmit={submitForm} className="space-y-6">
                        <div className="space-y-4">
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-5 h-5 text-primary" />
                                  <h3 className="text-lg font-semibold text-foreground">
                                    Medical Information for {editablePatientDetails.name}
                                  </h3>
                                </div>
                                {editablePatientDetails.drive_id && (
                                    <a href={`https://drive.google.com/drive/folders/${editablePatientDetails.drive_id}`} target="_blank" rel="noopener noreferrer">
                                        <Folder className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                                    </a>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={editablePatientDetails.name} onChange={e => handlePatientDetailsChange('name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" value={editablePatientDetails.phone} onChange={e => handlePatientDetailsChange('phone', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="dob">Date of Birth</Label>
                                  <div className="flex gap-2">
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editablePatientDetails.dob && "text-muted-foreground")}>
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {editablePatientDetails.dob ? format(new Date(editablePatientDetails.dob), "PPP") : <span>Select date</span>}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <div className="p-3 border-b space-y-2">
                                          <div className="flex gap-2">
                                            <Select value={calendarDate.getMonth().toString()} onValueChange={handleMonthChange}>
                                              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                {Array.from({ length: 12 }).map((_, index) => (
                                                  <SelectItem key={index} value={index.toString()}>
                                                    {format(new Date(2000, index), 'MMMM')}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Select value={calendarDate.getFullYear().toString()} onValueChange={handleYearChange}>
                                              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                              <SelectContent className="max-h-48">
                                                {Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <Calendar
                                          mode="single"
                                          selected={editablePatientDetails.dob ? new Date(editablePatientDetails.dob) : undefined}
                                          onSelect={handleDateChange}
                                          month={calendarDate}
                                          onMonthChange={setCalendarDate}
                                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                          initialFocus
                                          className="p-3"
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <Input
                                      id="age"
                                      type="number"
                                      placeholder="Age"
                                      value={age}
                                      onChange={handleAgeChange}
                                      className="w-24"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="sex">Sex</Label>
                                <Select value={editablePatientDetails.sex} onValueChange={value => handlePatientDetailsChange('sex', value)}>
                                    <SelectTrigger>
                                    <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="M">Male</SelectItem>
                                    <SelectItem value="F">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="complaints" className="text-sm font-medium">Complaints</Label>
                                <Textarea id="complaints" value={extraData.complaints} onChange={e => handleExtraChange('complaints', e.target.value)} placeholder="Patient complaints..." className="min-h-[100px]" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                                <Textarea id="findings" value={extraData.findings} onChange={e => handleExtraChange('findings', e.target.value)} placeholder="Clinical findings..." className="min-h-[100px]" />
                            </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                                  <Button type="button" size="icon" variant="ghost" onClick={handleOrderNow} disabled={isOrdering}>
                                    {isOrdering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    <span className="sr-only">Order Now</span>
                                  </Button>
                                </div>
                                <Textarea id="investigations" value={extraData.investigations} onChange={e => handleExtraChange('investigations', e.target.value)} placeholder="Investigations required..." className="min-h-[100px]" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                                <Textarea id="diagnosis" value={extraData.diagnosis} onChange={e => handleExtraChange('diagnosis', e.target.value)} placeholder="Clinical diagnosis..." className="min-h-[100px]" />
                            </div>
                            </div>

                            <div className="space-y-2">
                            <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
                            <Textarea id="advice" value={extraData.advice} onChange={e => handleExtraChange('advice', e.target.value)} placeholder="Medical advice..." className="min-h-[80px]" />
                            </div>

                            <div className="space-y-2">
                            <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
                            <Textarea id="followup" value={extraData.followup} onChange={e => handleExtraChange('followup', e.target.value)} placeholder="Follow-up instructions..." className="min-h-[80px]" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                            </div>
                            </div>

                            <div className="space-y-4 pl-6">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={extraData.medications.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                {extraData.medications.map((med, index) => (
                                    <SortableMedicationItem
                                    key={med.id}
                                    med={med}
                                    index={index}
                                    handleMedChange={handleMedChange}
                                    removeMedication={removeMedication}
                                    savedMedications={savedMedications}
                                    setExtraData={setExtraData}
                                    />
                                ))}
                                </SortableContext>
                            </DndContext>
                            </div>
                            <div className="flex justify-end items-center gap-2">
                                <Button type="button" size="icon" variant="ghost" onClick={handleTranslateAll} disabled={isTranslating}>
                                    {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                                    <span className="sr-only">Translate to Telugu</span>
                                </Button>
                                <Button type="button" onClick={addMedication} variant="outline" size="icon" className="rounded-full">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only">Add Medication</span>
                                </Button>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating Prescription...
                                </>
                            ) : (
                                'Generate Prescription'
                            )}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-muted/30 rounded-lg">
                        <p className="text-lg text-muted-foreground">Please select a patient to view details.</p>
                    </div>
                )}
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <SavedMedicationsModal
        isOpen={isMedicationsModalOpen}
        onClose={() => setIsMedicationsModalOpen(false)}
        onMedicationsUpdate={fetchSavedMedications}
      />
      <KeywordManagementModal
        isOpen={isKeywordModalOpen}
        onClose={() => setIsKeywordModalOpen(false)}
      />
    </div>
  );
};

export default Consultation;