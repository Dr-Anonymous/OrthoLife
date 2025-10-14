import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Stethoscope, X, GripVertical, Calendar as CalendarIcon } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import SavedMedicationsModal from '@/components/SavedMedicationsModal';
import KeywordManagementModal from '@/components/KeywordManagementModal';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { useDebounce } from '@/hooks/useDebounce';
import SortableMedicationItem, { Medication } from '@/components/SortableMedicationItem';
import { handleError } from '@/lib/error';

interface Consultation {
    id: string;
    patient_name: string;
    patient_id: string;
    // Add other patient details here if needed
}

interface PatientData {
    name: string;
    dob: Date | undefined;
    sex: string;
    phone: string;
    complaints: string;
    findings: string;
    investigations: string;
    diagnosis: string;
    advice: string;
    followup: string;
    medications: Medication[];
}

import { useStore } from '@/store/useStore';

const Consultation = () => {
  const {
    extraData,
    setExtraData,
    savedMedications,
    setSavedMedications,
    pendingConsultations,
    setPendingConsultations,
    selectedConsultation,
    setSelectedConsultation,
  } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = extraData.medications.findIndex(m => m.id === active.id);
      const newIndex = extraData.medications.findIndex(m => m.id === over.id);
      setExtraData({
        ...extraData,
        medications: arrayMove(extraData.medications, oldIndex, newIndex),
      });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

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

        if (data && data.length > 0) {
          const newMedications = data.map(med => ({
            ...med,
            id: crypto.randomUUID(),
            freqMorning: med.freq_morning,
            freqNoon: med.freq_noon,
            freqNight: med.freq_night,
          }));

          const existingMedNames = new Set(extraData.medications.map(m => m.name));
          const filteredNewMeds = newMedications.filter(m => !existingMedNames.has(m.name));
          setExtraData({
            ...extraData,
            medications: [...extraData.medications, ...filteredNewMeds],
          });
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
      handleError(error, 'Error fetching saved medications');
    } else {
      setSavedMedications(data.map(d => ({...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night})));
    }
  };

  useEffect(() => {
    fetchSavedMedications();
  }, []);

  const fetchConsultations = async (date: Date) => {
    setIsFetchingConsultations(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-pending-consultations', {
        body: { date: format(date, 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPendingConsultations(data.consultations || []);
    } catch (error) {
      handleError(error, 'Error fetching consultations');
    } finally {
      setIsFetchingConsultations(false);
    }
  }

  const fetchPatientData = useCallback(async (patientId: string) => {
    setIsFetchingDetails(true);
    try {
        // Since we are not storing medical data in the patient table, we just need to reset the form
        setExtraData({
            complaints: '',
            findings: '',
            investigations: '',
            diagnosis: '',
            advice: '',
            followup: 'after 2 weeks/immediately- if worsening of any symptoms.',
            medications: [
              { id: crypto.randomUUID(), name: 'T. HIFENAC SP', dose: '1 tab', freqMorning: true, freqNoon: false, freqNight: true, duration: '1 week', instructions: 'Aft. meal' },
              { id: crypto.randomUUID(), name: 'T. PANTOVAR', dose: '40 mg', freqMorning: true, freqNoon: false, freqNight: false, duration: '1 week', instructions: 'Bef. breakfast' }
            ],
        });
    } catch (error) {
        handleError(error, 'Error fetching patient details');
    } finally {
        setIsFetchingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
        fetchConsultations(selectedDate);
        setSelectedConsultation(null); // Reset selection when date changes
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedConsultation) {
        fetchPatientData(selectedConsultation.patient_id);
    }
  }, [selectedConsultation, fetchPatientData]);

  const handleExtraChange = (field: string, value: string) => {
    setExtraData({ ...extraData, [field]: value });
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string | boolean) => {
    if (field === 'name' && typeof value === 'string' && value.startsWith('//')) {
      setIsMedicationsModalOpen(true);
      const newMeds = [...extraData.medications];
      newMeds[index].name = '';
      setExtraData({ ...extraData, medications: newMeds });
      return;
    }

    if (field === 'name' && typeof value === 'string' && value.includes('@')) {
      setIsKeywordModalOpen(true);
      const newMeds = [...extraData.medications];
      const med = newMeds[index];
      newMeds[index] = { ...med, name: med.name.replace('@', '') };
      setExtraData({ ...extraData, medications: newMeds });
      return;
    }

    const newMeds = [...extraData.medications];
    newMeds[index][field] = value as never;
    setExtraData({ ...extraData, medications: newMeds });
  };

  const addMedication = () => {
    setExtraData({
      ...extraData,
      medications: [
        ...extraData.medications,
        { id: crypto.randomUUID(), name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, duration: '', instructions: '' }
      ]
    });
  };

  const removeMedication = (index: number) => {
    setExtraData({
      ...extraData,
      medications: extraData.medications.filter((_, i) => i !== index)
    });
  };

  const handleTranslateAll = async () => {
    const textsToTranslate = {
        advice: extraData.advice,
        followup: extraData.followup,
        medications: extraData.medications.map(med => med.instructions)
    };

    if (!textsToTranslate.advice.trim() && !textsToTranslate.followup.trim() && textsToTranslate.medications.every(inst => !inst.trim())) {
        toast({
            variant: 'destructive',
            title: 'Nothing to translate',
            description: 'Please enter some text in Advice, Follow-up, or Medication Instructions before translating.',
        });
        return;
    }

    setIsTranslating(true);

    try {
        const translate = (text: string) => {
            if (!text.trim()) return Promise.resolve(text);
            return supabase.functions.invoke('translate-content', {
                body: { text, targetLanguage: 'te' },
            }).then(result => {
                if (result.error) throw new Error(result.error.message);
                if (result.data?.error) throw new Error(result.data.error);
                return result.data?.translatedText || text;
            });
        };

        const [translatedAdvice, translatedFollowup] = await Promise.all([
            translate(textsToTranslate.advice),
            translate(textsToTranslate.followup)
        ]);

        const translatedMedInstructions = await Promise.all(
            textsToTranslate.medications.map(inst => translate(inst))
        );

        setExtraData({
            ...extraData,
            advice: translatedAdvice,
            followup: translatedFollowup,
            medications: extraData.medications.map((med, index) => ({
                ...med,
                instructions: translatedMedInstructions[index]
            }))
        });

        toast({
            title: 'Translation Successful',
            description: 'The relevant fields have been translated to Telugu.'
        });

    } catch (error) {
        handleError(error, 'Could not translate the text. Please try again.');
    } finally {
        setIsTranslating(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;
    setIsSubmitting(true);
    try {
        const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('name, dob, sex, phone')
            .eq('id', selectedConsultation.patient_id)
            .single();

        if (patientError) throw patientError;

      const payload = {
        templateId: "1Wm5gXKW1AwVcdQVmlekOSHN60u32QNIoqGpP_NyDlw4",
        patientId: selectedConsultation.patient_id,
        name: patientData.name,
        dob: patientData.dob,
        sex: patientData.sex,
        phone: patientData.phone,
        complaints: extraData.complaints,
        findings: extraData.findings,
        investigations: extraData.investigations,
        diagnosis: extraData.diagnosis,
        advice: extraData.advice,
        followup: extraData.followup,
        medications: JSON.stringify(extraData.medications)
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

      // Update consultation status
      await supabase.from('consultations').update({ status: 'completed' }).eq('id', selectedConsultation.id);

      toast({
        title: "Prescription Generated",
        description: `Prescription for ${selectedConsultation.patient_name} has been generated.`,
      });

      // Refresh consultation list
      if(selectedDate) fetchConsultations(selectedDate);
      setSelectedConsultation(null);

    } catch (error) {
      handleError(error, 'Failed to generate prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                    <div>
                        <Label>Consultation Date</Label>
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
                                        {c.patient_name}
                                    </Button>
                                ))}
                                {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No consultations for this date.</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                {selectedConsultation ? (
                    <form onSubmit={submitForm} className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-foreground">Medical Information for {selectedConsultation.patient_name}</h3>
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
                                <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
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
                            <div className="flex justify-end">
                            <Button type="button" onClick={addMedication} variant="outline" size="sm">
                                Add Medication
                            </Button>
                            <Button type="button" size="sm" variant="link" onClick={handleTranslateAll} disabled={isTranslating}>
                                {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Translate to Telugu
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