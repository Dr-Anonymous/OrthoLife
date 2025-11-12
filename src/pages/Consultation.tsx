import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Stethoscope, X, GripVertical, Plus, Printer, Languages, Folder, BarChart, Save, ChevronDown, Star, RefreshCw, Eye, EyeOff, History, PackagePlus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import SavedMedicationsModal from '@/components/SavedMedicationsModal';
import KeywordManagementModal from '@/components/KeywordManagementModal';
import UnsavedChangesModal from '@/components/UnsavedChangesModal';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { useDebounce } from '@/hooks/useDebounce';
import PatientHistoryModal from '@/components/PatientHistoryModal';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import SaveBundleModal from '@/components/SaveBundleModal';
import TextShortcutManagementModal from '@/components/TextShortcutManagementModal';
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/Prescription';
import { GOOGLE_DOCS_TEMPLATE_IDS } from '@/config/constants';

interface TextShortcut {
  id: string;
  shortcut: string;
  expansion: string;
}

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
  instructions_te?: string;
  frequency_te?: string;
  notes_te?: string;
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
  consultation_data: any;
  status: 'pending' | 'completed';
}

const SortableMedicationItem = ({ med, index, handleMedChange, removeMedication, savedMedications, setExtraData, medicationNameInputRef, fetchSavedMedications, i18n }: { med: Medication, index: number, handleMedChange: (index: number, field: keyof Medication, value: any) => void, removeMedication: (index: number) => void, savedMedications: Medication[], setExtraData: React.Dispatch<React.SetStateAction<any>>, medicationNameInputRef: React.RefObject<HTMLInputElement | null>, fetchSavedMedications: () => void, i18n: any }) => {
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

                    setExtraData(prev => {
                      const newMeds = [...prev.medications];
                      newMeds[index] = medToAdd;
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
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [pendingConsultations, setPendingConsultations] = useState<Consultation[]>([]);
  const [completedConsultations, setCompletedConsultations] = useState<Consultation[]>([]);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [formInitialState, setFormInitialState] = useState<any>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [nextConsultation, setNextConsultation] = useState<Consultation | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTimerPausedRef = useRef<boolean>(false);
  const activeTimerIdRef = useRef<string | null>(null);

  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));

  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaveBundleModalOpen, setIsSaveBundleModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [textShortcuts, setTextShortcuts] = useState<TextShortcut[]>([]);

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: '',
    personalNote: '',
    medications: [ ] as Medication[]
  });

  const [suggestedMedications, setSuggestedMedications] = useState<Medication[]>([]);
  const [suggestedAdvice, setSuggestedAdvice] = useState<string[]>([]);
  const [suggestedInvestigations, setSuggestedInvestigations] = useState<string[]>([]);
  const [suggestedFollowup, setSuggestedFollowup] = useState<string[]>([]);

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
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [age, setAge] = useState<number | ''>('');
  const [focusLastMedication, setFocusLastMedication] = useState(false);
  const medicationNameInputRef = useRef<HTMLInputElement | null>(null);
  const patientSelectionCounter = useRef(0);

  const debouncedComplaints = useDebounce(extraData.complaints, 500);
  const debouncedDiagnosis = useDebounce(extraData.diagnosis, 500);
  const translationCache = useRef<any>({ en: {}, te: {} });
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleSaveAndPrint = async () => {
    const saved = await saveChanges();
    if (saved) {
      handlePrint();
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    if (ctrlKey && selectedConsultation) {
      switch (event.key.toLowerCase()) {
        case 'p':
          event.preventDefault();
          submitForm();
          break;
        case 'o':
          event.preventDefault();
          handleOrderNow();
          break;
        case 's':
          event.preventDefault();
          saveChanges();
          break;
        case 'm':
          event.preventDefault();
          addMedication();
          break;
        default:
          break;
      }
    }
  }, [selectedConsultation, extraData, editablePatientDetails]);

  useEffect(() => {
    handleLanguageChange(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = async (lang: string) => {
    const fromLang = lang === 'en' ? 'te' : 'en';

    // Cache the current language's values
    translationCache.current[fromLang] = {
      advice: extraData.advice,
      followup: extraData.followup,
      medications: extraData.medications.map(m => ({
        id: m.id,
        instructions: m.instructions,
        frequency: m.frequency,
        notes: m.notes,
      })),
    };

    // Restore from cache if available
    if (translationCache.current[lang].advice !== undefined) {
      setExtraData(prev => ({
        ...prev,
        advice: translationCache.current[lang].advice,
          followup: translationCache.current[lang].followup,
        medications: prev.medications.map(med => {
          const cachedMed = translationCache.current[lang].medications.find(m => m.id === med.id);
          return cachedMed ? { ...med, ...cachedMed } : med;
        }),
      }));
      return;
    }

    // Translate if not in cache
    if (lang === 'te') {
      setIsTranslating(true);
      try {
        const translate = async (text: string) => {
          if (!text || !text.trim()) return text;
          const { data, error } = await supabase.functions.invoke('translate-content', {
            body: { text, targetLanguage: 'te' },
          });
          if (error) throw error;
          return data?.translatedText || text;
        };

        const newAdvice = await translate(extraData.advice);
        const newFollowup = await translate(extraData.followup);
        const newMedications = await Promise.all(
          extraData.medications.map(async (med) => ({
            ...med,
            instructions: await translate(med.instructions),
            frequency: await translate(med.frequency),
            notes: await translate(med.notes),
          }))
        );

        setExtraData(prev => ({
          ...prev,
          advice: newAdvice,
          followup: newFollowup,
          medications: newMedications,
        }));

      } catch (error) {
        console.error('Translation error:', error);
        toast({ variant: 'destructive', title: 'Translation Error', description: (error as Error).message });
      } finally {
        setIsTranslating(false);
      }
    }
  };

  useEffect(() => {
    if (focusLastMedication && medicationNameInputRef.current) {
      medicationNameInputRef.current.focus();
      setFocusLastMedication(false);
    }
  }, [focusLastMedication, extraData.medications]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const fetchSuggestions = async (text: string) => {
      if (text.trim() === '') return;

      try {
        const { data, error } = await supabase.functions.invoke('get-autofill-medications', {
          body: { text, language: i18n.language },
        });

        if (error) throw error;
        if (!data) return;

        const { medications, advice, investigations, followup } = data;

        if (medications && medications.length > 0) {
          const newMedications = medications.map(med => ({
            ...med,
            id: crypto.randomUUID(),
            freqMorning: med.freq_morning,
            freqNoon: med.freq_noon,
            freqNight: med.freq_night,
          }));

          const existingMedNames = new Set(extraData.medications.map(m => m.name));
          const uniqueNewMeds = newMedications.filter(m => !existingMedNames.has(m.name));

          setSuggestedMedications(prev => {
              const suggestedMedNames = new Set(prev.map(m => m.name));
              const finalNewMeds = uniqueNewMeds.filter(m => !suggestedMedNames.has(m.name));
              return [...prev, ...finalNewMeds];
          });
        }

        if (advice) {
          const adviceItems = advice.split('\n').filter(item => item.trim() !== '');
          const uniqueAdviceItems = adviceItems.filter(item => !extraData.advice.includes(item));

          setSuggestedAdvice(prev => {
            const newItems = uniqueAdviceItems.filter(item => !prev.includes(item));
            return [...prev, ...newItems];
          });
        }

        if (investigations) {
          const investigationItems = investigations.split('\n').filter(item => item.trim() !== '');
          const uniqueInvestigationItems = investigationItems.filter(item => !extraData.investigations.includes(item));

          setSuggestedInvestigations(prev => {
            const newItems = uniqueInvestigationItems.filter(item => !prev.includes(item));
            return [...prev, ...newItems];
          });
        }

        if (followup) {
          const followupItems = followup.split('\n').filter(item => item.trim() !== '');
          const uniqueFollowupItems = followupItems.filter(item => !extraData.followup.includes(item));

          setSuggestedFollowup(prev => {
            const newItems = uniqueFollowupItems.filter(item => !prev.includes(item));
            return [...prev, ...newItems];
          });
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    setSuggestedMedications([]);
    setSuggestedAdvice([]);
    setSuggestedInvestigations([]);
    setSuggestedFollowup([]);

    fetchSuggestions(debouncedComplaints);
    fetchSuggestions(debouncedDiagnosis);
  }, [debouncedComplaints, debouncedDiagnosis, i18n.language]);

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
    fetchTextShortcuts();
  }, []);

  const fetchTextShortcuts = async () => {
    const { data, error } = await supabase
      .from('text_shortcuts')
      .select('id, shortcut, expansion');
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching text shortcuts',
        description: error.message,
      });
    } else {
      setTextShortcuts(data || []);
    }
  };

  const fetchConsultations = async (date: Date, patientIdToRestore?: string) => {
    setIsFetchingConsultations(true);
    if (!patientIdToRestore) {
      setAllConsultations([]);
      setPendingConsultations([]);
      setCompletedConsultations([]);
      setSelectedConsultation(null);
    }
    try {
      const { data, error } = await supabase.functions.invoke('get-consultations-by-date', {
        body: { date: format(date, 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const consultations = data.consultations || [];
      setAllConsultations(consultations);
      setPendingConsultations(consultations.filter(c => c.status === 'pending'));
      setCompletedConsultations(consultations.filter(c => c.status === 'completed'));
      if (patientIdToRestore) {
        const restoredConsultation = consultations.find(c => c.patient.id === patientIdToRestore);
        if (restoredConsultation) {
          setSelectedConsultation(restoredConsultation);
        }
      }
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
    const fetchLastVisitDate = async (patientId: string) => {
      const { data, error } = await supabase
        .from('consultations')
        .select('created_at')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching last visit date:', error);
        setLastVisitDate('First Consultation');
      } else if (!data || data.length === 0) {
        setLastVisitDate('First Consultation');
      } else {
        setLastVisitDate(formatDistanceToNow(new Date(data[0].created_at), { addSuffix: true }));
      }
    };

    if (selectedConsultation) {
      patientSelectionCounter.current += 1;
      if (patientSelectionCounter.current >= 5) {
        if (selectedDate) fetchConsultations(selectedDate, selectedConsultation.patient.id);
        patientSelectionCounter.current = 0;
      }
      setEditablePatientDetails(selectedConsultation.patient);
      fetchLastVisitDate(selectedConsultation.patient.id);
      const newExtraData = selectedConsultation.consultation_data ? {
        ...extraData,
        ...selectedConsultation.consultation_data,
        personalNote: selectedConsultation.consultation_data.personalNote || '',
      } : {
        complaints: '',
        findings: '',
        investigations: '',
        diagnosis: '',
        advice: '',
        followup: '',
        personalNote: '',
        medications: [],
      };
      setExtraData(newExtraData);
      setFormInitialState(JSON.stringify({ ...newExtraData, ...selectedConsultation.patient }));
      setIsFormDirty(false);
      setSuggestedMedications([]);
      setSuggestedAdvice([]);
      setSuggestedInvestigations([]);
      setSuggestedFollowup([]);
      if (selectedConsultation.consultation_data?.language) {
        i18n.changeLanguage(selectedConsultation.consultation_data.language);
      }
      translationCache.current = { en: {}, te: {} };
    } else {
      setEditablePatientDetails(null);
      setLastVisitDate(null);
      setExtraData({
        complaints: '',
        findings: '',
        investigations: '',
        diagnosis: '',
        advice: '',
        followup: '',
        personalNote: '',
        medications: [],
      });
      setIsFormDirty(false);
      setFormInitialState(null);
    }
  }, [selectedConsultation]);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (selectedConsultation && isTimerVisible) {
      if (activeTimerIdRef.current !== selectedConsultation.id) {
        stopTimer();
        setTimerSeconds(0);
        isTimerPausedRef.current = false;
        activeTimerIdRef.current = selectedConsultation.id;
        startTimer();
      } else if (!timerIntervalRef.current && !isTimerPausedRef.current) {
        startTimer();
      }
    } else {
      stopTimer();
    }

    if (!selectedConsultation) {
        setTimerSeconds(0);
        activeTimerIdRef.current = null;
        isTimerPausedRef.current = false;
    }

    return () => {
      stopTimer();
    }
  }, [selectedConsultation, isTimerVisible, startTimer, stopTimer]);

  useEffect(() => {
    if (formInitialState) {
      const isDirty = JSON.stringify({ ...extraData, ...editablePatientDetails }) !== formInitialState;
      setIsFormDirty(isDirty);
    }
  }, [extraData, editablePatientDetails, formInitialState]);

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
    setIsPatientDatePickerOpen(false);
    };

  const handleConsultationDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsConsultationDatePickerOpen(false);
    };

  const handleExtraChange = (field: string, value: string) => {
    // Open shortcut modal
    if ((field === 'complaints' || field === 'diagnosis') && value.includes('//')) {
      setIsShortcutModalOpen(true);
      // Remove the trigger characters from the input
      setExtraData(prev => ({ ...prev, [field]: value.replace('//', '') }));
      return;
    }

    // Handle shortcut replacement for complaints and diagnosis
    if (['complaints', 'diagnosis', 'findings', 'investigations', 'advice', 'personalNote'].includes(field)) {
      const shortcutRegex = /(\s|^)(\w+)\.\s*$/; // Matches a word preceded by space or start, followed by a dot
      const match = value.match(shortcutRegex);

      if (match) {
        const shortcutText = match[2];
        const matchingShortcut = textShortcuts.find(sc => sc.shortcut.toLowerCase() === shortcutText.toLowerCase());

        if (matchingShortcut) {
          const isStartOfSentence = /^\s*$/.test(value.substring(0, match.index));
          let expansion = matchingShortcut.expansion;

          if (isStartOfSentence) {
            expansion = expansion.charAt(0).toUpperCase() + expansion.slice(1);
          }

          const newValue = value.replace(shortcutRegex, match[1] + expansion + ' ');
          setExtraData(prev => ({ ...prev, [field]: newValue }));
          return;
        }
      }
    }


    if (field === 'followup') {
      const shortcutRegex = /(\d+)([dwm])\./i; // d=day, w=week, m=month. Dot is required.
      const match = value.match(shortcutRegex);

      if (match) {
        const shortcut = match[0]; // e.g., "2w."
        const count = parseInt(match[1], 10);
        const unitChar = match[2].toLowerCase();
        let unitKey = '';

        switch (unitChar) {
          case 'd':
            unitKey = count === 1 ? 'day' : 'day_plural';
            break;
          case 'w':
            unitKey = count === 1 ? 'week' : 'week_plural';
            break;
          case 'm':
            unitKey = count === 1 ? 'month' : 'month_plural';
            break;
        }

        if (unitKey) {
          const unitText = t(unitKey);
          const replacementText = t('followup_message_structure', { count, unit: unitText });
          const newValue = value.replace(shortcut, replacementText);
          setExtraData(prev => ({ ...prev, followup: newValue }));
          return;
        }
      }
    }
    setExtraData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectConsultation = (consultation: Consultation) => {
    if (isFormDirty) {
      setNextConsultation(consultation);
      setIsUnsavedModalOpen(true);
    } else {
      setSelectedConsultation(consultation);
    }
  };

  const handleConfirmSave = async () => {
    const success = await saveChanges();
    if (success) {
      setIsUnsavedModalOpen(false);
      if (nextConsultation) {
        setSelectedConsultation(nextConsultation);
      }
    }
  };

  const handleDiscardChanges = () => {
    setIsUnsavedModalOpen(false);
    if (nextConsultation) {
      setSelectedConsultation(nextConsultation);
    }
  };

  const handleAdviceSuggestionClick = (advice: string) => {
    setExtraData(prev => ({
        ...prev,
        advice: [prev.advice, advice].filter(Boolean).join('\n'),
    }));
    setSuggestedAdvice(prev => prev.filter(item => item !== advice));
  };

  const handleInvestigationSuggestionClick = (investigation: string) => {
    setExtraData(prev => ({
        ...prev,
        investigations: [prev.investigations, investigation].filter(Boolean).join('\n'),
    }));
    setSuggestedInvestigations(prev => prev.filter(item => item !== investigation));
    };

  const handleFollowupSuggestionClick = (followup: string) => {
    setExtraData(prev => ({
        ...prev,
        followup: [prev.followup, followup].filter(Boolean).join('\n'),
    }));
    setSuggestedFollowup(prev => prev.filter(item => item !== followup));
    };

  const handleMedicationSuggestionClick = (med: Medication) => {
    const medToAdd = i18n.language === 'te' ? {
      ...med,
      instructions: med.instructions_te || med.instructions,
      frequency: med.frequency_te || med.frequency,
      notes: med.notes_te || med.notes,
    } : med;

      setExtraData(prev => ({
          ...prev,
          medications: [...prev.medications, medToAdd],
      }));
      setSuggestedMedications(prev => prev.filter(item => item.id !== med.id));
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
    setFocusLastMedication(true);
  };

  const removeMedication = (index: number) => {
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const saveChanges = async () => {
    if (!selectedConsultation || !editablePatientDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'No consultation selected.' });
      return false;
    }
    setIsSaving(true);
    try {
      // 1. Update patient details if they have changed
      if (JSON.stringify(selectedConsultation.patient) !== JSON.stringify(editablePatientDetails)) {
        const { error: patientUpdateError } = await supabase
          .from('patients')
          .update({
            name: editablePatientDetails.name,
            dob: editablePatientDetails.dob,
            sex: editablePatientDetails.sex,
            phone: editablePatientDetails.phone,
          })
          .eq('id', editablePatientDetails.id);

        if (patientUpdateError) {
          throw new Error(`Failed to update patient details: ${patientUpdateError.message}`);
        }
      }

      // 2. Save the consultation form data
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ consultation_data: { ...extraData, language: i18n.language } })
        .eq('id', selectedConsultation.id);

      if (updateError) {
        throw new Error(`Failed to save draft: ${updateError.message}`);
      }

      toast({ title: 'Success', description: 'Your changes have been saved.' });

      // After a successful save, update the local state to reflect the changes
      // This prevents incorrect "unsaved changes" warnings.
      const updatedConsultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: { ...extraData, language: i18n.language },
      };
      setSelectedConsultation(updatedConsultation);

      const updateInList = (list: Consultation[]) => list.map(c => c.id === updatedConsultation.id ? updatedConsultation : c);
      setAllConsultations(prev => updateInList(prev));
      setPendingConsultations(prev => updateInList(prev));
      setCompletedConsultations(prev => updateInList(prev));

      // Reset the form's initial state to the current state to prevent false dirty flags.
      setFormInitialState(JSON.stringify({ ...extraData, ...editablePatientDetails }));

      return true;
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderNow = async () => {
    if (!selectedConsultation || !editablePatientDetails) return;
    setIsOrdering(true);
    try {
      const saved = await saveChanges();
      if (!saved) return;

      const payload = {
        templateId: GOOGLE_DOCS_TEMPLATE_IDS.INVESTIGATIONS,
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const submitForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConsultation || !editablePatientDetails) return;
    setIsSubmitting(true);
    try {
      const saved = await saveChanges();
      if (!saved) return;

      const payload = {
        templateId: GOOGLE_DOCS_TEMPLATE_IDS.PRESCRIPTION,
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

      const { error: updateError } = await supabase
        .from('consultations')
        .update({ consultation_data: extraData })
        .eq('id', selectedConsultation.id);

      if (updateError) {
        throw new Error(`Failed to save draft: ${updateError.message}`);
      }

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
        stopTimer();
        isTimerPausedRef.current = true;
        await supabase.from('consultations').update({ status: 'completed' }).eq('id', selectedConsultation.id);
      }

      toast({
        title: "Prescription Generated",
        description: `Prescription for ${editablePatientDetails.name} has been generated.`,
      });

      if(selectedDate) fetchConsultations(selectedDate);

    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate prescription.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-2 sm:p-4">
        <div className="container mx-auto max-w-7xl">
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="flex items-center justify-center gap-3 text-xl sm:text-2xl font-bold text-primary">
                <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
                Doctor's Consultation
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-muted-foreground">
                View pending consultations and manage prescriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                  <div className="lg:col-span-1 space-y-4">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <Label>Consultation Date</Label>
                              <div className="flex items-center gap-2">
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => selectedDate && fetchConsultations(selectedDate)} disabled={isFetchingConsultations}>
                                      {isFetchingConsultations ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                      <span className="sr-only">Refresh</span>
                                  </Button>
                                  <Link to="/consultation-stats">
                                      <BarChart className="w-5 h-5 text-primary hover:text-primary/80" />
                                  </Link>
                              </div>
                          </div>
                          <Popover open={isConsultationDatePickerOpen} onOpenChange={setIsConsultationDatePickerOpen}>
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
                                  onSelect={handleConsultationDateChange}
                                  initialFocus
                                  />
                              </PopoverContent>
                          </Popover>
                      </div>
                      <div className="space-y-4">
                          <div className="font-semibold">
                              Total Consultations: {allConsultations.length}
                          </div>
                          <div>
                              <Label>Pending Consultations: {pendingConsultations.length}</Label>
                              {isFetchingConsultations ? (
                                  <div className="flex justify-center items-center h-32">
                                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                  </div>
                              ) : (
                                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                                      {pendingConsultations.map(c => (
                                           <Button key={c.id} variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleSelectConsultation(c)}>
                                              {c.patient.name}
                                          </Button>
                                      ))}
                                      {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No pending consultations.</p>}
                                  </div>
                              )}
                          </div>
                          <div>
                              <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}>
                                  <Label className="cursor-pointer">Completed Consultations: {completedConsultations.length}</Label>
                                  <ChevronDown className={cn("w-4 h-4 transition-transform", !isCompletedCollapsed && "rotate-180")} />
                              </Button>
                               {isFetchingConsultations ? (
                                  <div className="flex justify-center items-center h-32">
                                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                  </div>
                              ) : (
                                  <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isCompletedCollapsed ? "max-h-0" : "max-h-60")}>
                                      {completedConsultations.map(c => (
                                           <Button key={c.id} variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="w-full justify-start" onClick={() => handleSelectConsultation(c)}>
                                              {c.patient.name}
                                          </Button>
                                      ))}
                                      {completedConsultations.length === 0 && <p className="text-sm text-muted-foreground">No completed consultations.</p>}
                                  </div>
                              )}
                          </div>
                          <div className="flex justify-between items-center mt-4">
                              {isTimerVisible && (
                                  <div className="text-lg font-semibold">
                                      {formatTime(timerSeconds)}
                                  </div>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => setIsTimerVisible(!isTimerVisible)}>
                                  {isTimerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                          </div>
                      </div>
                  </div>

                  <div className="md:col-span-3">
                  {selectedConsultation && editablePatientDetails ? (
                      <form onSubmit={submitForm} className="space-y-6">
                          <div className="space-y-4">
                              <div className="flex flex-wrap items-center justify-between mb-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <User className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-foreground">
                                      Demographic details of {editablePatientDetails.name}
                                    </h3>
                                    {lastVisitDate && (
                                      <span className="text-sm text-muted-foreground">
                                        ({lastVisitDate === 'First Consultation' ? 'First Consultation' : `Last visit: ${lastVisitDate}`})
                                      </span>
                                    )}
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsHistoryModalOpen(true)}>
                                      <History className="h-4 w-4" />
                                      <span className="sr-only">View Patient History</span>
                                    </Button>
                                  </div>
                                  {editablePatientDetails.drive_id && (
                                      <a href={`https://drive.google.com/drive/folders/${editablePatientDetails.drive_id}`} target="_blank" rel="noopener noreferrer">
                                          <Folder className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                                      </a>
                                  )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                  <Label htmlFor="name">Full Name</Label>
                                  <Input id="name" value={editablePatientDetails.name} onChange={e => handlePatientDetailsChange('name', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                  <Label htmlFor="phone">Phone Number</Label>
                                  <Input id="phone" value={editablePatientDetails.phone} onChange={e => handlePatientDetailsChange('phone', e.target.value)} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Popover open={isPatientDatePickerOpen} onOpenChange={setIsPatientDatePickerOpen}>
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
                                        className="w-full sm:w-24"
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

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label htmlFor="complaints" className="text-sm font-medium">Complaints</Label>
                                  <Textarea id="complaints" value={extraData.complaints} onChange={e => handleExtraChange('complaints', e.target.value)} placeholder="Patient complaints..." className="min-h-[100px]" />
                              </div>

                              <div className="space-y-2">
                                  <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                                  <Textarea id="findings" value={extraData.findings} onChange={e => handleExtraChange('findings', e.target.value)} placeholder="Clinical findings..." className="min-h-[100px]" />
                              </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                                        {suggestedInvestigations.map((investigation) => (
                                            <Button key={investigation} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleInvestigationSuggestionClick(investigation)}>
                                                {investigation}
                                            </Button>
                                        ))}
                                    </div>
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
                                      <LanguageSwitcher />
                                      {suggestedAdvice.map((advice) => (
                                          <Button key={advice} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleAdviceSuggestionClick(advice)}>
                                              {advice}
                                          </Button>
                                      ))}
                                  </div>
                                  <Textarea id="advice" value={extraData.advice} onChange={e => handleExtraChange('advice', e.target.value)} placeholder="Medical advice..." className="min-h-[80px]" />
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                          <Stethoscope className="w-5 h-5 text-primary" />
                                          <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                                      </div>
                                      {suggestedMedications.map((med) => (
                                          <Button key={med.id} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleMedicationSuggestionClick(med)}>
                                              {med.name}
                                          </Button>
                                      ))}
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
                                      medicationNameInputRef={index === extraData.medications.length - 1 ? medicationNameInputRef : null}
                                      fetchSavedMedications={fetchSavedMedications}
                                      i18n={i18n}
                                      />
                                  ))}
                                  </SortableContext>
                              </DndContext>
                              </div>
                              <div className="flex justify-end items-center gap-2">
                                  <Button type="button" onClick={addMedication} variant="outline" size="icon" className="rounded-full">
                                      <Plus className="h-4 w-4" />
                                      <span className="sr-only">Add Medication</span>
                                  </Button>
                              </div>

                              <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
                                      {suggestedFollowup.map((followup) => (
                                          <Button key={followup} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleFollowupSuggestionClick(followup)}>
                                              {followup}
                                          </Button>
                                      ))}
                                  </div>
                                  <Textarea id="followup" value={extraData.followup} onChange={e => handleExtraChange('followup', e.target.value)} placeholder="Follow-up instructions..." className="min-h-[80px]" />
                              </div>

                              <div className="space-y-2">
                                  <Label htmlFor="personalNote" className="text-sm font-medium">Doctor's Personal Note</Label>
                                  <Textarea id="personalNote" value={extraData.personalNote} onChange={e => handleExtraChange('personalNote', e.target.value)} placeholder="e.g., Patient seemed anxious, follow up on test results..." className="min-h-[80px]" />
                              </div>
                          </div>

                          <div className="pt-6 flex flex-col sm:flex-row items-center gap-2">
                              <Button type="submit" className="flex-grow h-12 w-full sm:w-auto text-lg font-semibold" disabled={isSubmitting}>
                              {isSubmitting ? (
                                  <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Generating...
                                  </>
                              ) : (
                                  'Generate Prescription'
                              )}
                              </Button>
                              <div className="flex items-center gap-2">
                                  <Button type="button" size="icon" variant="outline" className="h-12 w-12" onClick={handleSaveAndPrint}>
                                      <Printer className="w-5 h-5" />
                                      <span className="sr-only">Save & Print</span>
                                  </Button>
                                  <Button type="button" size="icon" variant="outline" className="h-12 w-12" onClick={() => setIsSaveBundleModalOpen(true)}>
                                      <PackagePlus className="w-5 h-5" />
                                      <span className="sr-only">Save as Bundle</span>
                                  </Button>
                                  <Button type="button" size="icon" className="h-12 w-12" onClick={saveChanges} disabled={isSaving}>
                                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                      <span className="sr-only">Save Changes</span>
                                  </Button>
                              </div>
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
      </div>
      <div className="hidden">
          <div ref={printRef}>
              {selectedConsultation && editablePatientDetails && (
                  <Prescription
                      patient={editablePatientDetails}
                      consultation={extraData}
                      consultationDate={selectedDate || new Date()}
                      age={age}
                  />
              )}
          </div>
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
        <UnsavedChangesModal
          isOpen={isUnsavedModalOpen}
          onConfirm={handleConfirmSave}
          onDiscard={handleDiscardChanges}
        />
        <PatientHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          patientId={selectedConsultation?.patient.id || null}
        />
        <SaveBundleModal
          isOpen={isSaveBundleModalOpen}
          onClose={() => setIsSaveBundleModalOpen(false)}
          medications={extraData.medications}
          advice={extraData.advice}
        />
        <TextShortcutManagementModal
          isOpen={isShortcutModalOpen}
          onClose={() => setIsShortcutModalOpen(false)}
          onUpdate={fetchTextShortcuts}
        />
    </>
  );
};

export default Consultation;
