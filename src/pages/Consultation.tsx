import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Stethoscope, Printer, Save, PackagePlus } from 'lucide-react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import SavedMedicationsModal from '@/components/SavedMedicationsModal';
import KeywordManagementModal from '@/components/KeywordManagementModal';
import UnsavedChangesModal from '@/components/UnsavedChangesModal';
import { useDebounce } from '@/hooks/useDebounce';
import PatientHistoryModal from '@/components/PatientHistoryModal';
import { useTranslation } from 'react-i18next';
import SaveBundleModal from '@/components/SaveBundleModal';
import TextShortcutManagementModal from '@/components/TextShortcutManagementModal';
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/Prescription';
import { GOOGLE_DOCS_TEMPLATE_IDS } from '@/config/constants';
import { useConsultationTimer } from '@/hooks/consultation/useConsultationTimer';
import ConsultationsSidebar from '@/components/consultation/ConsultationsSidebar';
import PatientDetailsForm from '@/components/consultation/PatientDetailsForm';
import MedicalInformationForm from '@/components/consultation/MedicalInformationForm';
import { ConsultationContext } from '@/context/ConsultationContext';
import { Medication } from '@/components/consultation/MedicationItem';
import { useAutosuggest } from '@/hooks/consultation/useAutosuggest';
import { useConsultationForm } from '@/hooks/consultation/useConsultationForm';
import { useInitialData } from '@/hooks/consultation/useInitialData';
import { useTranslationManager } from '@/hooks/consultation/useTranslationManager';

const Consultation = () => {
  const { i18n } = useTranslation();
  const { state, dispatch } = React.useContext(ConsultationContext);
  const {
    selectedConsultation,
    isUnsavedModalOpen,
    editablePatientDetails,
    isMedicationsModalOpen,
    isKeywordModalOpen,
    isHistoryModalOpen,
    isSaveBundleModalOpen,
    isShortcutModalOpen,
    extraData,
    suggestedMedications,
    suggestedAdvice,
    suggestedInvestigations,
    suggestedFollowup,
    age,
  } = state;

  const { formattedTime, isTimerVisible, toggleTimerVisibility } = useConsultationTimer(selectedConsultation);
  const { handleConfirmSave, handleDiscardChanges, saveChanges } = useConsultationForm();
  useInitialData();
  useTranslationManager();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = extraData.medications.findIndex((m: Medication) => m.id === active.id);
      const newIndex = extraData.medications.findIndex((m: Medication) => m.id === over.id);
      dispatch({
        type: 'UPDATE_EXTRA_DATA_FIELD',
        payload: {
          field: 'medications',
          value: arrayMove(extraData.medications, oldIndex, newIndex),
        },
      });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const medicationNameInputRef = useRef<HTMLInputElement | null>(null);
  const printRef = useRef(null);

  const debouncedComplaints = useDebounce(extraData.complaints, 500);
  const debouncedDiagnosis = useDebounce(extraData.diagnosis, 500);

  useAutosuggest(
    debouncedComplaints,
    debouncedDiagnosis,
    extraData,
    suggestedMedications,
    suggestedAdvice,
    suggestedInvestigations,
    suggestedFollowup,
    dispatch
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    if (isReadyToPrint) {
      handlePrint();
      setIsReadyToPrint(false);
    }
  }, [isReadyToPrint, handlePrint]);

  const handleSaveAndPrint = async () => {
    const saved = await saveChanges({ markAsCompleted: true });
    if (saved) {
      if (isGenerateDocEnabled) {
        submitForm(undefined, { skipSave: true });
      }
      setIsReadyToPrint(true);
    }
  };

  const addMedication = () => {
    dispatch({ type: 'ADD_MEDICATION' });
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
  }, [selectedConsultation, extraData, editablePatientDetails, saveChanges, handleSaveAndPrint]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
        dispatch({ type: 'SET_LAST_VISIT_DATE', payload: 'First Consultation' });
      } else if (!data || data.length === 0) {
        dispatch({ type: 'SET_LAST_VISIT_DATE', payload: 'First Consultation' });
      } else {
        dispatch({ type: 'SET_LAST_VISIT_DATE', payload: formatDistanceToNow(new Date(data[0].created_at), { addSuffix: true }) });
      }
    };

    if (selectedConsultation) {
      dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: selectedConsultation.patient });
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
      dispatch({ type: 'SET_EXTRA_DATA', payload: newExtraData });
      dispatch({ type: 'SET_INITIAL_FORM_STATE', payload: { patient: selectedConsultation.patient, extraData: newExtraData } });
      dispatch({ type: 'SET_IS_FORM_DIRTY', payload: false });
      dispatch({ type: 'SET_SUGGESTED_MEDICATIONS', payload: [] });
      dispatch({ type: 'SET_SUGGESTED_ADVICE', payload: [] });
      dispatch({ type: 'SET_SUGGESTED_INVESTIGATIONS', payload: [] });
      dispatch({ type: 'SET_SUGGESTED_FOLLOWUP', payload: [] });

      if (selectedConsultation.consultation_data?.language) {
        i18n.changeLanguage(selectedConsultation.consultation_data.language);
      }
    } else {
      dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: null });
      dispatch({ type: 'SET_LAST_VISIT_DATE', payload: null });
      dispatch({
        type: 'SET_EXTRA_DATA', payload: {
          complaints: '',
          findings: '',
          investigations: '',
          diagnosis: '',
          advice: '',
          followup: '',
          personalNote: '',
          medications: [],
        }
      });
      dispatch({ type: 'SET_IS_FORM_DIRTY', payload: false });
      dispatch({ type: 'SET_INITIAL_FORM_STATE', payload: { patient: null, extraData: null } });
    }
  }, [selectedConsultation, dispatch, i18n]);

  const submitForm = async (e?: React.FormEvent, options: { skipSave?: boolean } = {}) => {
    if (e) e.preventDefault();
    if (!selectedConsultation || !editablePatientDetails || !isGenerateDocEnabled) return;
    setIsSubmitting(true);
    try {
      if (!options.skipSave) {
        const saved = await saveChanges();
        if (!saved) {
          setIsSubmitting(false);
          return;
        }
      }

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
      }

      toast({
        title: "Prescription Generated",
        description: `Prescription for ${editablePatientDetails.name} has been generated.`,
      });

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
                <ConsultationsSidebar
                  formattedTime={formattedTime}
                  isTimerVisible={isTimerVisible}
                  toggleTimerVisibility={toggleTimerVisibility}
                />
                <div className="md:col-span-3">
                  {selectedConsultation && editablePatientDetails ? (
                    <form className="space-y-6">
                      <PatientDetailsForm />
                      <MedicalInformationForm
                        medicationNameInputRef={medicationNameInputRef}
                        handleDragEnd={handleDragEnd}
                      />
                      <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
                        <Button
                          type="button"
                          variant={isGenerateDocEnabled ? "secondary" : "outline"}
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => setIsGenerateDocEnabled(prev => !prev)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                          <span className="sr-only">Toggle Google Doc Generation</span>
                        </Button>
                        <Button type="button" size="icon" className="h-12 w-12" onClick={handleSaveAndPrint}>
                          <Printer className="w-5 h-5" />
                          <span className="sr-only">Save & Print</span>
                        </Button>
                        <Button type="button" size="icon" className="h-12 w-12" onClick={() => saveChanges()} disabled={isSaving}>
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          <span className="sr-only">Save Changes</span>
                        </Button>
                        <Button type="button" size="icon" variant="outline" className="h-12 w-12" onClick={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'saveBundle', isOpen: true } })}>
                          <PackagePlus className="w-5 h-5" />
                          <span className="sr-only">Save as Bundle</span>
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
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}>
          {selectedConsultation && editablePatientDetails && (
            <Prescription
              patient={editablePatientDetails}
              consultation={extraData}
              consultationDate={new Date()}
              age={age}
              language={i18n.language}
            />
          )}
        </div>
      </div>
      <SavedMedicationsModal
        isOpen={isMedicationsModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'medications', isOpen: false } })}
      />
      <KeywordManagementModal
        isOpen={isKeywordModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'keyword', isOpen: false } })}
      />
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onConfirm={handleConfirmSave}
        onDiscard={handleDiscardChanges}
      />
      <PatientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'history', isOpen: false } })}
        patientId={selectedConsultation?.patient.id || null}
      />
      <SaveBundleModal
        isOpen={isSaveBundleModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'saveBundle', isOpen: false } })}
        medications={extraData.medications}
        advice={extraData.advice}
      />
      <TextShortcutManagementModal
        isOpen={isShortcutModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'shortcut', isOpen: false } })}
      />
    </>
  );
};

export default Consultation;
