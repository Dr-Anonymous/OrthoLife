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

// ... (interfaces and other components remain the same)

const Consultation = () => {
  // ... (all state declarations remain the same)
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [pendingConsultations, setPendingConsultations] = useState<Consultation[]>([]);
  const [completedConsultations, setCompletedConsultations] = useState<Consultation[]>([]);
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
  const [isGenerateDocEnabled, setIsGenerateDocEnabled] = useState(true);

  useEffect(() => {
    const storedValue = localStorage.getItem('isGenerateDocEnabled');
    if (storedValue !== null) {
      setIsGenerateDocEnabled(JSON.parse(storedValue));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isGenerateDocEnabled', JSON.stringify(isGenerateDocEnabled));
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

  const markAsCompleted = async () => {
    if (!selectedConsultation) return;

    try {
      stopTimer();
      isTimerPausedRef.current = true;
      const { error } = await supabase
        .from('consultations')
        .update({ status: 'completed' })
        .eq('id', selectedConsultation.id);

      if (error) throw error;

      toast({
        title: "Consultation Completed",
        description: `${selectedConsultation.patient.name}'s consultation has been marked as completed.`,
      });

      if (selectedDate) fetchConsultations(selectedDate);

    } catch (error) {
      console.error('Error marking consultation as completed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark consultation as completed.',
      });
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: markAsCompleted,
  });

  useEffect(() => {
    if (isReadyToPrint) {
      handlePrint();
      setIsReadyToPrint(false);
    }
  }, [isReadyToPrint, handlePrint]);

  const handleSaveAndPrint = async () => {
    const saved = await saveChanges();
    if (saved) {
      setIsReadyToPrint(true);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    if (ctrlKey && selectedConsultation) {
      switch (event.key.toLowerCase()) {
        case 'p':
          event.preventDefault();
          handleSaveAndPrint();
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

  // ... (useEffect for language change remains the same)

  // ... (useEffect for focus remains the same)

  // ... (useEffect for suggestions remains the same)

  // ... (fetchSavedMedications and fetchTextShortcuts remain the same)

  // ... (fetchConsultations remains the same)

  // ... (useEffect for selectedConsultation remains the same, but we will modify the dirty checking part)

  useEffect(() => {
    // ... (fetchLastVisitDate remains the same)

    if (selectedConsultation) {
      // ... (rest of the logic remains the same)
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
      setInitialExtraData(newExtraData);
      setInitialPatientDetails(selectedConsultation.patient);
      setIsFormDirty(false);
      // ... (rest of the logic remains the same)
    } else {
      // ... (rest of the logic remains the same)
      setInitialPatientDetails(null);
      setInitialExtraData(null);
    }
  }, [selectedConsultation]);

  // ... (timer logic remains the same)

  useEffect(() => {
    if (initialPatientDetails && initialExtraData) {
      const isDirty = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails) ||
                      JSON.stringify(extraData) !== JSON.stringify(initialExtraData);
      setIsFormDirty(isDirty);
    }
  }, [extraData, editablePatientDetails, initialPatientDetails, initialExtraData]);

  // ... (age calculation and other handlers remain the same)

  const saveChanges = async () => {
    if (!selectedConsultation || !editablePatientDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'No consultation selected.' });
      return false;
    }

    const patientDetailsChanged = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails);
    const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);

    if (!patientDetailsChanged && !extraDataChanged) {
      toast({ title: 'No Changes', description: 'No new changes to save.' });
      return true; // No changes, but operation is "successful"
    }

    setIsSaving(true);
    try {
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

      if (extraDataChanged) {
        const { error: updateError } = await supabase
          .from('consultations')
          .update({ consultation_data: { ...extraData, language: i18n.language } })
          .eq('id', selectedConsultation.id);

        if (updateError) throw new Error(`Failed to save consultation data: ${updateError.message}`);
      }

      toast({ title: 'Success', description: 'Your changes have been saved.' });

      const updatedConsultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: { ...extraData, language: i18n.language },
      };

      setSelectedConsultation(updatedConsultation);
      setInitialPatientDetails(editablePatientDetails);
      setInitialExtraData(extraData);

      const updateInList = (list: Consultation[]) => list.map(c => c.id === updatedConsultation.id ? updatedConsultation : c);
      setAllConsultations(prev => updateInList(prev));
      setPendingConsultations(prev => updateInList(prev));
      setCompletedConsultations(prev => updateInList(prev));

      return true;
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes. Please try again.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitForm = async (e?: React.FormEvent, options: { skipSave?: boolean } = {}) => {
    if (e) e.preventDefault();
    if (!selectedConsultation || !editablePatientDetails) return;

    if (isGenerateDocEnabled) {
      setIsSubmitting(true);
      try {
        if (!options.skipSave) {
          const saved = await saveChanges();
          if (!saved) {
              setIsSubmitting(false);
              return;
          }
        }

        // ... (rest of the submitForm logic is the same, but remove the status update)
        if (data?.url) {
          window.open(data.url, '_blank');
        }

      } catch (error) {
        console.error('Error:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate prescription.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      {/* ... (rest of the JSX remains the same until the button container) */}

                          <div className="pt-6 flex flex-wrap items-center justify-start gap-4">
                              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-muted/50">
                                  <input
                                      type="checkbox"
                                      checked={isGenerateDocEnabled}
                                      onChange={e => setIsGenerateDocEnabled(e.target.checked)}
                                      className="h-5 w-5 rounded border-border"
                                  />
                                  <span className="sr-only">Enable Google Doc Generation</span>
                              </label>

                              <div className="flex items-center gap-2">
                                  <Button type="submit" size="icon" className="h-12 w-12" disabled={isSubmitting}>
                                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                                      <span className="sr-only">Generate Google Doc</span>
                                  </Button>
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
      {/* ... (rest of the JSX remains the same) */}
    </>
  );
};

export default Consultation;
