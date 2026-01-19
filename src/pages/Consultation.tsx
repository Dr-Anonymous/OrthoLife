import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { toast } from '@/hooks/use-toast';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn, cleanConsultationData, pruneEmptyFields } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import SavedMedicationsModal from '@/components/consultation/SavedMedicationsModal';
import KeywordManagementModal, { KeywordPrefillData } from '@/components/consultation/KeywordManagementModal';
import UnsavedChangesModal from '@/components/consultation/UnsavedChangesModal';
import PatientHistoryModal from '@/components/consultation/PatientHistoryModal';
import { useTranslation } from 'react-i18next';
import TextShortcutManagementModal from '@/components/consultation/TextShortcutManagementModal';

import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/consultation/Prescription';
import { MedicalCertificate, MedicalCertificateModal, CertificateData } from '@/components/consultation/MedicalCertificate';
import { Receipt, ReceiptModal, ReceiptData } from '@/components/consultation/Receipt';
import { HOSPITALS } from '@/config/constants';
import { getDistance } from '@/lib/geolocation';
import ConsultationRegistration from '@/components/consultation/ConsultationRegistration';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConflictResolutionModal } from '@/components/consultation/ConflictResolutionModal';
import { PatientConflictModal } from '@/components/consultation/PatientConflictModal';
import { ConsultationSearchModal } from '@/components/consultation/ConsultationSearchModal';
import { CompletionMessageModal } from '@/components/consultation/CompletionMessageModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

// Refactored Components
import { ConsultationSidebar } from '@/components/consultation/ConsultationSidebar';
import { PatientDemographics } from '@/components/consultation/PatientDemographics';
import { VitalsForm } from '@/components/consultation/VitalsForm';
import { ClinicalNotesForm } from '@/components/consultation/ClinicalNotesForm';
import { MedicationManager } from '@/components/consultation/MedicationManager';
import { FollowUpSection } from '@/components/consultation/FollowUpSection';
import { ConsultationActions } from '@/components/consultation/ConsultationActions';
import { Patient, Consultation, Medication, TextShortcut } from '@/types/consultation';

import { processTextShortcuts } from '@/lib/textShortcuts';
import { getMatchingGuides } from '@/lib/guideMatching';
import { Guide } from '@/types/consultation';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';
import { useOfflineSync } from '@/hooks/useOfflineSync';


/**
 * ConsultationPage Component
 * 
 * This is the main page for managing outpatient consultations. It handles:
 * - Patient registration and selection
 * - Consultation data entry (Complaints, Findings, Diagnosis, etc.)
 * - Medication management with autocomplete and shortcuts
 * - Printing functionality (Prescription, Medical Certificate, Receipt)
 * - Offline synchronization with Supabase
 * - GPS-based hospital selection
 */
const ConsultationPage = () => {
  const isOnline = useOnlineStatus();
  const { i18n, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [isEvaluationCollapsed, setIsEvaluationCollapsed] = useState(true);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [initialPatientDetails, setInitialPatientDetails] = useState<Patient | null>(null);
  const [initialExtraData, setInitialExtraData] = useState<any>(null);
  const [initialLocation, setInitialLocation] = useState<string>(HOSPITALS[0].name);
  const [initialLanguage, setInitialLanguage] = useState<string>('en');

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: '',
    medications: [] as Medication[],
    weight: '',
    bp: '',
    temperature: '',
    allergy: '',
    personalNote: '',
    procedure: '',
    referred_to: '',
    visit_type: 'paid', // default
  });

  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);

  // Modals
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Consultation | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePatientAlso, setDeletePatientAlso] = useState<boolean>(false);
  const [isOnlyConsultation, setIsOnlyConsultation] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isMessageManuallyEdited, setIsMessageManuallyEdited] = useState(false);

  // --- Completion Message Logic ---
  const handleOpenCompletionModal = () => {
    if (!editablePatientDetails || !selectedConsultation) return;

    if (!isMessageManuallyEdited) {
      const message = generateCompletionMessage(editablePatientDetails, matchedGuides);
      setCompletionMessage(message);
    }
    // If manually edited, keep the existing 'completionMessage' state

    setIsCompletionModalOpen(true);
  };

  // UI State
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(() => {
    const storedHospital = localStorage.getItem('selectedHospital');
    return HOSPITALS.find(h => h.name === storedHospital) || HOSPITALS[0];
  });
  const [isGpsEnabled, setIsGpsEnabled] = useState(() => {
    const stored = localStorage.getItem('isGpsEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [isReadyToPrint, setIsReadyToPrint] = useState(false);
  const [age, setAge] = useState<number | ''>('');
  const medicationNameInputRef = useRef<HTMLInputElement | null>(null);
  const patientSelectionCounter = useRef(0);

  const debouncedAdvice = useDebounce(extraData.advice, 500);

  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Refs
  const complaintsRef = useRef<HTMLTextAreaElement>(null);
  const findingsRef = useRef<HTMLTextAreaElement>(null);
  const investigationsRef = useRef<HTMLTextAreaElement>(null);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const adviceRef = useRef<HTMLTextAreaElement>(null);
  const followupRef = useRef<HTMLTextAreaElement>(null);
  const procedureRef = useRef<HTMLTextAreaElement>(null);
  const referredToRef = useRef<HTMLInputElement>(null);

  // Med Refs
  const medFrequencyRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const medDurationRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medInstructionsRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medNotesRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Keyword Modal Prefill
  const [keywordModalPrefill, setKeywordModalPrefill] = useState<KeywordPrefillData | null>(null);

  const handleSaveBundleClick = () => {
    const isTelugu = i18n.language === 'te';
    setKeywordModalPrefill({
      medications: extraData.medications.map(m => ({ name: m.name || '' })),
      advice: isTelugu ? '' : extraData.advice, // Default to empty if not English
      advice_te: isTelugu ? extraData.advice : '', // Populate Telugu if current language is Telugu
      investigations: extraData.investigations, // Usually English?
      followup: isTelugu ? '' : extraData.followup,
      followup_te: isTelugu ? extraData.followup : '',
    });
    setIsKeywordModalOpen(true);
  };

  // Print Refs
  const printRef = useRef(null);
  const certificatePrintRef = useRef(null);
  const receiptPrintRef = useRef(null);
  const [isReadyToPrintCertificate, setIsReadyToPrintCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [isReadyToPrintReceipt, setIsReadyToPrintReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Suggestions state
  const [autofillKeywords, setAutofillKeywords] = useState<any[]>([]);
  const [textShortcuts, setTextShortcuts] = useState<TextShortcut[]>([]);
  const [isProcedureExpanded, setIsProcedureExpanded] = useState(false);
  const [isReferredToExpanded, setIsReferredToExpanded] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [referralDoctors, setReferralDoctors] = useState<any[]>([]);

  // Timer
  // Timer (Refactored)
  const { timerSeconds, isTimerVisible, setIsTimerVisible, stopTimer, pauseTimer, isTimerPausedRef } = useConsultationTimer(selectedConsultation);

  // Date Pickers
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);

  // Guide Matching
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => {
    const fetchGuides = async () => {
      const { data, error } = await supabase
        .from('guides')
        .select('id, title, description, categories(name), guide_translations(language, title, description)');

      if (!error && data) {
        setGuides(data as unknown as Guide[]);
      }
    };
    fetchGuides();
  }, []);

  const matchedGuides = useMemo(() => {
    return getMatchingGuides(debouncedAdvice, guides, i18n.language);
  }, [debouncedAdvice, guides, i18n.language]);

  // Stop Timer Logic
  // Timer Stop Logic handled by hook


  const confirmSelection = useCallback(async (consultation: Consultation) => {
    patientSelectionCounter.current += 1;
    setSelectedConsultation(consultation);
    setEditablePatientDetails(consultation.patient);
    setInitialPatientDetails(consultation.patient);
    if (consultation.patient.dob) {
      setAge(calculateAge(new Date(consultation.patient.dob)));
      setCalendarDate(new Date(consultation.patient.dob));
    }

    const savedData = consultation.consultation_data || {};
    const newExtraData = {
      complaints: savedData.complaints || '',
      findings: savedData.findings || '',
      investigations: savedData.investigations || '',
      diagnosis: savedData.diagnosis || '',
      advice: savedData.advice || '',
      followup: savedData.followup || '',
      medications: typeof savedData.medications === 'string' ? JSON.parse(savedData.medications) : (savedData.medications || []),
      weight: savedData.weight || '',
      bp: savedData.bp || '',
      temperature: savedData.temperature || '',
      allergy: savedData.allergy || '',
      personalNote: savedData.personalNote || '',
      procedure: savedData.procedure || '',
      referred_to: savedData.referred_to || '',
      visit_type: savedData.visit_type || consultation.visit_type || 'paid',
    };
    setExtraData(newExtraData as any);
    setInitialExtraData(newExtraData);
    setInitialLocation(consultation.location || HOSPITALS[0].name);
    setInitialLanguage(consultation.language || 'en');

    setIsProcedureExpanded(!!newExtraData.procedure);
    setIsReferredToExpanded(!!newExtraData.referred_to);

    setHasUnsavedChanges(false);

    // Timer Reset handled by useEffect

    // Fetch details last visit
    if (consultation.patient.id && !String(consultation.patient.id).startsWith('offline-')) {
      const { data: lastVisit } = await supabase
        .from('consultations')
        .select('created_at')
        .eq('patient_id', consultation.patient.id)
        .lt('created_at', consultation.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: lastDischarge } = await supabase
        .from('in_patients')
        .select('discharge_date, discharge_summary, procedure_date') // Fetch procedure_date
        .eq('patient_id', consultation.patient.id)
        .eq('status', 'discharged')
        .not('discharge_summary', 'is', null) // Ensure summary exists
        .order('discharge_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let lastOpDate = lastVisit ? new Date(lastVisit.created_at) : null;
      let lastDischargeDate = lastDischarge ? new Date(lastDischarge.discharge_date) : null;

      // Logic: If Discharge Date > Last OP Date, prefill from Discharge Summary
      if (lastDischargeDate && (!lastOpDate || lastDischargeDate > lastOpDate)) {
        const d = new Date(lastDischarge.discharge_date);
        setLastVisitDate(`Discharge: ${formatDistanceToNow(d, { addSuffix: true })} (${format(d, 'dd MMM yyyy')})`);

        if (lastDischarge?.discharge_summary) {
          try {
            // Need to cast to any or correct type if available. Assuming structure based on schema.
            const summary: any = lastDischarge.discharge_summary;
            const course = summary.course_details;
            const discharge = summary.discharge_data;

            // Calculate post-op days for complaints
            let complaintsText = '';
            if (lastDischarge.procedure_date) {
              const diffDays = differenceInDays(new Date(), new Date(lastDischarge.procedure_date));
              complaintsText = `${diffDays} days post-operative case.`;
            }

            const dischargePrefill = {
              complaints: complaintsText,
              diagnosis: course.diagnosis || '',
              procedure: course.procedure ? `${course.procedure} done on ${lastDischarge.procedure_date ? format(new Date(lastDischarge.procedure_date), 'dd MMM yyyy') : ''}` : '',
              medications: discharge.medications || [],
              advice: discharge.post_op_care || '',
              findings: discharge.clinical_notes || '',
              followup: discharge.review_date ? format(new Date(discharge.review_date), 'dd MMM yyyy') : '',
              investigations: '', // Usually empty for new follow-up
              visit_type: consultation.visit_type || 'paid', // Keep existing or default
              // Keep other fields empty or default
              weight: '', bp: '', temperature: '', allergy: '', personalNote: '', referred_to: ''
            };

            setExtraData(prev => ({ ...prev, ...dischargePrefill }));
            // Also update initial extra data to prevent "unsaved changes" warning if user just saves
            setInitialExtraData(prev => ({ ...prev, ...dischargePrefill }));

            // Update expanded states
            setIsProcedureExpanded(!!dischargePrefill.procedure);

            toast({
              title: "Data Loaded",
              description: "Form pre-filled from latest Discharge Summary.",
            });

          } catch (e) {
            console.error("Error parsing discharge summary for prefill", e);
          }
        }

      } else if (lastOpDate) {
        setLastVisitDate(`${formatDistanceToNow(lastOpDate, { addSuffix: true })} (${format(lastOpDate, 'dd MMM yyyy')})`);
      } else {
        setLastVisitDate('First Consultation');
      }
    }

    // Auto-focus Complaints
    setTimeout(() => {
      complaintsRef.current?.focus();
    }, 100);
  }, []);



  /**
   * Timer Logic
   * Tracks the duration of the consultation.
   * Starts automatically when a non-completed consultation is selected.
   * Pauses when switching away or manually paused.
   */
  // Timer Effect handled by hook


  const fetchConsultations = useCallback(async (date: Date = selectedDate || new Date(), patientId?: string, consultationData?: any) => {
    setIsFetchingConsultations(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');

      const { data: consultations, error } = await supabase.functions.invoke('get-consultations', {
        body: { date: formattedDate, hospital: selectedHospital.name }
      });

      if (error) throw error;

      if (!error && consultations) {
        let list: Consultation[] = [];
        if (Array.isArray(consultations)) {
          list = consultations;
        } else if (consultations && typeof consultations === 'object' && Array.isArray((consultations as any).consultations)) {
          list = (consultations as any).consultations;
        } else if (consultations && typeof consultations === 'object' && Array.isArray((consultations as any).data)) {
          list = (consultations as any).data;
        } else {
          console.error("Unexpected consultations data format:", consultations);
          list = [];
        }

        setAllConsultations(list);

        if (patientId) {
          const found = list.find((c: Consultation) => c.patient.id === patientId && c.created_at.startsWith(formattedDate));
          if (found) {
            const consultationToSelect = { ...found };
            if (consultationData) {
              consultationToSelect.consultation_data = consultationData;
            }
            confirmSelection(consultationToSelect);
          }
        }
      } else {
        setAllConsultations([]);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch consultations.' });
    } finally {
      setIsFetchingConsultations(false);
    }
  }, [selectedDate, selectedHospital]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  /**
   * GPS Logic
   * Automatically selects the nearest hospital based on the user's current location.
   * Only runs if GPS is enabled in settings.
   */
  useEffect(() => {
    // GPS Logic
    if (isGpsEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          let closest = HOSPITALS[0];
          let minDistance = Infinity;

          HOSPITALS.forEach(hospital => {
            const distance = getDistance(latitude, longitude, hospital.lat, hospital.lng);
            if (distance < minDistance) {
              minDistance = distance;
              closest = hospital;
            }
          });

          if (closest.name !== selectedHospital.name) {
            setSelectedHospital(closest);
            toast({
              title: "Location Updated",
              description: `Switched to ${closest.name} based on your location.`,
            });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, [isGpsEnabled, selectedHospital.name]);

  // Use useCallback to access latest state if needed, or pass args
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(() => {
    const stored = localStorage.getItem('isAutoSendEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const generateCompletionMessage = (patient: any, guidesMatched: any[]) => {
    // Use current UI language instead of patient default, as per user request
    const isTelugu = i18n.language === 'te';
    const patientName = patient.name;
    const patientPhone = patient.phone;

    const guideLinks = guidesMatched
      .filter(mg => mg.guideLink)
      .map(mg => mg.guideLink);

    const linksText = guideLinks.join('\n\n');

    if (isTelugu) {
      if (guideLinks.length > 0) {
        return `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు-\n\n${linksText}`;
      } else {
        return `🙏 నమస్కారం ${patientName},\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`;
      }
    } else {
      if (guideLinks.length > 0) {
        return `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}\n\n- Read diet 🍚 & exercise 🧘 advice-\n\n${linksText}`;
      } else {
        return `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nDownload your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}`;
      }
    }
  };

  const sendConsultationCompletionNotification = async (patient: any, guidesMatched: any[], isAuto: boolean = true) => {
    if (isAuto && !isAutoSendEnabled) {
      console.log('Auto-notification disabled, skipping.');
      return;
    }

    try {
      // Logic: If manually edited, use that message. Else, generate fresh one (which respects current language).
      const message = isMessageManuallyEdited ? completionMessage : generateCompletionMessage(patient, guidesMatched);

      // Use send-whatsapp function directly
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { number: patient.phone, message: message },
      });
      if (error) throw error;
      console.log('Notification sent');
    } catch (err) {
      console.error('Failed to send WhatsApp notification:', err);
      // Optional: Toast error
    }
  };

  const saveChanges = async (options: { markAsCompleted?: boolean, skipToast?: boolean } = {}) => {
    if (!selectedConsultation || !editablePatientDetails) throw new Error("No consultation selected");

    const patientDetailsChanged = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails);
    const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);
    const locationChanged = selectedHospital.name !== initialLocation;
    const languageChanged = i18n.language !== initialLanguage;

    const isPrinting = options.markAsCompleted;
    const hasMedsOrFollowup = extraData.medications.length > 0 || (extraData.followup && extraData.followup.trim() !== '');

    let newStatus = selectedConsultation.status;
    if (isPrinting) {
      newStatus = hasMedsOrFollowup ? 'completed' : 'under_evaluation';
    }
    const statusChanged = newStatus !== selectedConsultation.status;
    const shouldSave = hasUnsavedChanges || statusChanged || locationChanged || languageChanged;

    if (!shouldSave) {
      if (!options.skipToast) toast({ title: 'No Changes', description: 'No new changes to save.' });
      return true;
    }

    setIsSaving(true);
    try {
      // Exclude migrated fields from consultation_data to avoid duplication
      // We must explicitly destructure them out in case they exist in extraData from legacy JSON
      const { visit_type, location, language, ...restExtraData } = extraData as any;

      // Helper to clean medication object
      const cleanMedicationForSave = (med: any) => {
        const cleaned = { ...med };

        // 1. Remove snake_case duplicates from saved_medications join
        delete cleaned.freq_morning;
        delete cleaned.freq_noon;
        delete cleaned.freq_night;
        delete cleaned.created_at;
        delete cleaned.updated_at;

        // 2. Prune false values to save space
        if (!cleaned.freqMorning) delete cleaned.freqMorning;
        if (!cleaned.freqNoon) delete cleaned.freqNoon;
        if (!cleaned.freqNight) delete cleaned.freqNight;

        return cleaned;
      };

      const dataToSave = pruneEmptyFields({
        ...restExtraData,
        medications: (restExtraData.medications || []).map(cleanMedicationForSave)
      });

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
              is_dob_estimated: editablePatientDetails.is_dob_estimated
            })
            .eq('id', editablePatientDetails.id);
          if (patientUpdateError) throw new Error(`Failed to update patient details: ${patientUpdateError.message}`);
        }

        const consultationUpdatePayload: { consultation_data?: any, status?: string, visit_type?: string, location?: string, language?: string, duration?: number } = {};

        if (hasUnsavedChanges || locationChanged || languageChanged) {
          consultationUpdatePayload.consultation_data = dataToSave;
          consultationUpdatePayload.visit_type = extraData.visit_type;
          consultationUpdatePayload.location = selectedHospital.name;
          consultationUpdatePayload.language = i18n.language;
        }
        if (statusChanged) {
          consultationUpdatePayload.status = newStatus;
          if (newStatus === 'completed') {
            stopTimer();
            isTimerPausedRef.current = true;
          }
        }

        // Always save duration
        consultationUpdatePayload.duration = timerSeconds;

        if (Object.keys(consultationUpdatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('consultations')
            .update(consultationUpdatePayload)
            .eq('id', selectedConsultation.id);
          if (updateError) throw new Error(`Failed to save consultation data: ${updateError.message}`);
        }

        if (statusChanged && newStatus === 'completed' && selectedConsultation.status !== 'completed') {
          sendConsultationCompletionNotification(editablePatientDetails, matchedGuides);
        }

        await offlineStore.removeItem(selectedConsultation.id);
        setPendingSyncIds(prev => prev.filter(id => id !== selectedConsultation.id));
        if (!options.skipToast) toast({ title: 'Success', description: 'Your changes have been saved.' });
      }

      const updatedConsultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: { ...extraData, language: i18n.language },
        visit_type: extraData.visit_type,
        location: selectedHospital.name,
        language: i18n.language,
        status: newStatus as 'pending' | 'completed' | 'under_evaluation',
        duration: timerSeconds,
      };

      setSelectedConsultation(updatedConsultation);
      setInitialPatientDetails(editablePatientDetails);
      setInitialExtraData(extraData);
      setInitialLocation(selectedHospital.name);
      setInitialLanguage(i18n.language);

      const updatedAllConsultations = allConsultations.map(c =>
        c.id === updatedConsultation.id ? updatedConsultation : c
      );
      setAllConsultations(updatedAllConsultations);
      setHasUnsavedChanges(false);

      return true;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save." });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Offline Sync Logic
   * Synchronizes offline storage (IndexedDB) with Supabase when online.
   * Handles:
   * - New patient registration (offline- created patients)
   * - New/Updated consultation data
   * - Conflict resolution (Server vs Local timestamp)
   */
  /**
   * Offline Sync Logic (Refactored to Hook)
   */
  const {
    pendingSyncIds,
    setPendingSyncIds,
    conflictData,
    setConflictData,
    patientConflictData,
    setPatientConflictData,
    resolveConflict,
    resolvePatientConflict
  } = useOfflineSync({
    isOnline,
    sendConsultationCompletionNotification: useCallback((p, g) => sendConsultationCompletionNotification(p, g), [completionMessage, isMessageManuallyEdited]), // Pass stable wrapper or adapt hook
    matchedGuides
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser's native confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);



  /**
   * Persist User Preferences
   * Saves GPS setting and selected hospital to localStorage.
   */
  useEffect(() => {
    localStorage.setItem('isGpsEnabled', JSON.stringify(isGpsEnabled));
    localStorage.setItem('selectedHospital', selectedHospital.name);
    localStorage.setItem('isAutoSendEnabled', JSON.stringify(isAutoSendEnabled));
  }, [selectedHospital, isGpsEnabled, isAutoSendEnabled]);

  const handleSelectConsultation = async (consultation: Consultation) => {
    // If passing from fetch logic, we might need to skip unsaved check or handle it
    if (hasUnsavedChanges) {
      setPendingSelection(consultation);
      setIsUnsavedModalOpen(true);
    } else {
      confirmSelection(consultation);
    }
  };



  const handleConfirmSave = async () => {
    setIsUnsavedModalOpen(false);
    await saveChanges();
    if (pendingSelection) confirmSelection(pendingSelection);
    setPendingSelection(null);
  };

  const handleDiscardChanges = () => {
    setIsUnsavedModalOpen(false);
    setHasUnsavedChanges(false);
    if (pendingSelection) confirmSelection(pendingSelection);
    setPendingSelection(null);
  };

  // Data Fetching
  const fetchSavedMedications = async () => {
    const { data, error } = await supabase.from('saved_medications').select('*').order('name');
    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        ...item,
        freqMorning: item.freq_morning,
        freqNoon: item.freq_noon,
        freqNight: item.freq_night,
      }));
      setSavedMedications(mappedData as Medication[]);
    }
  };

  const fetchAutofillKeywords = async () => {
    const { data } = await supabase.from('autofill_keywords').select('*');
    if (data) setAutofillKeywords(data);
  };

  const fetchTextShortcuts = async () => {
    const { data } = await supabase.from('text_shortcuts').select('*');
    if (data) setTextShortcuts(data);
  };

  const fetchReferralDoctors = async () => {
    const { data } = await supabase.from('referral_doctors').select('*').order('name');
    if (data) setReferralDoctors(data);
  };

  useEffect(() => {
    fetchSavedMedications();
    fetchAutofillKeywords();
    fetchTextShortcuts();
    fetchReferralDoctors();
  }, []);



  // Handlers

  /**
   * Updates patient demographic details.
   * Triggers autosave flag.
   */
  const handlePatientDetailsChange = useCallback((field: string, value: string) => {
    setEditablePatientDetails(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAge(val === '' ? '' : Number(val));
    if (val && editablePatientDetails) {
      const estimatedYear = new Date().getFullYear() - Number(val);
      const currentDob = new Date(editablePatientDetails.dob || new Date());
      currentDob.setFullYear(estimatedYear);
      setEditablePatientDetails(prev => {
        if (!prev) return null;
        return { ...prev, dob: format(currentDob, 'yyyy-MM-dd'), is_dob_estimated: true };
      });
      setHasUnsavedChanges(true);
      setCalendarDate(currentDob);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setIsPatientDatePickerOpen(false);
    if (!editablePatientDetails) return;
    setEditablePatientDetails(prev => {
      if (!prev) return null;
      return { ...prev, dob: format(date || new Date(), 'yyyy-MM-dd'), is_dob_estimated: false };
    });
    setHasUnsavedChanges(true);
    if (date) {
      setAge(calculateAge(date));
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

  const handleAppendSuggestion = (field: string, suggestion: string) => {
    setExtraData(prev => {
      const currentVal = prev[field as keyof typeof prev] as string || '';
      const separator = currentVal.trim() ? '\n' : '';
      return { ...prev, [field]: currentVal + separator + suggestion };
    });
    setHasUnsavedChanges(true);
  };



  /**
   * Handles changes to "Extra Data" fields (Complaints, Findings, etc.).
   * Includes logic for:
   * - Text Shortcut Expansion (triggers replacement)
   * - Special "followup" shortcuts (e.g., "3d.", "2w.")
   * - Cursor position management after expansion
   */
  const handleExtraChange = useCallback((field: string, value: any, cursorPosition?: number | null) => {
    if (field === 'complaints' && typeof value === 'string' && value.includes('//')) {
      setIsShortcutModalOpen(true);
      setExtraData(prev => ({ ...prev, complaints: value.replace('//', '') })); // Remove the trigger
      return;
    }

    if (typeof value === 'string' && (field === 'complaints' || field === 'findings' || field === 'diagnosis' || field === 'advice' || field === 'followup' || field === 'personalNote' || field === 'procedure' || field === 'investigations' || field === 'referred_to')) {
      let processedValue = value;
      let newCursor = cursorPosition || value.length;

      // Special Followup Shortcuts (Restored)
      if (field === 'followup') {
        const shortcutRegex = /(\d+)([dwm])\./i;
        const match = value.match(shortcutRegex);
        if (match) {
          const shortcut = match[0];
          const count = parseInt(match[1], 10);
          const unitChar = match[2].toLowerCase();
          let unitKey = '';
          switch (unitChar) {
            case 'd': unitKey = count === 1 ? 'day' : 'day_plural'; break;
            case 'w': unitKey = count === 1 ? 'week' : 'week_plural'; break;
            case 'm': unitKey = count === 1 ? 'month' : 'month_plural'; break;
          }
          if (unitKey) {
            const unitText = t(unitKey);
            const expandedText = t('followup_message_structure', { count, unit: unitText });
            const shortcutIndex = value.indexOf(shortcut);
            if (shortcutIndex !== -1) {
              processedValue = value.replace(shortcut, expandedText);
              newCursor = shortcutIndex + expandedText.length;

              setExtraData(prev => ({ ...prev, [field]: processedValue }));
              setTimeout(() => {
                if (followupRef.current) {
                  followupRef.current.setSelectionRange(newCursor, newCursor);
                }
              }, 0);
              setHasUnsavedChanges(true);
              return;
            }
          }
        }
      }

      const processed = processTextShortcuts(processedValue, newCursor, textShortcuts);
      if (processed) {
        setExtraData(prev => ({ ...prev, [field]: processed.newValue }));
        // We need to set cursor position, using a ref or state
        setTimeout(() => {
          const refMap: any = {
            complaints: complaintsRef.current,
            findings: findingsRef.current,
            diagnosis: diagnosisRef.current,
            advice: adviceRef.current,
            followup: followupRef.current,
            procedure: procedureRef.current,
            investigations: investigationsRef.current,
            referred_to: referredToRef.current,
          };
          if (refMap[field]) {
            refMap[field].setSelectionRange(processed.newCursorPosition, processed.newCursorPosition);
          }
        }, 0);
        setHasUnsavedChanges(true);
        return;
      }
    }

    setExtraData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, [t, textShortcuts]);

  /**
   * Adds a medication to the list from a suggestion.
   * Handles language-specific fields (Telugu support) if applicable.
   */
  const handleMedicationSuggestionClick = useCallback((med: Medication) => {
    const isTelugu = i18n.language === 'te';
    const newMed: Medication = {
      id: crypto.randomUUID(),
      name: med.name,
      dose: med.dose || '',
      freqMorning: med.freqMorning || false,
      freqNoon: med.freqNoon || false,
      freqNight: med.freqNight || false,
      frequency: (isTelugu && med.frequency_te) ? med.frequency_te : (med.frequency || ''),
      duration: (isTelugu && med.duration_te) ? med.duration_te : (med.duration || ''),
      instructions: (isTelugu && med.instructions_te) ? med.instructions_te : (med.instructions || ''),
      notes: (isTelugu && med.notes_te) ? med.notes_te : (med.notes || '')
    };

    setExtraData(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
    setHasUnsavedChanges(true);
  }, [i18n.language]);

  /**
   * Handles changes to individual medication fields.
   * Includes logic for:
   * - 'name' field shortcuts: '//' for Modal, '@' for Bundle
   * - Text shortcuts expansion for all text fields
   */
  const handleMedChange = useCallback((index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => {
    setExtraData(prev => {
      const newMeds = [...prev.medications];
      const currentVal = newMeds[index][field];

      if (field === 'name' && typeof value === 'string' && value.includes('//')) {
        setIsMedicationsModalOpen(true);
        newMeds[index] = { ...newMeds[index], name: value.replace('//', '') };
        return { ...prev, medications: newMeds };
      }

      if (field === 'name' && typeof value === 'string' && value.includes('@')) {
        setIsKeywordModalOpen(true);
        const med = newMeds[index];
        newMeds[index] = { ...med, name: med.name.replace('@', '') };
        return { ...prev, medications: newMeds };
      }

      if (typeof value === 'string' && (field === 'name' || field === 'dose' || field === 'frequency' || field === 'duration' || field === 'instructions' || field === 'notes')) {
        const processed = processTextShortcuts(value, cursorPosition || value.length, textShortcuts);
        if (processed) {
          newMeds[index] = { ...newMeds[index], [field]: processed.newValue };
          // Cursor update logic
          setTimeout(() => {
            const refs = {
              name: medicationNameInputRef.current,
              frequency: medFrequencyRefs.current[`${index}.frequency`],
              duration: medDurationRefs.current[`${index}.duration`],
              instructions: medInstructionsRefs.current[`${index}.instructions`],
              notes: medNotesRefs.current[`${index}.notes`],
            };
            const ref = refs[field as keyof typeof refs];
            if (ref) {
              (ref as any).setSelectionRange(processed.newCursorPosition, processed.newCursorPosition);
            }
          }, 0);
          return { ...prev, medications: newMeds };
        }
      }

      newMeds[index] = { ...newMeds[index], [field]: value };
      return { ...prev, medications: newMeds };
    });
    setHasUnsavedChanges(true);
  }, [textShortcuts]);

  const addMedication = useCallback(() => {
    const newMed: Medication = {
      id: crypto.randomUUID(),
      name: '', dose: '', frequency: '', duration: '', instructions: '', notes: '',
      freqMorning: false, freqNoon: false, freqNight: false
    };
    setExtraData(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
    setHasUnsavedChanges(true);
  }, []);

  const removeMedication = useCallback((index: number) => {
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  }, []);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setExtraData((prev) => {
        const oldIndex = prev.medications.findIndex((m) => m.id === active.id);
        const newIndex = prev.medications.findIndex((m) => m.id === over?.id);
        return {
          ...prev,
          medications: arrayMove(prev.medications, oldIndex, newIndex),
        };
      });
      setHasUnsavedChanges(true);
    }
  }, []);

  // Suggestions Helpers (Protocol Logic)
  interface AutofillProtocol {
    id: number;
    keywords: string[];
    medication_ids: number[];
    advice?: string;
    advice_te?: string;
    investigations?: string;
    followup?: string;
    followup_te?: string;
  }

  const { suggestedAdvice, suggestedInvestigations, suggestedFollowup, suggestedMedications } = useMemo(() => {
    const inputDerivedSuggestions = {
      advice: new Set<string>(),
      investigations: new Set<string>(),
      followup: new Set<string>(),
      medicationIds: new Set<number>()
    };

    const inputText = `${extraData.complaints} ${extraData.diagnosis}`.toLowerCase();
    const isTelugu = i18n.language === 'te';

    (autofillKeywords as AutofillProtocol[]).forEach(protocol => {
      const match = (protocol.keywords || []).some(k => inputText.includes(k.toLowerCase()));
      if (match) {
        if (protocol.investigations) {
          protocol.investigations.split('\n').filter(Boolean).forEach(s => inputDerivedSuggestions.investigations.add(s.trim()));
        }

        const adviceText = (isTelugu && protocol.advice_te) ? protocol.advice_te : protocol.advice;
        if (adviceText) {
          adviceText.split('\n').filter(Boolean).forEach(s => inputDerivedSuggestions.advice.add(s.trim()));
        }

        const followupText = (isTelugu && protocol.followup_te) ? protocol.followup_te : protocol.followup;
        if (followupText) {
          followupText.split('\n').filter(Boolean).forEach(s => inputDerivedSuggestions.followup.add(s.trim()));
        }

        if (protocol.medication_ids) {
          protocol.medication_ids.forEach(id => inputDerivedSuggestions.medicationIds.add(id));
        }
      }
    });

    const medications = savedMedications.filter(m => {
      // Handle both number/string ID mismatch if necessary, though Supabase returns what column is.
      // Assuming savedMedications have IDs that match protocol.medication_ids
      return inputDerivedSuggestions.medicationIds.has(Number(m.id)) || inputDerivedSuggestions.medicationIds.has(String(m.id) as any);
    });

    // Logic: Only show protocol-matched medications.
    const finalMedications = medications;

    const currentlyAddedMedNames = new Set(extraData.medications.map(m => (m.name || '').toLowerCase()));

    return {
      suggestedAdvice: Array.from(inputDerivedSuggestions.advice).filter(s => !extraData.advice.includes(s)),
      suggestedInvestigations: Array.from(inputDerivedSuggestions.investigations).filter(s => !extraData.investigations.includes(s)),
      suggestedFollowup: Array.from(inputDerivedSuggestions.followup).filter(s => !extraData.followup.includes(s)),
      suggestedMedications: finalMedications.filter(m => !currentlyAddedMedNames.has((m.name || '').toLowerCase()))
    };
  }, [autofillKeywords, extraData.complaints, extraData.diagnosis, extraData.advice, extraData.investigations, extraData.followup, extraData.medications, i18n.language, savedMedications]);

  const suggestedFindings = useMemo(() => [], []);


  const handleSaveAndPrint = async () => {
    const saved = await saveChanges({ markAsCompleted: true });
    if (saved) setIsReadyToPrint(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent, c: Consultation) => {
    e.stopPropagation();
    setPendingSelection(c);
    setIsDeleteModalOpen(true);
    setIsOnlyConsultation(false); // Reset first

    try {
      const { count, error } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', c.patient.id);

      if (!error && count !== null) {
        setIsOnlyConsultation(count === 1);
      }
    } catch (err) {
      console.error("Error checking consultation count:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingSelection) return;
    const c = pendingSelection;
    setIsDeleteModalOpen(false);

    try {
      const { error } = await supabase.from('consultations').delete().eq('id', c.id);
      if (error) throw error;

      if (deletePatientAlso && isOnlyConsultation) {
        const { error: pError } = await supabase.from('patients').delete().eq('id', c.patient.id);
        if (pError) console.error("Error deleting patient", pError);
      }

      setAllConsultations(prev => prev.filter(x => x.id !== c.id));
      if (selectedConsultation?.id === c.id) {
        setSelectedConsultation(null);
        setEditablePatientDetails(null);
      }
      toast({ title: "Deleted", description: "Consultation deleted." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
    }
  };

  // Sync Conflict Resolution
  // Sync Conflict Resolution handled by hook: resolveConflict

  // Sync Patient Conflict Resolution handled by hook: resolvePatientConflict

  // Filter Consultations
  const filteredConsultations = useMemo(() => {
    return allConsultations.filter(c => {
      // If a hospital is selected, filter by it.
      // BUT, if the consultation has NO location (e.g. legacy or offline-synced), show it anywhere.
      if (selectedHospital?.name && c.location && c.location !== selectedHospital.name) {
        return false;
      }
      return true;
    });
  }, [allConsultations, selectedHospital]);

  const pendingConsultations = filteredConsultations.filter(c => c.status === 'pending');
  const evaluationConsultations = filteredConsultations.filter(c => c.status === 'under_evaluation');
  const completedConsultations = filteredConsultations.filter(c => c.status === 'completed');


  // Printing
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setIsReadyToPrint(false),
  });

  const handleCertificatePrint = useReactToPrint({
    contentRef: certificatePrintRef,
    onAfterPrint: () => setIsReadyToPrintCertificate(false),
  });

  const handleReceiptPrint = useReactToPrint({
    contentRef: receiptPrintRef,
    onAfterPrint: () => setIsReadyToPrintReceipt(false),
  });

  useEffect(() => {
    if (isReadyToPrint && printRef.current) handlePrint();
  }, [isReadyToPrint]);

  useEffect(() => {
    if (isReadyToPrintCertificate && certificatePrintRef.current) handleCertificatePrint();
  }, [isReadyToPrintCertificate]);

  useEffect(() => {
    if (isReadyToPrintReceipt && receiptPrintRef.current) handleReceiptPrint();
  }, [isReadyToPrintReceipt]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveChanges();
      }
      // Print: Ctrl/Cmd + P
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handleSaveAndPrint();
      }
      // Search: Ctrl/Cmd + F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      // Add Medication: Ctrl/Cmd + M

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges, handleSaveAndPrint, addMedication]);


  return (
    <>
      <div className="container mx-auto p-4 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ConsultationSidebar
            selectedHospitalName={selectedHospital.name}
            onHospitalSelect={(name) => {
              const h = HOSPITALS.find(x => x.name === name);
              if (h) {
                setSelectedHospital(h);
                setIsGpsEnabled(false);
              }
            }}
            isGpsEnabled={isGpsEnabled}
            onToggleGps={() => setIsGpsEnabled(!isGpsEnabled)}
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              setIsConsultationDatePickerOpen(false);
            }}
            isConsultationDatePickerOpen={isConsultationDatePickerOpen}
            setIsConsultationDatePickerOpen={setIsConsultationDatePickerOpen}
            onSearchClick={() => setIsSearchModalOpen(true)}
            onRegisterClick={() => setIsRegistrationModalOpen(true)}
            onRefreshClick={() => fetchConsultations()}
            isFetchingConsultations={isFetchingConsultations}
            totalConsultationsCount={filteredConsultations.length}
            pendingConsultations={pendingConsultations}
            evaluationConsultations={evaluationConsultations}
            completedConsultations={completedConsultations}
            selectedConsultationId={selectedConsultation?.id}
            onSelectConsultation={handleSelectConsultation}
            onDeleteClick={handleDeleteClick}
            pendingSyncIds={pendingSyncIds}
            personalNote={extraData.personalNote}
            onPersonalNoteChange={(val) => handleExtraChange('personalNote', val)}
            isEvaluationCollapsed={isEvaluationCollapsed}
            setIsEvaluationCollapsed={setIsEvaluationCollapsed}
            isCompletedCollapsed={isCompletedCollapsed}
            setIsCompletedCollapsed={setIsCompletedCollapsed}
            isTimerVisible={isTimerVisible}
            setIsTimerVisible={setIsTimerVisible}
            timerSeconds={timerSeconds}
          />

          <div className="lg:col-span-3 min-h-[calc(100vh-2rem)]">
            {selectedConsultation && editablePatientDetails ? (
              <div className="space-y-6">
                <PatientDemographics
                  patient={editablePatientDetails}
                  visitType={extraData.visit_type}
                  onVisitTypeChange={(t) => handleExtraChange('visit_type', t)}
                  lastVisitDate={lastVisitDate}
                  onHistoryClick={() => setIsHistoryModalOpen(true)}
                  onPatientDetailsChange={handlePatientDetailsChange}
                  isPatientDatePickerOpen={isPatientDatePickerOpen}
                  setIsPatientDatePickerOpen={setIsPatientDatePickerOpen}
                  calendarDate={calendarDate}
                  setCalendarDate={setCalendarDate}
                  age={age}
                  onAgeChange={handleAgeChange}
                  onDateChange={handleDateChange}
                  handleYearChange={handleYearChange}
                  handleMonthChange={handleMonthChange}
                />

                <VitalsForm
                  weight={extraData.weight}
                  bp={extraData.bp}
                  temperature={extraData.temperature}
                  allergy={extraData.allergy}
                  onExtraChange={handleExtraChange}
                />

                <ClinicalNotesForm
                  extraData={extraData}
                  onExtraChange={handleExtraChange}
                  complaintsRef={complaintsRef}
                  findingsRef={findingsRef}
                  investigationsRef={investigationsRef}
                  diagnosisRef={diagnosisRef}
                  procedureRef={procedureRef}
                  adviceRef={adviceRef}
                  followupRef={followupRef}
                  referredToRef={referredToRef}
                  suggestedInvestigations={suggestedInvestigations}
                  suggestedAdvice={suggestedAdvice}
                  suggestedFollowup={suggestedFollowup}
                  onInvestigationSuggestionClick={(val) => handleAppendSuggestion('investigations', val)}
                  onAdviceSuggestionClick={(val) => handleAppendSuggestion('advice', val)}
                  onFollowupSuggestionClick={(val) => handleAppendSuggestion('followup', val)}
                  matchedGuides={matchedGuides}
                  isProcedureExpanded={isProcedureExpanded}
                  setIsProcedureExpanded={setIsProcedureExpanded}
                  isReferredToExpanded={isReferredToExpanded}
                  setIsReferredToExpanded={setIsReferredToExpanded}
                  referralDoctors={referralDoctors}
                />

                <MedicationManager
                  medications={extraData.medications}
                  sensors={sensors}
                  handleDragEnd={handleDragEnd}
                  handleMedChange={handleMedChange}
                  removeMedication={removeMedication}
                  savedMedications={savedMedications}
                  setExtraData={setExtraData}
                  medicationNameInputRef={medicationNameInputRef}
                  fetchSavedMedications={fetchSavedMedications}
                  i18n={i18n}
                  medFrequencyRefs={medFrequencyRefs}
                  medDurationRefs={medDurationRefs}
                  medInstructionsRefs={medInstructionsRefs}
                  medNotesRefs={medNotesRefs}
                  addMedication={addMedication}
                  suggestedMedications={suggestedMedications}
                  handleMedicationSuggestionClick={handleMedicationSuggestionClick}
                />

                <FollowUpSection
                  followup={extraData.followup}
                  onExtraChange={handleExtraChange}
                  followupRef={followupRef}
                  suggestedFollowup={suggestedFollowup}
                  onFollowupSuggestionClick={(val) => handleAppendSuggestion('followup', val)}
                />

                <ConsultationActions
                  isOnline={isOnline}
                  isSaving={isSaving}
                  onSave={saveChanges}
                  onSaveAndPrint={handleSaveAndPrint}
                  onSaveBundleClick={handleSaveBundleClick}
                  onMedicalCertificateClick={() => setIsMedicalCertificateModalOpen(true)}
                  onReceiptClick={() => setIsReceiptModalOpen(true)}
                  onManageMedicationsClick={() => setIsMedicationsModalOpen(true)}
                  onManageKeywordsClick={() => setIsKeywordModalOpen(true)}
                  onManageShortcutsClick={() => setIsShortcutModalOpen(true)}
                  onSendCompletionClick={handleOpenCompletionModal}
                  isAutoSendEnabled={isAutoSendEnabled}
                  onToggleAutoSend={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-muted/30 rounded-lg">
                <p className="text-lg text-muted-foreground">Select a patient to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Components */}
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={printRef}>{selectedConsultation && editablePatientDetails && <Prescription patient={editablePatientDetails} consultation={cleanConsultationData(extraData)} consultationDate={selectedDate || new Date()} age={age} language={i18n.language} logoUrl={selectedHospital.logoUrl} className="min-h-[297mm]" visitType={extraData.visit_type} forceDesktop={true} />}</div></div>
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={certificatePrintRef}>{selectedConsultation && editablePatientDetails && certificateData && <MedicalCertificate patient={editablePatientDetails} diagnosis={extraData.diagnosis} certificateData={certificateData} />}</div></div>
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={receiptPrintRef}>{selectedConsultation && editablePatientDetails && receiptData && <Receipt patient={editablePatientDetails} receiptData={receiptData} />}</div></div>

      {/* Modals */}
      <SavedMedicationsModal isOpen={isMedicationsModalOpen} onClose={() => setIsMedicationsModalOpen(false)} onMedicationsUpdate={fetchSavedMedications} />
      <KeywordManagementModal isOpen={isKeywordModalOpen} onClose={() => { setIsKeywordModalOpen(false); setKeywordModalPrefill(null); }} prefilledData={keywordModalPrefill} />
      <UnsavedChangesModal isOpen={isUnsavedModalOpen} onConfirm={handleConfirmSave} onDiscard={handleDiscardChanges} />
      <PatientHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} patientId={selectedConsultation?.patient.id || null} />
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
      <TextShortcutManagementModal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)} onUpdate={fetchTextShortcuts} />
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
          patientName={editablePatientDetails.name}
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
              location={selectedHospital.name}
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
          onResolve={resolveConflict}
          localData={conflictData.local}
          serverData={conflictData.server}
        />
      )}
      {patientConflictData && (
        <PatientConflictModal
          isOpen={!!patientConflictData}
          onClose={() => setPatientConflictData(null)}
          onResolve={resolvePatientConflict}
          offlinePatient={patientConflictData.offlinePatient}
          conflictingPatients={patientConflictData.conflictingPatients}
        />
      )}
      <CompletionMessageModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        patientPhone={editablePatientDetails?.phone || ''}
        initialMessage={completionMessage}
        onMessageChange={(newMessage) => {
          setCompletionMessage(newMessage);
          setIsMessageManuallyEdited(true);
        }}
      />
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

export default ConsultationPage;