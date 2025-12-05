
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Link } from 'react-router-dom';
import { offlineStore } from '@/lib/local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Stethoscope, X, GripVertical, Plus, Printer, Languages, Folder, BarChart, Save, ChevronDown, Star, RefreshCw, Eye, EyeOff, History, PackagePlus, UserPlus, MoreVertical, CloudOff, Search, MapPin, Trash2, Syringe, Share } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { cn, cleanConsultationData } from '@/lib/utils';
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
import { MedicalCertificate } from '@/components/MedicalCertificate';
import MedicalCertificateModal, { CertificateData } from '@/components/MedicalCertificateModal';
import { Receipt } from '@/components/Receipt';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { GOOGLE_DOCS_TEMPLATE_IDS, HOSPITALS } from '@/config/constants';
import { getDistance } from '@/lib/geolocation';
import ConsultationRegistration from '@/components/ConsultationRegistration';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { PatientConflictModal } from '@/components/PatientConflictModal';
import { ConsultationSearchModal } from '@/components/ConsultationSearchModal';
import { Checkbox } from '@/components/ui/checkbox';

interface TextShortcut {
  id: string;
  shortcut: string;
  expansion: string;
}

const processTextShortcuts = (
  currentValue: string,
  cursorPosition: number,
  shortcuts: TextShortcut[]
): { newValue: string, newCursorPosition: number } | null => {
  const textBeforeCursor = currentValue.substring(0, cursorPosition);

  // Check for 3 spaces shortcut
  if (textBeforeCursor.endsWith('   ')) {
    const textBeforeContent = currentValue.substring(0, cursorPosition - 3);
    const textAfter = currentValue.substring(cursorPosition);
    const newValue = textBeforeContent + '. ' + textAfter;
    const newCursorPosition = textBeforeContent.length + 2;
    return { newValue, newCursorPosition };
  }

  const shortcutRegex = /(^|\s|\n|\.\s)([a-zA-Z0-9_]+)\.\s$/;
  const match = textBeforeCursor.match(shortcutRegex);

  if (match) {
    const prefix = match[1] || '';
    const shortcutText = match[2];
    const matchingShortcut = shortcuts.find(
      (sc) => sc.shortcut.toLowerCase() === shortcutText.toLowerCase()
    );

    if (matchingShortcut) {
      const fullMatch = match[0];
      const startOfShortcutInValue = cursorPosition - fullMatch.length;
      const textBeforeContent = currentValue.substring(0, startOfShortcutInValue);

      const shouldCapitalize = /^\s*$/.test(textBeforeContent) || prefix.includes('\n') || prefix.includes('.');

      let expansion = matchingShortcut.expansion;
      if (shouldCapitalize) {
        expansion = expansion.charAt(0).toUpperCase() + expansion.slice(1);
      }

      const textAfter = currentValue.substring(cursorPosition);

      const newValue = textBeforeContent + prefix + expansion + ' ' + textAfter;
      const newCursorPosition = (textBeforeContent + prefix + expansion).length + 1;

      return { newValue, newCursorPosition };
    }
  }

  return null;
};

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
  status: string;
  created_at: string;
  visit_type?: string;
  patient: Patient;
  consultation_data?: any;
}

const SortableMedicationItem = ({ med, index, handleMedChange, removeMedication, savedMedications, setExtraData, medicationNameInputRef, fetchSavedMedications, i18n, medFrequencyRefs, medDurationRefs, medInstructionsRefs, medNotesRefs }: { med: Medication, index: number, handleMedChange: (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => void, removeMedication: (index: number) => void, savedMedications: Medication[], setExtraData: React.Dispatch<React.SetStateAction<any>>, medicationNameInputRef: React.RefObject<HTMLInputElement | null>, fetchSavedMedications: () => void, i18n: any, medFrequencyRefs: React.RefObject<{ [key: string]: HTMLTextAreaElement | null }>, medDurationRefs: React.RefObject<{ [key: string]: HTMLInputElement | null }>, medInstructionsRefs: React.RefObject<{ [key: string]: HTMLInputElement | null }>, medNotesRefs: React.RefObject<{ [key: string]: HTMLInputElement | null }> }) => {
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
                ref={el => medFrequencyRefs.current[`${index}.frequency`] = el}
                value={med.frequency}
                onChange={e => handleMedChange(index, 'frequency', e.target.value, e.target.selectionStart)}
                placeholder="e.g., once a week"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            }
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duration</Label>
              <Input
                ref={el => medDurationRefs.current[`${index}.duration`] = el}
                value={med.duration}
                onChange={e => handleMedChange(index, 'duration', e.target.value, e.target.selectionStart)}
                placeholder="e.g., 7 days"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instructions</Label>
              <Input
                ref={el => medInstructionsRefs.current[`${index}.instructions`] = el}
                value={med.instructions}
                onChange={e => handleMedChange(index, 'instructions', e.target.value, e.target.selectionStart)}
                placeholder="Special instructions"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Input
              ref={el => medNotesRefs.current[`${index}.notes`] = el}
              value={med.notes}
              onChange={e => handleMedChange(index, 'notes', e.target.value, e.target.selectionStart)}
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
  const isOnline = useOnlineStatus();
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [isEvaluationCollapsed, setIsEvaluationCollapsed] = useState(true);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [initialPatientDetails, setInitialPatientDetails] = useState<Patient | null>(null);
  const [initialExtraData, setInitialExtraData] = useState<any>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [nextConsultation, setNextConsultation] = useState<Consultation | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTimerPausedRef = useRef<boolean>(false);
  const activeTimerIdRef = useRef<string | null>(null);
  const ignoreLanguageChangeRef = useRef(false);

  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));

  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaveBundleModalOpen, setIsSaveBundleModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [conflictData, setConflictData] = useState<{ local: any; server: any, consultationId: string } | null>(null);
  const [patientConflictData, setPatientConflictData] = useState<{ offlinePatient: any; conflictingPatients: any[], consultationId: string } | null>(null);
  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [textShortcuts, setTextShortcuts] = useState<TextShortcut[]>([]);
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [isOnlyConsultation, setIsOnlyConsultation] = useState(false);
  const [deletePatientAlso, setDeletePatientAlso] = useState(false);

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: '',
    personalNote: '',
    medications: [] as Medication[],
    procedure: '',
    referred_to: '',
    visit_type: 'free'
  });

  const [suggestedMedications, setSuggestedMedications] = useState<Medication[]>([]);
  const [suggestedAdvice, setSuggestedAdvice] = useState<string[]>([]);
  const [suggestedInvestigations, setSuggestedInvestigations] = useState<string[]>([]);
  const [suggestedFollowup, setSuggestedFollowup] = useState<string[]>([]);
  const [referralDoctors, setReferralDoctors] = useState<{ id: string, name: string, specialization?: string, address?: string, phone?: string }[]>([]);
  const [autofillKeywords, setAutofillKeywords] = useState<any[]>([]);
  const [processedAutofillKeywords, setProcessedAutofillKeywords] = useState<any[]>([]);

  const cleanedConsultationData = React.useMemo(() => cleanConsultationData(extraData), [extraData]);

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
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerateDocEnabled, setIsGenerateDocEnabled] = useState(() => {
    const storedValue = localStorage.getItem('isGenerateDocEnabled');
    return storedValue !== null ? JSON.parse(storedValue) : false;
  });
  const isGenerateDocEnabledRef = useRef(isGenerateDocEnabled);
  const [selectedHospital, setSelectedHospital] = useState(() => {
    const storedHospital = localStorage.getItem('selectedHospital');
    return HOSPITALS.find(h => h.name === storedHospital) || HOSPITALS[0];
  });

  const filteredConsultations = React.useMemo(() => {
    return allConsultations.filter(c => !c.consultation_data?.location || c.consultation_data.location === selectedHospital.name);
  }, [allConsultations, selectedHospital]);

  const pendingConsultations = React.useMemo(() => filteredConsultations.filter(c => c.status === 'pending'), [filteredConsultations]);
  const evaluationConsultations = React.useMemo(() => filteredConsultations.filter(c => c.status === 'under_evaluation'), [filteredConsultations]);
  const completedConsultations = React.useMemo(() => filteredConsultations.filter(c => c.status === 'completed'), [filteredConsultations]);
  const [isGpsEnabled, setIsGpsEnabled] = useState(() => {
    const storedValue = localStorage.getItem('isGpsEnabled');
    return storedValue !== null ? JSON.parse(storedValue) : true;
  });

  useEffect(() => {
    localStorage.setItem('isGpsEnabled', JSON.stringify(isGpsEnabled));
  }, [isGpsEnabled]);

  useEffect(() => {
    if (isGpsEnabled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            let closestHospital = HOSPITALS[0];
            let minDistance = Infinity;

            HOSPITALS.forEach(hospital => {
              const distance = getDistance(latitude, longitude, hospital.lat, hospital.lng);
              if (distance < minDistance) {
                minDistance = distance;
                closestHospital = hospital;
              }
            });
            setSelectedHospital(closestHospital);
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Fallback to default if GPS is on but fails
            const storedHospital = localStorage.getItem('selectedHospital');
            const foundHospital = HOSPITALS.find(h => h.name === storedHospital) || HOSPITALS[0];
            setSelectedHospital(foundHospital);
          }
        );
      }
    }
  }, [isGpsEnabled]);

  useEffect(() => {
    // Only save to localStorage if GPS is disabled (i.e., manual selection)
    if (!isGpsEnabled) {
      localStorage.setItem('selectedHospital', selectedHospital.name);
    }
  }, [selectedHospital, isGpsEnabled]);

  useEffect(() => {
    localStorage.setItem('isGenerateDocEnabled', JSON.stringify(isGenerateDocEnabled));
    isGenerateDocEnabledRef.current = isGenerateDocEnabled;
  }, [isGenerateDocEnabled]);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);
  const [age, setAge] = useState<number | ''>('');
  const [focusLastMedication, setFocusLastMedication] = useState(false);
  const medicationNameInputRef = useRef<HTMLInputElement | null>(null);
  const patientSelectionCounter = useRef(0);

  const debouncedComplaints = useDebounce(extraData.complaints, 500);
  const debouncedDiagnosis = useDebounce(extraData.diagnosis, 500);
  const translationCache = useRef<any>({ en: {}, te: {} });
  const printRef = useRef(null);
  const certificatePrintRef = useRef(null);
  const receiptPrintRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState<{ [key: string]: number }>({});
  const complaintsRef = useRef<HTMLTextAreaElement>(null);
  const findingsRef = useRef<HTMLTextAreaElement>(null);
  const investigationsRef = useRef<HTMLTextAreaElement>(null);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const adviceRef = useRef<HTMLTextAreaElement>(null);
  const followupRef = useRef<HTMLTextAreaElement>(null);
  const personalNoteRef = useRef<HTMLTextAreaElement>(null);
  const procedureRef = useRef<HTMLTextAreaElement>(null);
  const referredToRef = useRef<HTMLInputElement>(null);
  const medFrequencyRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const medDurationRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medInstructionsRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medNotesRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});


  const [isReadyToPrintCertificate, setIsReadyToPrintCertificate] = useState(false);
  const [isReadyToPrintReceipt, setIsReadyToPrintReceipt] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrintCertificate = useReactToPrint({
    contentRef: certificatePrintRef,
  });

  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptPrintRef,
  });

  useEffect(() => {
    if (isReadyToPrint) {
      handlePrint();
      setIsReadyToPrint(false);
    }
  }, [isReadyToPrint, handlePrint]);

  useEffect(() => {
    if (isReadyToPrintCertificate) {
      handlePrintCertificate();
      setIsReadyToPrintCertificate(false);
      setCertificateData(null);
    }
  }, [isReadyToPrintCertificate, handlePrintCertificate]);

  useEffect(() => {
    if (isReadyToPrintReceipt) {
      handlePrintReceipt();
      setIsReadyToPrintReceipt(false);
      setReceiptData(null);
    }
  }, [isReadyToPrintReceipt, handlePrintReceipt]);

  useEffect(() => {
    Object.keys(cursorPosition).forEach(field => {
      const position = cursorPosition[field];
      if (position === undefined) return;

      let element: HTMLTextAreaElement | HTMLInputElement | null = null;

      if (field.startsWith('medications')) {
        const [, index, medField] = field.split('.');
        const key = `${index}.${medField}`;
        if (medField === 'frequency' && medFrequencyRefs.current[key]) {
          element = medFrequencyRefs.current[key];
        } else if (medField === 'duration' && medDurationRefs.current[key]) {
          element = medDurationRefs.current[key];
        } else if (medField === 'instructions' && medInstructionsRefs.current[key]) {
          element = medInstructionsRefs.current[key];
        } else if (medField === 'notes' && medNotesRefs.current[key]) {
          element = medNotesRefs.current[key];
        }
      } else {
        switch (field) {
          case 'complaints': element = complaintsRef.current; break;
          case 'findings': element = findingsRef.current; break;
          case 'investigations': element = investigationsRef.current; break;
          case 'diagnosis': element = diagnosisRef.current; break;
          case 'advice': element = adviceRef.current; break;
          case 'followup': element = followupRef.current; break;
          case 'personalNote': element = personalNoteRef.current; break;
          case 'procedure': element = procedureRef.current; break;
          case 'referred_to': element = referredToRef.current; break;
        }
      }

      if (element) {
        element.selectionStart = element.selectionEnd = position;
        // Reset the cursor position for this field to avoid re-applying
        setCursorPosition(prev => ({ ...prev, [field]: undefined }));
      }
    });
  }, [extraData, cursorPosition]);

  const handleSaveAndPrint = async () => {
    const saved = await saveChanges({ markAsCompleted: true });
    if (saved) {
      if (isGenerateDocEnabledRef.current) {
        submitForm(undefined, { skipSave: true });
      }
      setIsReadyToPrint(true);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isModifierActive = isMac ? event.metaKey : event.ctrlKey;

    if (!isModifierActive) return;

    const key = event.key.toLowerCase();

    const actions: Record<string, () => void> = {
      'f': () => setIsSearchModalOpen(true),
      'n': () => setIsRegistrationModalOpen(true),
    };

    if (selectedConsultation) {
      Object.assign(actions, {
        'p': handleSaveAndPrint,
        's': saveChanges,
        'm': addMedication,
      });
    }

    const action = actions[key];
    if (action) {
      event.preventDefault();
      action();
    }
  }, [selectedConsultation, extraData, editablePatientDetails]);

  useEffect(() => {
    if (ignoreLanguageChangeRef.current) {
      ignoreLanguageChangeRef.current = false;
      return;
    }
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
    const fetchSuggestions = (text: string) => {
      if (!text || text.trim() === '') {
        setSuggestedMedications([]);
        setSuggestedAdvice([]);
        setSuggestedInvestigations([]);
        setSuggestedFollowup([]);
        return;
      }

      const cleanedText = text.toLowerCase().replace(/[.,?;]/g, '');
      const inputTextWords = new Set(cleanedText.split(/\s+/));
      const medicationIds = new Set<number>();
      const adviceTexts = new Set<string>();
      const investigationTexts = new Set<string>();
      const followupTexts = new Set<string>();

      const adviceColumn = i18n.language === 'te' ? 'advice_te' : 'advice';
      const followupColumn = i18n.language === 'te' ? 'followup_te' : 'followup';

      for (const mapping of processedAutofillKeywords) {
        if (mapping.processedKeywords) {
          for (const { cleaned: cleanedKeyword } of mapping.processedKeywords) {
            let isMatch = false;

            if (cleanedKeyword.includes(' ')) {
              if (cleanedText.includes(cleanedKeyword)) {
                isMatch = true;
              }
            } else {
              if (inputTextWords.has(cleanedKeyword)) {
                isMatch = true;
              }
            }

            if (isMatch) {
              for (const id of mapping.medication_ids) {
                medicationIds.add(id);
              }
              const advice = mapping[adviceColumn];
              if (advice) {
                adviceTexts.add(advice);
              }
              const investigations = mapping['investigations'];
              if (investigations) {
                investigationTexts.add(investigations);
              }
              const followup = mapping[followupColumn];
              if (followup) {
                followupTexts.add(followup);
              }
              break;
            }
          }
        }
      }

      const existingMedNames = new Set(extraData.medications.map(m => m.name));
      const medications = savedMedications.filter(med => medicationIds.has(med.id) && !existingMedNames.has(med.name));
      setSuggestedMedications(medications);

      const processSuggestions = (texts: Set<string>, currentText: string) => {
        const allItems = Array.from(texts).flatMap(text => text.split('\n'));
        const uniqueItems = Array.from(new Set(allItems)).filter(item => item.trim() !== '');
        return uniqueItems.filter(item => !currentText.includes(item));
      };

      setSuggestedAdvice(processSuggestions(adviceTexts, extraData.advice));
      setSuggestedInvestigations(processSuggestions(investigationTexts, extraData.investigations));
      setSuggestedFollowup(processSuggestions(followupTexts, extraData.followup));
    };

    const debounceFetch = setTimeout(() => {
      fetchSuggestions(extraData.complaints + ' ' + extraData.diagnosis);
    }, 500);

    return () => clearTimeout(debounceFetch);
  }, [extraData.complaints, extraData.diagnosis, i18n.language, processedAutofillKeywords, savedMedications]);

  useEffect(() => {
    const fetchReferralDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('referral_doctors')
          .select('id, name, specialization, address, phone')
          .order('name');

        if (error) throw error;
        if (data) {
          setReferralDoctors(data);
        }
      } catch (error) {
        console.error('Error fetching referral doctors:', error);
      }
    };

    const fetchAutofillKeywords = async () => {
      const { data, error } = await supabase
        .from('autofill_keywords')
        .select('*');
      if (error) {
        console.error('Error fetching autofill keywords:', error);
      } else {
        setAutofillKeywords(data || []);
        if (data) {
          const processed = data.map(mapping => ({
            ...mapping,
            processedKeywords: mapping.keywords ? mapping.keywords.map((k: string) => ({
              original: k,
              cleaned: k.toLowerCase().replace(/[.,?;]/g, '')
            })) : []
          }));
          setProcessedAutofillKeywords(processed);
        }
      }
    };

    // Fetch referral doctors and autofill keywords once on mount
    fetchReferralDoctors();
    fetchAutofillKeywords();
  }, []);

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
      setSavedMedications(data.map(d => ({ ...d, freqMorning: d.freq_morning, freqNoon: d.freq_noon, freqNight: d.freq_night })));
    }
  };

  useEffect(() => {
    fetchSavedMedications();
    fetchTextShortcuts();
  }, []);

  useEffect(() => {
    const syncOfflineData = async () => {
      if (isOnline) {
        const keys = await offlineStore.keys();
        setPendingSyncIds(keys);
        if (keys.length > 0) {
          toast({ title: 'Syncing...', description: `Syncing ${keys.length} locally saved consultations.` });
          for (const key of keys) {
            try {
              const offlineData = await offlineStore.getItem(key) as any;
              if (!offlineData) continue;

              if (offlineData.type === 'new_patient') {
                console.log("Syncing new patient:", offlineData.patient.name);

                const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
                  body: {
                    name: offlineData.patient.name,
                    dob: offlineData.patient.dob,
                    sex: offlineData.patient.sex,
                    phone: offlineData.patient.phone,
                    force: false,
                  },
                });

                if (error) throw new Error(error.message);

                if (data.status === 'success') {
                  await offlineStore.removeItem(key);
                  setPendingSyncIds(prev => prev.filter(id => id !== key));
                } else if (data.status === 'partial_match' || data.status === 'exact_match') {
                  setPatientConflictData({
                    offlinePatient: offlineData.patient,
                    conflictingPatients: data.matches || [data.patient],
                    consultationId: key,
                  });
                  return;
                }
              } else {
                const { data: serverConsultation, error } = await supabase
                  .from('consultations')
                  .select('*, patient:patients(*)')
                  .eq('id', key)
                  .single();

                if (error) {
                  if (error.code === 'PGRST116') { // "The result contains 0 rows"
                    console.warn(`Consultation with ID ${key} not found on server. It might have been deleted.`);
                    await offlineStore.removeItem(key);
                    setPendingSyncIds(prev => prev.filter(id => id !== key));
                    continue;
                  }
                  throw error;
                }

                const localTimestamp = new Date(offlineData.timestamp);
                const serverTimestamp = new Date(serverConsultation.updated_at);

                if (serverTimestamp > localTimestamp) {
                  setConflictData({ local: offlineData, server: serverConsultation, consultationId: key });
                  return;
                } else {
                  const { patientDetails, extraData, status } = offlineData;

                  const { error: patientUpdateError } = await supabase
                    .from('patients')
                    .update({
                      name: patientDetails.name,
                      dob: patientDetails.dob,
                      sex: patientDetails.sex,
                      phone: patientDetails.phone,
                    })
                    .eq('id', patientDetails.id);
                  if (patientUpdateError) throw new Error(`Patient sync failed: ${patientUpdateError.message}`);

                  const { error: consultationUpdateError } = await supabase
                    .from('consultations')
                    .update({
                      consultation_data: extraData,
                      status: status,
                    })
                    .eq('id', key);
                  if (consultationUpdateError) throw new Error(`Consultation sync failed: ${consultationUpdateError.message}`);

                  if (status === 'completed' && serverConsultation.status !== 'completed') {
                    sendConsultationCompletionNotification(patientDetails.name, patientDetails.phone);
                  }
                }

                await offlineStore.removeItem(key);
                setPendingSyncIds(prev => prev.filter(id => id !== key));
              }
            } catch (error) {
              console.error('Sync error for consultation', key, error);
              toast({ variant: 'destructive', title: 'Sync Error', description: `Failed to sync consultation for ${key}.` });
            }
          }
          toast({ title: 'Sync Complete', description: 'All local changes have been synced.' });
          if (selectedDate) fetchConsultations(selectedDate);
        }
      }
    };

    if (!conflictData) {
      syncOfflineData();
    }
  }, [isOnline, conflictData]);

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

  const fetchConsultations = async (date: Date, patientIdToRestore?: string, consultationData?: any) => {
    setIsFetchingConsultations(true);
    if (!patientIdToRestore) {
      setAllConsultations([]);
      setSelectedConsultation(null);
    }
    try {
      const { data, error } = await supabase.functions.invoke('get-consultations', {
        body: { date: format(date, 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const consultations = data.consultations || [];
      setAllConsultations(consultations);
      if (patientIdToRestore) {
        const restoredConsultation = consultations.find(c => c.patient.id === patientIdToRestore);
        if (restoredConsultation) {
          if (consultationData) {
            restoredConsultation.consultation_data = {
              ...restoredConsultation.consultation_data,
              ...consultationData
            };
          }
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
      const defaultExtraData = {
        complaints: '',
        findings: '',
        investigations: '',
        diagnosis: '',
        advice: '',
        followup: '',
        personalNote: '',
        medications: [],
        visit_type: 'free',
      };

      const newExtraData = selectedConsultation.consultation_data ? {
        ...defaultExtraData,
        ...selectedConsultation.consultation_data,
        personalNote: selectedConsultation.consultation_data.personalNote || '',
        visit_type: selectedConsultation.visit_type || selectedConsultation.consultation_data.visit_type || 'free',
      } : defaultExtraData;
      setExtraData(newExtraData);
      setInitialExtraData(newExtraData);
      setInitialPatientDetails(selectedConsultation.patient);
      setIsFormDirty(false);
      setSuggestedMedications([]);
      setSuggestedAdvice([]);
      setSuggestedInvestigations([]);
      setSuggestedFollowup([]);
      if (selectedConsultation.consultation_data?.language) {
        if (i18n.language !== selectedConsultation.consultation_data.language) {
          ignoreLanguageChangeRef.current = true;
          i18n.changeLanguage(selectedConsultation.consultation_data.language);
        }
      }
      if (selectedConsultation.consultation_data?.location) {
        const hospital = HOSPITALS.find(h => h.name === selectedConsultation.consultation_data.location);
        if (hospital) setSelectedHospital(hospital);
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
        visit_type: 'free',
      });
      setIsFormDirty(false);
      setInitialPatientDetails(null);
      setInitialExtraData(null);
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
    if (initialPatientDetails && initialExtraData) {
      const isDirty = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails) ||
        JSON.stringify(extraData) !== JSON.stringify(initialExtraData);
      setIsFormDirty(isDirty);
    }
  }, [extraData, editablePatientDetails, initialPatientDetails, initialExtraData]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isFormDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty]);

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

  const handleExtraChange = (field: string, value: any, cursorPosition: number | null = null) => {
    let newValue = value;
    let newCursorPosition = cursorPosition;

    // Handle shortcut modal trigger
    if ((field === 'complaints' || field === 'diagnosis') && typeof value === 'string' && value.includes('//')) {
      setIsShortcutModalOpen(true);
      newValue = value.replace('//', '');
    }

    // Process text shortcuts for relevant fields
    if (typeof value === 'string' && cursorPosition !== null) {
      const shortcutResult = processTextShortcuts(value, cursorPosition, textShortcuts);
      if (shortcutResult) {
        newValue = shortcutResult.newValue;
        newCursorPosition = shortcutResult.newCursorPosition;
      }
    }

    // Handle followup date shortcuts
    if (field === 'followup' && typeof newValue === 'string') {
      const shortcutRegex = /(\d+)([dwm])\./i; // d=day, w=week, m=month. Dot is required.
      const match = newValue.match(shortcutRegex);

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
          const expandedText = t('followup_message_structure', { count, unit: unitText });
          const shortcutIndex = newValue.indexOf(shortcut);
          newValue = newValue.replace(shortcut, expandedText);
          if (shortcutIndex !== -1) {
            newCursorPosition = shortcutIndex + expandedText.length;
          }
        }
      }
    }

    setExtraData(prev => ({ ...prev, [field]: newValue }));
    setIsFormDirty(true);

    if (newCursorPosition !== null) {
      setCursorPosition(prev => ({ ...prev, [field]: newCursorPosition }));
    }
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
    const newValue = [extraData.advice, advice].filter(Boolean).join('\n');
    setExtraData(prev => ({
      ...prev,
      advice: newValue,
    }));
    setCursorPosition(prev => ({ ...prev, advice: newValue.length }));
    setSuggestedAdvice(prev => prev.filter(item => item !== advice));
  };

  const handleInvestigationSuggestionClick = (investigation: string) => {
    const newValue = [extraData.investigations, investigation].filter(Boolean).join('\n');
    setExtraData(prev => ({
      ...prev,
      investigations: newValue,
    }));
    setCursorPosition(prev => ({ ...prev, investigations: newValue.length }));
    setSuggestedInvestigations(prev => prev.filter(item => item !== investigation));
  };

  const handleFollowupSuggestionClick = (followup: string) => {
    const newValue = [extraData.followup, followup].filter(Boolean).join('\n');
    setExtraData(prev => ({
      ...prev,
      followup: newValue,
    }));
    setCursorPosition(prev => ({ ...prev, followup: newValue.length }));
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

  const handleMedChange = (
    index: number,
    field: keyof Medication,
    value: string | boolean,
    cursorPosition: number | null = null
  ) => {
    if (field === 'name' && typeof value === 'string' && value.startsWith('//')) {
      setIsMedicationsModalOpen(true);
      setExtraData(prev => {
        const newMeds = [...prev.medications];
        newMeds[index] = { ...newMeds[index], name: '' };
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

    if (
      (field === 'frequency' || field === 'duration' || field === 'instructions' || field === 'notes') &&
      typeof value === 'string' &&
      cursorPosition !== null
    ) {
      const shortcutResult = processTextShortcuts(value, cursorPosition, textShortcuts);
      if (shortcutResult) {
        setExtraData(prev => {
          const newMeds = [...prev.medications];
          newMeds[index] = { ...newMeds[index], [field]: shortcutResult.newValue };
          return { ...prev, medications: newMeds };
        });
        setCursorPosition({ [`medications.${index}.${field}`]: shortcutResult.newCursorPosition });
        return;
      }
    }

    setExtraData(prev => {
      const newMeds = [...prev.medications];
      newMeds[index] = { ...newMeds[index], [field]: value };
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

  const sendConsultationCompletionNotification = async (patientName: string, patientPhone: string) => {
    try {
      const isTelugu = i18n.language === 'te';
      const message = isTelugu
        ? `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/prescription/${patientPhone}\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు\n- మందులు 💊 & పరీక్షలు 🧪 ఆర్డర్ చేయవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`
        : `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/prescription/${patientPhone}\n\n- Read diet 🍚 & exercise 🧘‍♀️ advice \n- Order medicines 💊 & tests 🧪 at-\n\nhttps://ortho.life/p/${patientPhone}`;

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { number: patientPhone, message },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to send WhatsApp notification:', err);
    }
  };

  const saveChanges = async (options: { markAsCompleted?: boolean } = {}) => {
    if (!selectedConsultation || !editablePatientDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'No consultation selected.' });
      return false;
    }

    const patientDetailsChanged = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails);
    const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);
    const locationChanged = selectedHospital.name !== (initialExtraData?.location || HOSPITALS[0].name);

    const isPrinting = options.markAsCompleted;
    const hasMedsOrFollowup = extraData.medications.length > 0 || (extraData.followup && extraData.followup.trim() !== '');

    let newStatus = selectedConsultation.status;
    if (isPrinting) {
      newStatus = hasMedsOrFollowup ? 'completed' : 'under_evaluation';
    }
    const statusChanged = newStatus !== selectedConsultation.status;

    if (!patientDetailsChanged && !extraDataChanged && !statusChanged && !locationChanged) {
      toast({ title: 'No Changes', description: 'No new changes to save.' });
      return true; // No changes, but operation is "successful"
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...extraData,
        language: i18n.language,
        location: selectedHospital.name
      };

      if (!isOnline) {
        const offlineData = {
          patientDetails: editablePatientDetails,
          extraData: dataToSave,
          status: newStatus,
          timestamp: new Date().toISOString(),
        };
        await offlineStore.setItem(selectedConsultation.id, offlineData);
        setPendingSyncIds(prev => [...new Set([...prev, selectedConsultation.id])]);
        toast({ title: 'Saved Locally', description: 'Changes will sync when online.' });
      } else {
        if (patientDetailsChanged) {
          const { error: patientUpdateError } = await supabase
            .from('patients')
            .update({
              name: editablePatientDetails.name,
              dob: editablePatientDetails.dob,
              sex: editablePatientDetails.sex,
              phone: editablePatientDetails.phone,
            })
            .eq('id', editablePatientDetails.id);
          if (patientUpdateError) throw new Error(`Failed to update patient details: ${patientUpdateError.message}`);
        }

        const consultationUpdatePayload: { consultation_data?: any, status?: string, visit_type?: string } = {};

        if (extraDataChanged || locationChanged) {
          consultationUpdatePayload.consultation_data = dataToSave;
          consultationUpdatePayload.visit_type = extraData.visit_type;
        }
        if (statusChanged) {
          consultationUpdatePayload.status = newStatus;
          if (newStatus === 'completed') {
            stopTimer();
            isTimerPausedRef.current = true;
          }
        }

        if (Object.keys(consultationUpdatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('consultations')
            .update(consultationUpdatePayload)
            .eq('id', selectedConsultation.id);
          if (updateError) throw new Error(`Failed to save consultation data: ${updateError.message}`);
        }

        if (statusChanged && newStatus === 'completed' && selectedConsultation.status !== 'completed') {
          sendConsultationCompletionNotification(editablePatientDetails.name, editablePatientDetails.phone);
        }

        await offlineStore.removeItem(selectedConsultation.id);
        setPendingSyncIds(prev => prev.filter(id => id !== selectedConsultation.id));
        toast({ title: 'Success', description: 'Your changes have been saved.' });
      }

      const updatedConsultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: { ...extraData, language: i18n.language },
        visit_type: extraData.visit_type,
        status: newStatus as 'pending' | 'completed' | 'under_evaluation',
      };

      setSelectedConsultation(updatedConsultation);
      setInitialPatientDetails(editablePatientDetails);
      setInitialExtraData(extraData);

      const updatedAllConsultations = allConsultations.map(c =>
        c.id === updatedConsultation.id ? updatedConsultation : c
      );
      setAllConsultations(updatedAllConsultations);

      return true;
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleResolveConflict = async (resolution: 'local' | 'server') => {
    if (!conflictData) return;

    const { consultationId, local } = conflictData;
    if (resolution === 'server') {
      await offlineStore.removeItem(consultationId);
    } else { // local
      const { patientDetails, extraData, status } = local;

      const { error: patientUpdateError } = await supabase
        .from('patients')
        .update({ name: patientDetails.name, dob: patientDetails.dob, sex: patientDetails.sex, phone: patientDetails.phone })
        .eq('id', patientDetails.id);
      if (patientUpdateError) throw new Error(`Patient sync failed: ${patientUpdateError.message}`);

      const { error: consultationUpdateError } = await supabase
        .from('consultations')
        .update({ consultation_data: extraData, status: status })
        .eq('id', consultationId);
      if (consultationUpdateError) throw new Error(`Consultation sync failed: ${consultationUpdateError.message}`);

      await offlineStore.removeItem(consultationId);
    }

    setPendingSyncIds(prev => prev.filter(id => id !== consultationId));
    setConflictData(null); // This will re-trigger the sync useEffect
  };

  const handleResolvePatientConflict = async (resolution: 'new' | { mergeWith: number }) => {
    if (!patientConflictData) return;
    const { consultationId, offlinePatient } = patientConflictData;

    let patientIdToUse;

    if (resolution === 'new') {
      const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
        body: { ...offlinePatient, force: true },
      });
      if (error) throw new Error(error.message);
      patientIdToUse = data.consultation.patient_id;
    } else {
      patientIdToUse = resolution.mergeWith;
    }

    // Now create a consultation for the resolved patient
    const offlineConsultationData = (await offlineStore.getItem(consultationId) as any).consultation;

    const { error: consultationError } = await supabase
      .from('consultations')
      .insert({
        patient_id: patientIdToUse,
        consultation_data: offlineConsultationData.consultation_data,
        status: 'pending'
      });

    if (consultationError) throw new Error(consultationError.message);

    await offlineStore.removeItem(consultationId);
    setPendingSyncIds(prev => prev.filter(id => id !== consultationId));
    setPatientConflictData(null); // This will re-trigger the sync
  };

  const submitForm = async (e?: React.FormEvent, options: { skipSave?: boolean } = {}) => {
    if (e) e.preventDefault();
    if (!selectedConsultation || !editablePatientDetails || !isGenerateDocEnabledRef.current) return;
    setIsSubmitting(true);
    try {
      if (!options.skipSave) {
        const saved = await saveChanges();
        if (!saved) {
          setIsSubmitting(false);
          return;
        }
      }

      const templateId = selectedHospital.name === 'OrthoLife' ? GOOGLE_DOCS_TEMPLATE_IDS.ORTHOLIFE_PRESCRIPTION : GOOGLE_DOCS_TEMPLATE_IDS.BADAM_PRESCRIPTION;

      const payload = {
        templateId,
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

      if (data?.driveId && editablePatientDetails && !editablePatientDetails.drive_id) {
        const newPatientDetails = { ...editablePatientDetails, drive_id: data.driveId };
        setEditablePatientDetails(newPatientDetails);

        const updatedAllConsultations = allConsultations.map(c =>
          c.id === selectedConsultation.id
            ? { ...c, patient: { ...c.patient, drive_id: data.driveId } }
            : c
        );
        setAllConsultations(updatedAllConsultations);
      }

      toast({
        title: "Prescription Generated",
        description: `Prescription for ${editablePatientDetails.name} has been generated.`,
      });

      if (selectedDate) fetchConsultations(selectedDate);

    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate prescription.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, consultation: Consultation) => {
    e.stopPropagation();
    setConsultationToDelete(consultation);

    const { count, error } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', consultation.patient.id);

    if (error) {
      console.error('Error checking consultation count:', error);
      setIsOnlyConsultation(false);
    } else {
      setIsOnlyConsultation(count === 1);
      if (count === 1) {
        setDeletePatientAlso(true);
      }
    }

    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!consultationToDelete) return;

    try {
      const { error: deleteConsultationError } = await supabase
        .from('consultations')
        .delete()
        .eq('id', consultationToDelete.id);

      if (deleteConsultationError) throw deleteConsultationError;

      if (deletePatientAlso && isOnlyConsultation) {
        const { error: deletePatientError } = await supabase
          .from('patients')
          .delete()
          .eq('id', consultationToDelete.patient.id);

        if (deletePatientError) throw deletePatientError;
      }

      toast({ title: 'Deleted', description: 'Consultation deleted successfully.' });

      if (selectedDate) fetchConsultations(selectedDate);

      if (selectedConsultation?.id === consultationToDelete.id) {
        setSelectedConsultation(null);
      }

    } catch (error) {
      console.error('Error deleting:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete.' });
    } finally {
      setIsDeleteModalOpen(false);
      setConsultationToDelete(null);
      setDeletePatientAlso(false);
    }
  };

  return (
    <>
      {!isOnline && (
        <div className="bg-yellow-500 text-center p-2 text-white">
          You are currently offline. Changes will be saved locally and synced when you're back online.
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-2 sm:p-4">
        <div className="container mx-auto max-w-7xl">
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="flex items-center justify-center gap-3 text-xl sm:text-2xl font-bold text-primary">
                <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
                Consultation Suit
                {!isOnline && <CloudOff className="w-6 h-6 text-yellow-500" />}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-muted-foreground">
                View and manage prescriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="location-select" className="flex-shrink-0">Location</Label>
                    <Select value={selectedHospital.name} onValueChange={(value) => {
                      const hospital = HOSPITALS.find(h => h.name === value);
                      if (hospital) {
                        setSelectedHospital(hospital);
                        setIsGpsEnabled(false);
                      }
                    }}>
                      <SelectTrigger id="location-select" className="flex-grow">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOSPITALS.map(hospital => (
                          <SelectItem key={hospital.name} value={hospital.name}>
                            {hospital.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setIsGpsEnabled(prev => !prev)}>
                      <MapPin className={cn("h-4 w-4", isGpsEnabled ? "text-blue-500 fill-blue-200" : "text-muted-foreground")} />
                      <span className="sr-only">Toggle GPS selection</span>
                    </Button>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Consultation Date</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSearchModalOpen(true)}>
                          <Search className="h-4 w-4" />
                          <span className="sr-only">Search Consultations</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsRegistrationModalOpen(true)}>
                          <UserPlus className="h-4 w-4" />
                          <span className="sr-only">Register New Patient</span>
                        </Button>
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
                      Total Consultations: {filteredConsultations.length}
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
                            <div key={c.id} className="flex items-center gap-2">
                              <Button variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => handleSelectConsultation(c)}>
                                <span>{c.patient.name}</span>
                                {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => handleDeleteClick(e, c)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No pending consultations.</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsEvaluationCollapsed(!isEvaluationCollapsed)}>
                        <Label className="cursor-pointer">Under Evaluation: {evaluationConsultations.length}</Label>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isEvaluationCollapsed && "rotate-180")} />
                      </Button>
                      {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isEvaluationCollapsed ? "max-h-0" : "max-h-60")}>
                          {evaluationConsultations.map(c => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Button variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => handleSelectConsultation(c)}>
                                <span>{c.patient.name}</span>
                                {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => handleDeleteClick(e, c)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {evaluationConsultations.length === 0 && <p className="text-sm text-muted-foreground">No consultations under evaluation.</p>}
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
                            <div key={c.id} className="flex items-center gap-2">
                              <Button variant={selectedConsultation?.id === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => handleSelectConsultation(c)}>
                                <span>{c.patient.name}</span>
                                {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => handleDeleteClick(e, c)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

                <div className="lg:col-span-2">
                  {selectedConsultation && editablePatientDetails ? (
                    <form className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              Demographic details of {editablePatientDetails.name}
                              <Badge
                                variant={extraData.visit_type === 'free' ? 'secondary' : 'default'}
                                className={cn("cursor-pointer hover:opacity-80 select-none", extraData.visit_type === 'free' ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-blue-100 text-blue-800 hover:bg-blue-200")}
                                onClick={() => handleExtraChange('visit_type', extraData.visit_type === 'paid' ? 'free' : 'paid')}
                              >
                                {extraData.visit_type === 'free' ? 'Free' : 'Paid'}
                              </Badge>
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
                            <a href={`https://drive.google.com/drive/folders/${editablePatientDetails.drive_id}`} target="_blank">
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
                            <Textarea ref={complaintsRef} id="complaints" value={extraData.complaints} onChange={e => handleExtraChange('complaints', e.target.value, e.target.selectionStart)} placeholder="Patient complaints..." className="min-h-[100px]" />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                            <Textarea ref={findingsRef} id="findings" value={extraData.findings} onChange={e => handleExtraChange('findings', e.target.value, e.target.selectionStart)} placeholder="Clinical findings..." className="min-h-[100px]" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                              {suggestedInvestigations.map((investigation) => (
                                <Button key={investigation} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleInvestigationSuggestionClick(investigation)}>
                                  {investigation}
                                </Button>
                              ))}
                            </div>
                            <Textarea ref={investigationsRef} id="investigations" value={extraData.investigations} onChange={e => handleExtraChange('investigations', e.target.value, e.target.selectionStart)} placeholder="Investigations required..." className="min-h-[100px]" />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                            <Textarea ref={diagnosisRef} id="diagnosis" value={extraData.diagnosis} onChange={e => handleExtraChange('diagnosis', e.target.value, e.target.selectionStart)} placeholder="Clinical diagnosis..." className="min-h-[100px]" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="procedure" className="text-sm font-medium">Procedure Done</Label>
                          <Textarea ref={procedureRef} id="procedure" value={extraData.procedure} onChange={e => handleExtraChange('procedure', e.target.value, e.target.selectionStart)} placeholder="Procedure done..." className="min-h-[80px]" />
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
                          <Textarea ref={adviceRef} id="advice" value={extraData.advice} onChange={e => handleExtraChange('advice', e.target.value, e.target.selectionStart)} placeholder="Medical advice..." className="min-h-[80px]" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-5 h-5 text-primary" />
                              <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {suggestedMedications.map((med) => (
                                <Button key={med.id} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleMedicationSuggestionClick(med)}>
                                  {med.name}
                                </Button>
                              ))}
                            </div>
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
                                  medFrequencyRefs={medFrequencyRefs}
                                  medDurationRefs={medDurationRefs}
                                  medInstructionsRefs={medInstructionsRefs}
                                  medNotesRefs={medNotesRefs}
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
                          <Label htmlFor="referred_to" className="text-sm font-medium">Referred To</Label>
                          <AutosuggestInput
                            ref={referredToRef as any}
                            value={extraData.referred_to}
                            onChange={value => handleExtraChange('referred_to', value, (referredToRef.current as any)?.selectionStart || value.length)}
                            suggestions={referralDoctors.map(d => ({
                              id: d.id,
                              name: `${d.name}${d.specialization ? `, ${d.specialization}` : ''}${d.address ? `, ${d.address}` : ''}${d.phone ? `, ${d.phone}` : ''}`
                            }))}
                            onSuggestionSelected={suggestion => handleExtraChange('referred_to', suggestion.name)}
                            placeholder="Referred to..."
                          />
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
                          <Textarea ref={followupRef} id="followup" value={extraData.followup} onChange={e => handleExtraChange('followup', e.target.value, e.target.selectionStart)} placeholder="Follow-up instructions..." className="min-h-[80px]" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="personalNote" className="text-sm font-medium">Doctor's Personal Note</Label>
                          <Textarea ref={personalNoteRef} id="personalNote" value={extraData.personalNote} onChange={e => handleExtraChange('personalNote', e.target.value, e.target.selectionStart)} placeholder="e.g., Patient seemed anxious, follow up on test results..." className="min-h-[80px]" />
                        </div>
                      </div>

                      <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-end gap-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {!isOnline && <CloudOff className="h-5 w-5 text-yellow-600" />}
                          <Button type="button" size="lg" onClick={saveChanges} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                            Save Changes
                          </Button>
                        </div>
                        <div className="flex w-full sm:w-auto gap-3">
                          <Button type="button" size="lg" onClick={handleSaveAndPrint}>
                            <Printer className="w-5 h-5 mr-2" />
                            Print
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="icon" variant="outline" className="h-12 w-12">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setIsGenerateDocEnabled(prev => !prev)} disabled={isSubmitting}>
                                <FileText className="w-4 h-4 mr-2" />
                                {isGenerateDocEnabled ? 'Disable' : 'Enable'} Google Doc
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setIsSaveBundleModalOpen(true)}>
                                <PackagePlus className="w-4 h-4 mr-2" />
                                Save as Bundle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setIsMedicalCertificateModalOpen(true)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Medical Certificate
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setIsReceiptModalOpen(true)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Receipt
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-muted/30 rounded-lg">
                      <p className="text-lg text-muted-foreground">Select a patient to view details.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}>
          {selectedConsultation && editablePatientDetails && (
            <Prescription
              patient={editablePatientDetails}
              consultation={cleanedConsultationData}
              consultationDate={selectedDate || new Date()}
              age={age}
              language={i18n.language}
              logoUrl={selectedHospital.logoUrl}
            />
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={certificatePrintRef}>
          {selectedConsultation && editablePatientDetails && certificateData && (
            <MedicalCertificate
              patient={editablePatientDetails}
              diagnosis={extraData.diagnosis}
              consultationDate={selectedDate || new Date()}
              certificateData={certificateData}
            />
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={receiptPrintRef}>
          {selectedConsultation && editablePatientDetails && receiptData && (
            <Receipt
              patient={editablePatientDetails}
              receiptData={receiptData}
              consultationDate={selectedDate || new Date()}
              hospital={selectedHospital}
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
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this consultation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {isOnlyConsultation && (
            <div className="flex items-center space-x-2 py-4">
              <Checkbox
                id="delete-patient"
                checked={deletePatientAlso}
                onCheckedChange={(checked) => setDeletePatientAlso(checked as boolean)}
              />
              <Label htmlFor="delete-patient">Delete patient also</Label>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      <TextShortcutManagementModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        onUpdate={fetchTextShortcuts}
      />
      {selectedConsultation && editablePatientDetails && (
        <MedicalCertificateModal
          isOpen={isMedicalCertificateModalOpen}
          onClose={() => setIsMedicalCertificateModalOpen(false)}
          onSubmit={(data) => {
            setCertificateData(data);
            setIsMedicalCertificateModalOpen(false);
            setIsReadyToPrintCertificate(true);
          }}
          patientName={editablePatientDetails.name}
        />
      )}
      {selectedConsultation && editablePatientDetails && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSubmit={(data) => {
            setReceiptData(data);
            setIsReceiptModalOpen(false);
            setIsReadyToPrintReceipt(true);
          }}
        />
      )}
      <Dialog open={isRegistrationModalOpen} onOpenChange={setIsRegistrationModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
            <DialogDescription>
              Fill in the details below to register a new patient and create a consultation for them.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ConsultationRegistration
              onSuccess={(newConsultation, consultationData) => {
                setIsRegistrationModalOpen(false);
                if (String(newConsultation.patient_id).startsWith('offline-')) {
                  setAllConsultations(prev => [newConsultation, ...prev]);
                  setSelectedConsultation(newConsultation);
                  setPendingSyncIds(prev => [...new Set([...prev, newConsultation.patient_id])]);
                } else if (selectedDate) {
                  fetchConsultations(selectedDate, newConsultation.patient_id, consultationData);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      {conflictData && (
        <ConflictResolutionModal
          isOpen={!!conflictData}
          onClose={() => setConflictData(null)}
          onResolve={handleResolveConflict}
          localData={conflictData.local}
          serverData={conflictData.server}
        />
      )}
      {patientConflictData && (
        <PatientConflictModal
          isOpen={!!patientConflictData}
          onClose={() => setPatientConflictData(null)}
          onResolve={handleResolvePatientConflict}
          offlinePatient={patientConflictData.offlinePatient}
          conflictingPatients={patientConflictData.conflictingPatients}
        />
      )}
      <ConsultationSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectConsultation={(consultation) => {
          const consultationDate = new Date(consultation.created_at);
          setSelectedDate(consultationDate);
          fetchConsultations(consultationDate, consultation.patient.id, consultation.consultation_data);
          setIsSearchModalOpen(false);
        }}
      />
    </>
  );
};

export default Consultation;
