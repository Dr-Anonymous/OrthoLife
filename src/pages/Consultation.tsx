import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { toast } from '@/hooks/use-toast';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { Loader2, IndianRupee, ChevronDown } from 'lucide-react';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { cleanConsultationData, pruneEmptyFields, cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import SavedMedicationsModal from '@/components/consultation/SavedMedicationsModal';
import KeywordManagementModal, { KeywordPrefillData } from '@/components/consultation/KeywordManagementModal';
import UnsavedChangesModal from '@/components/consultation/UnsavedChangesModal';
import PatientHistoryModal from '@/components/consultation/PatientHistoryModal';
import TextShortcutManagementModal from '@/components/consultation/TextShortcutManagementModal';

import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/consultation/Prescription';
import { MedicalCertificate, MedicalCertificateModal, CertificateData } from '@/components/consultation/MedicalCertificate';
import { Receipt, ReceiptModal, ReceiptData } from '@/components/consultation/Receipt';
import { useHospitals } from '@/context/HospitalsContext';
import { getDistance } from '@/lib/geolocation';
import ConsultationRegistration from '@/components/consultation/ConsultationRegistration';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConsultationSearchModal } from '@/components/consultation/ConsultationSearchModal';
import { LinkPatientModal } from '@/components/consultation/LinkPatientModal';
import { CompletionMessageModal } from '@/components/consultation/CompletionMessageModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { generateCompletionMessage as generateCompletionMessageUtil } from '@/lib/consultation-utils';


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
  const { hospitals, isLoading: isHospitalsLoading } = useHospitals();

  // Local Translations
  const TRANSLATIONS = {
    en: {
      day: "day",
      day_plural: "days",
      week: "week",
      week_plural: "weeks",
      month: "month",
      month_plural: "months",
      followup_message_structure: "after {{count}} {{unit}}, or immediately if symptoms worsen."
    },
    te: {
      day: "రోజు తర్వాత",
      day_plural: "రోజుల తర్వాత",
      week: "వారం తర్వాత",
      week_plural: "వారాల తర్వాత",
      month: "నెల తర్వాత",
      month_plural: "నెలల తర్వాత",
      followup_message_structure: "{{count}} {{unit}} / వెంటనే- ఏవైనా లక్షణాలు తీవ్రమైతే."
    }
  };

  const t = useCallback((key: string, options?: { lng?: string, count?: number, unit?: string }) => {
    const lang = (options?.lng || 'en') as keyof typeof TRANSLATIONS;
    let text = (TRANSLATIONS[lang] as any)[key] || key;

    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  }, []);

  // --- Data State ---
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [completedCount, setCompletedCount] = useState(0); // Auto-refresh counter
  const [isEvaluationCollapsed, setIsEvaluationCollapsed] = useState(true);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [initialPatientDetails, setInitialPatientDetails] = useState<Patient | null>(null);
  const [initialExtraData, setInitialExtraData] = useState<any>(null);
  const [initialLocation, setInitialLocation] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHospital') || '';
    }
    return '';
  });
  const [initialLanguage, setInitialLanguage] = useState<string>('te');

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
    procedure_fee: '',
    procedure_consultant_cut: '',
    referred_to: '',
    referred_to_list: [] as string[],
    referred_by: '',
    referral_amount: '',
    visit_type: 'paid', // default
  });

  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);

  // Modals
  // --- Modals State ---
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Consultation | null>(null);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePatientAlso, setDeletePatientAlso] = useState<boolean>(false);

  // History Modal State - generalized to support any patient
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);

  const handleOpenHistory = (patientId: string) => {
    setHistoryPatientId(patientId);
    setIsHistoryModalOpen(true);
  };
  const [isOnlyConsultation, setIsOnlyConsultation] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLinkPatientModalOpen, setIsLinkPatientModalOpen] = useState(false);
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

  const [consultationLanguage, setConsultationLanguage] = useState<string>('te');


  // --- Derived State for Location ---
  const selectedHospital = useMemo(() => {
    if (hospitals.length === 0) return { name: 'OrthoLife', logoUrl: '', lat: 0, lng: 0, settings: { op_fees: 0, free_visit_duration_days: 14 } };
    return hospitals.find(h => h.name === initialLocation) || hospitals[0];
  }, [hospitals, initialLocation]);

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


  // Keyword Modal Prefill
  const [keywordModalPrefill, setKeywordModalPrefill] = useState<KeywordPrefillData | null>(null);

  const handleSaveBundleClick = () => {
    const isTelugu = consultationLanguage === 'te';
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
  const [isFinancialExpanded, setIsFinancialExpanded] = useState(false);

  // Timer (Refactored)
  const { timerSeconds, isTimerVisible, setIsTimerVisible, stopTimer, pauseTimer, isTimerPausedRef } = useConsultationTimer(selectedConsultation);

  // Date Pickers
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);

  // Doctor Profile Visibility (Location-Aware)
  const [showDoctorProfile, setShowDoctorProfile] = useState<boolean>(true);

  // Load profile preference on location change
  useEffect(() => {
    if (selectedHospital.name) {
      const key = `showDoctorProfile_${selectedHospital.name}`;
      const stored = localStorage.getItem(key);
      // Default to true if not set
      setShowDoctorProfile(stored !== null ? JSON.parse(stored) : true);
    }
  }, [selectedHospital.name]);

  const toggleDoctorProfile = (checked: boolean) => {
    setShowDoctorProfile(checked);
    if (selectedHospital.name) {
      localStorage.setItem(`showDoctorProfile_${selectedHospital.name}`, JSON.stringify(checked));
    }
  };

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
    return getMatchingGuides(debouncedAdvice, guides, consultationLanguage);
  }, [debouncedAdvice, guides, consultationLanguage]);

  // Timer Stop Logic handled by hook

  const confirmSelection = useCallback(async (consultation: Consultation) => {
    patientSelectionCounter.current += 1;
    setSelectedConsultation(consultation);
    const normalizedPatient = {
      ...consultation.patient,
      secondary_phone: consultation.patient.secondary_phone || '',
    };
    setEditablePatientDetails(normalizedPatient);
    setInitialPatientDetails(normalizedPatient);
    if (consultation.patient.dob) {
      setAge(calculateAge(new Date(consultation.patient.dob)));
      setCalendarDate(new Date(consultation.patient.dob));
    }

    const savedData = consultation.consultation_data || {};
    // Handle Referred To List Backward Compatibility
    let loadedReferredToList = savedData.referred_to_list || [];
    if ((!loadedReferredToList || loadedReferredToList.length === 0) && savedData.referred_to) {
      loadedReferredToList = [savedData.referred_to];
    }

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
      personalNote: savedData.personalNote || savedData.personal_note || '',
      procedure: savedData.procedure || '',

      procedure_fee: consultation.procedure_fee !== null ? String(consultation.procedure_fee) : '',
      procedure_consultant_cut: consultation.procedure_consultant_cut !== null ? String(consultation.procedure_consultant_cut) : '',
      referred_by: consultation.referred_by || '',
      referral_amount: consultation.referral_amount !== null ? String(consultation.referral_amount) : '',

      referred_to: savedData.referred_to || '',
      referred_to_list: loadedReferredToList,

      visit_type: savedData.visit_type || consultation.visit_type || 'paid',
    };
    setExtraData(newExtraData as any);
    setInitialExtraData(newExtraData);
    setInitialLocation(consultation.location || (hospitals.length > 0 ? hospitals[0].name : '')); // Use hospitals[0] or empty string
    const lang = consultation.language || 'te';
    setInitialLanguage(lang);
    setConsultationLanguage(lang);
    // i18n.changeLanguage(lang); // CAUTION: Do not change global language


    setIsProcedureExpanded(!!newExtraData.procedure);
    setIsReferredToExpanded(!!newExtraData.referred_to);


    // --- Last Visit Date Logic ---
    // We display the last visit date in the Patient Demographics header.
    // 1. Optimized Path: Check if the backend already provided `last_visit_date` (Existing Consultations).
    // 2. Fallback Path: If not (New Consultations), explicitly fetch it from the backend using the 'last_visit' action.
    if (consultation.patient.id && !String(consultation.patient.id).startsWith('offline-')) {
      setLastVisitDate(consultation.last_visit_date || 'First Consultation');
    } else {
      setLastVisitDate(null);
    }

    // Auto-focus Complaints
    setTimeout(() => {
      complaintsRef.current?.focus();
    }, 100);
  }, [hospitals]);



  /**
   * Timer Logic
   * Tracks the duration of the consultation.
   * Starts automatically when a non-completed consultation is selected.
   * Pauses when switching away or manually paused.
   */
  // Timer Effect handled by hook


  const fetchConsultations = useCallback(async (date: Date = selectedDate || new Date(), patientId?: string, consultationData?: any) => {
    // Offline Guard
    if (!isOnline) {
      console.log("Offline mode: Skipping fetchConsultations");
      setAllConsultations([]); // Or load local if desired, but empty is safe to stop spinner
      setIsFetchingConsultations(false);
      return;
    }

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
    } catch (error: any) {
      // Suppress network errors if we went offline mid-request
      const isNetworkError = error.message?.includes('Failed to send a request') || error.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('Error fetching consultations:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch consultations.' });
      }
    } finally {
      setIsFetchingConsultations(false);
    }
  }, [selectedDate, selectedHospital, confirmSelection, isOnline]);

  useEffect(() => {
    if (selectedHospital.name) { // Only fetch if a hospital is selected
      fetchConsultations();
    }
  }, [fetchConsultations, selectedHospital.name]);

  /**
   * GPS Logic
   * Automatically selects the nearest hospital based on the user's current location.
   * Only runs if GPS is enabled in settings.
   */
  useEffect(() => {
    // GPS Logic
    if (isGpsEnabled && navigator.geolocation && hospitals.length > 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          let closest = hospitals[0];
          let minDistance = Infinity;

          hospitals.forEach(hospital => {
            const distance = getDistance(latitude, longitude, hospital.lat, hospital.lng);
            if (distance < minDistance) {
              minDistance = distance;
              closest = hospital;
            }
          });

          if (closest.name !== selectedHospital.name) {
            setInitialLocation(closest.name); // Update initialLocation to trigger selectedHospital re-evaluation
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
  }, [isGpsEnabled, selectedHospital.name, hospitals]);

  // Use useCallback to access latest state if needed, or pass args
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(() => {
    const stored = localStorage.getItem('isAutoSendEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const generateCompletionMessage = (patient: any, guidesMatched: any[]) => {
    // Use selected consultation language
    return generateCompletionMessageUtil(patient, guidesMatched, consultationLanguage);
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

  // Helper for robust patient comparison
  // Moved outside or kept here, but effectively used for derived state too

  // Derived state to check for changes
  const hasChanges = useMemo(() => {
    if (!selectedConsultation || !editablePatientDetails || !initialPatientDetails) return false;

    const arePatientsEqual = (p1: any, p2: any) => {
      if (!p1 || !p2) return p1 === p2;
      const normalize = (val: any) => val === null || val === undefined ? '' : String(val).trim();
      return (
        normalize(p1.name) === normalize(p2.name) &&
        normalize(p1.phone) === normalize(p2.phone) &&
        normalize(p1.dob) === normalize(p2.dob) &&
        normalize(p1.sex) === normalize(p2.sex) &&
        normalize(p1.secondary_phone) === normalize(p2.secondary_phone) &&
        normalize(p1.is_dob_estimated) === normalize(p2.is_dob_estimated)
      );
    };

    const patientDetailsChanged = !arePatientsEqual(editablePatientDetails, initialPatientDetails);

    // Prune empty strings before comparing extraData to avoid false positives on initialized fields
    // Actually, JSON.stringify is fine if we assume structure matches. 
    // To be closer to previous logic:
    const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);

    // Check Status Change (if manually changed? mostly status is derived or set on print)
    // Actually status is usually changed by printing. 
    // Let's stick to explicit fields for "unsaved" warning.

    const locationChanged = selectedHospital.name !== initialLocation;
    const languageChanged = consultationLanguage !== initialLanguage;

    return patientDetailsChanged || extraDataChanged || locationChanged || languageChanged;
  }, [selectedConsultation, editablePatientDetails, initialPatientDetails, extraData, initialExtraData, selectedHospital, initialLocation, consultationLanguage, initialLanguage]);

  const saveChanges = async (options: { markAsCompleted?: boolean, skipToast?: boolean } = {}) => {
    if (!selectedConsultation || !editablePatientDetails) throw new Error("No consultation selected");

    // Re-using logic from hasChanges essentially, but we need variables for saving condition
    const hasMedsOrFollowup = extraData.medications.length > 0 || (extraData.followup && extraData.followup.trim() !== '');

    let newStatus = selectedConsultation.status;
    if (options.markAsCompleted) {
      newStatus = hasMedsOrFollowup ? 'completed' : 'under_evaluation';
    }
    const statusChanged = newStatus !== selectedConsultation.status;

    // Use the derived check + status check
    const shouldSave = hasChanges || statusChanged;

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

      // Extract Top-level columns from extraData
      const {
        procedure_fee,
        procedure_consultant_cut,
        referred_by,
        referral_amount,
        referred_to, // Extract legacy if present
        referred_to_list, // Extract new list
        ...jsonExtraData
      } = restExtraData;

      const dataToSave = pruneEmptyFields({
        ...jsonExtraData,
        // Join list to string for legacy/reporting compatibility
        referred_to: referred_to_list && referred_to_list.length > 0 ? referred_to_list.join(', ') : '',
        referred_to_list: referred_to_list || [],
        medications: (restExtraData.medications || []).map(cleanMedicationForSave)
      });

      const saveToOfflineStore = async () => {
        const offlineData = {
          patientDetails: editablePatientDetails,
          extraData: dataToSave,
          status: newStatus,
          timestamp: new Date().toISOString(),
          language: consultationLanguage,
        };
        await offlineStore.setItem(selectedConsultation.id, offlineData);
        toast({ title: 'Saved Locally', description: 'Changes will sync when online.' });
      };

      if (!isOnline) {
        await saveToOfflineStore();
      } else {
        try {
          // Re-evaluate patientDetailsChanged based on current state vs initial state
          const arePatientsEqual = (p1: any, p2: any) => {
            if (!p1 || !p2) return p1 === p2;
            const normalize = (val: any) => val === null || val === undefined ? '' : String(val).trim();
            return (
              normalize(p1.name) === normalize(p2.name) &&
              normalize(p1.phone) === normalize(p2.phone) &&
              normalize(p1.dob) === normalize(p2.dob) &&
              normalize(p1.sex) === normalize(p2.sex) &&
              normalize(p1.secondary_phone) === normalize(p2.secondary_phone) &&
              normalize(p1.is_dob_estimated) === normalize(p2.is_dob_estimated)
            );
          };
          const patientDetailsChanged = !arePatientsEqual(editablePatientDetails, initialPatientDetails);

          if (patientDetailsChanged) {
            const { error: patientUpdateError } = await supabase
              .from('patients')
              .update({
                name: editablePatientDetails.name,
                dob: editablePatientDetails.dob,
                sex: editablePatientDetails.sex,
                phone: editablePatientDetails.phone,
                is_dob_estimated: editablePatientDetails.is_dob_estimated,
                secondary_phone: editablePatientDetails.secondary_phone,
              })
              .eq('id', editablePatientDetails.id);
            if (patientUpdateError) throw new Error(`Failed to update patient details: ${patientUpdateError.message}`);
          }

          const consultationUpdatePayload: {
            consultation_data?: any, status?: string, visit_type?: string, location?: string, language?: string, duration?: number,
            procedure_fee?: number | null, procedure_consultant_cut?: number | null, referred_by?: string | null, referral_amount?: number | null
          } = {};

          // Re-evaluate locationChanged and languageChanged based on current state vs initial state
          const locationChanged = selectedHospital.name !== initialLocation;
          const languageChanged = consultationLanguage !== initialLanguage;
          const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);


          if (extraDataChanged || locationChanged || languageChanged) {
            consultationUpdatePayload.consultation_data = dataToSave;
            consultationUpdatePayload.visit_type = extraData.visit_type;
            consultationUpdatePayload.location = selectedHospital.name;
            consultationUpdatePayload.language = consultationLanguage;

            // New Columns
            consultationUpdatePayload.procedure_fee = procedure_fee ? Number(procedure_fee) : null;
            consultationUpdatePayload.procedure_consultant_cut = procedure_consultant_cut ? Number(procedure_consultant_cut) : null;
            consultationUpdatePayload.referred_by = referred_by || null;
            consultationUpdatePayload.referral_amount = referral_amount ? Number(referral_amount) : null;
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
          // setPendingSyncIds handled globally
          if (!options.skipToast) toast({ title: 'Success', description: 'Your changes have been saved.' });
        } catch (onlineError: any) {
          console.error("Online save failed:", onlineError);
          const isNetworkError =
            onlineError.message?.includes('Failed to send a request') ||
            onlineError.message?.includes('Failed to fetch') ||
            onlineError.message?.includes('NetworkError') ||
            onlineError.name === 'TypeError'; // fetch often throws TypeError on network fail

          if (isNetworkError) {
            console.log("Network error detected during save, falling back to offline store.");
            await saveToOfflineStore();
            return true;
          } else {
            throw onlineError; // Re-throw logic errors
          }
        }
      }

      const updatedConsultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: { ...extraData, language: consultationLanguage },
        visit_type: extraData.visit_type,
        location: selectedHospital.name,
        language: consultationLanguage,
        status: newStatus as 'pending' | 'completed' | 'under_evaluation',
        duration: timerSeconds,

        // Update top-level fields to ensure local state reflects changes without reload
        procedure_fee: extraData.procedure_fee ? Number(extraData.procedure_fee) : null,
        procedure_consultant_cut: extraData.procedure_consultant_cut ? Number(extraData.procedure_consultant_cut) : null,
        referred_by: extraData.referred_by || null,
        referral_amount: extraData.referral_amount ? Number(extraData.referral_amount) : null,
      };

      setSelectedConsultation(updatedConsultation);
      setInitialPatientDetails(editablePatientDetails);
      setInitialExtraData(extraData);
      setInitialLocation(selectedHospital.name);
      setInitialLanguage(consultationLanguage);

      const updatedAllConsultations = allConsultations.map(c =>
        c.id === updatedConsultation.id ? updatedConsultation : c
      );
      setAllConsultations(updatedAllConsultations);

      setAllConsultations(updatedAllConsultations);

      // Auto-Refresh Logic: Trigger background refresh every 5 completions
      if (statusChanged && newStatus === 'completed') {
        setCompletedCount(prev => {
          const newCount = prev + 1;
          if (newCount > 0 && newCount % 5 === 0) {
            console.log(`Auto-refreshing list (Completion #${newCount})`);
            fetchConsultations().catch(console.error);
          }
          return newCount;
        });
      }

      return true;
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save. Please try again." });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Offline Sync Logic (Refactored to Hook)
   * MOVED TO GLOBAL LEVEL (App.tsx)
   */
  // const {
  //   pendingSyncIds,
  //   setPendingSyncIds,
  //   conflictData,
  //   setConflictData,
  //   patientConflictData,
  //   setPatientConflictData,
  //   resolveConflict,
  //   resolvePatientConflict
  // } = useOfflineSync({
  //   isOnline,
  // });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser's native confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);



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
    // If passing from fetch logic, we might need to skip unsaved check or handle it
    if (hasChanges) {
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
    // No need to setHasUnsavedChanges(false) as we are selecting new data which resets initial/current state MATCH
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
            const unitText = t(unitKey, { lng: consultationLanguage });
            const expandedText = t('followup_message_structure', { count, unit: unitText, lng: consultationLanguage });
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
        return;
      }
    }

    setExtraData(prev => ({ ...prev, [field]: value }));
  }, [t, textShortcuts, consultationLanguage]);

  /**
   * Adds a medication to the list from a suggestion.
   * Handles language-specific fields (Telugu support) if applicable.
   */
  const handleMedicationSuggestionClick = useCallback((med: Medication) => {
    const isTelugu = consultationLanguage === 'te';
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
  }, [consultationLanguage]);

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
  }, [textShortcuts]);

  const addMedication = useCallback(() => {
    const newMed: Medication = {
      id: crypto.randomUUID(),
      name: '', dose: '', frequency: '', duration: '', instructions: '', notes: '',
      freqMorning: false, freqNoon: false, freqNight: false
    };
    setExtraData(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
  }, []);

  const removeMedication = useCallback((index: number) => {
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
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
    const isTelugu = consultationLanguage === 'te';

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
  }, [autofillKeywords, extraData.complaints, extraData.diagnosis, extraData.advice, extraData.investigations, extraData.followup, extraData.medications, consultationLanguage, savedMedications]);

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
  const handleAfterPrint = useCallback(() => {
    setIsReadyToPrint(false);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: handleAfterPrint,
  });

  const handleAfterPrintCertificate = useCallback(() => {
    setIsReadyToPrintCertificate(false);
  }, []);

  const handleCertificatePrint = useReactToPrint({
    contentRef: certificatePrintRef,
    onAfterPrint: handleAfterPrintCertificate,
  });

  const handleAfterPrintReceipt = useCallback(() => {
    setIsReadyToPrintReceipt(false);
  }, []);

  const handleReceiptPrint = useReactToPrint({
    contentRef: receiptPrintRef,
    onAfterPrint: handleAfterPrintReceipt,
  });

  useEffect(() => {
    if (isReadyToPrint && printRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReadyToPrint, handlePrint]);



  useEffect(() => {
    if (isReadyToPrintCertificate && certificatePrintRef.current) handleCertificatePrint();
  }, [isReadyToPrintCertificate, handleCertificatePrint]);

  useEffect(() => {
    if (isReadyToPrintReceipt && receiptPrintRef.current) handleReceiptPrint();
  }, [isReadyToPrintReceipt, handleReceiptPrint]);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges, handleSaveAndPrint, addMedication]);

  const handleLocationChange = (name: string) => {
    const h = hospitals.find(x => x.name === name);
    if (h) {
      setInitialLocation(h.name); // Update initialLocation
      setIsGpsEnabled(false);
    }
  };

  const deleteConsultation = useCallback(async (e: React.MouseEvent, c: Consultation) => {
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
  }, []);

  if (isHospitalsLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <>
      <div className="container mx-auto p-4 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ConsultationSidebar
            selectedHospitalName={selectedHospital.name}
            onHospitalSelect={(name) => {
              const h = hospitals.find(x => x.name === name);
              if (h) {
                setInitialLocation(h.name);
                setIsGpsEnabled(false);
              }
            }}
            isGpsEnabled={isGpsEnabled}
            onToggleGps={() => setIsGpsEnabled(!isGpsEnabled)}
            selectedDate={selectedDate || new Date()}
            onDateChange={(date) => {
              setSelectedDate(date);
              setIsConsultationDatePickerOpen(false);
            }}
            isConsultationDatePickerOpen={isConsultationDatePickerOpen}
            setIsConsultationDatePickerOpen={setIsConsultationDatePickerOpen}
            onSearchClick={() => setIsSearchModalOpen(true)}
            onRegisterClick={() => setIsRegistrationModalOpen(true)}
            onRefreshClick={() => fetchConsultations(selectedDate)}
            isFetchingConsultations={isFetchingConsultations}
            totalConsultationsCount={filteredConsultations.length}
            pendingConsultations={pendingConsultations}
            evaluationConsultations={evaluationConsultations}
            completedConsultations={completedConsultations}
            selectedConsultationId={selectedConsultation?.id}
            selectedConsultation={selectedConsultation}
            onSelectConsultation={handleSelectConsultation}
            onDeleteClick={handleDeleteClick}
            onShowPatientHistory={handleOpenHistory}
            personalNote={extraData.personalNote}
            onPersonalNoteChange={(val) => handleExtraChange('personalNote', val)}
            initialPersonalNote={initialExtraData?.personalNote}
            isEvaluationCollapsed={isEvaluationCollapsed}
            setIsEvaluationCollapsed={setIsEvaluationCollapsed}
            isCompletedCollapsed={isCompletedCollapsed}
            setIsCompletedCollapsed={setIsCompletedCollapsed}
            isTimerVisible={isTimerVisible}
            setIsTimerVisible={setIsTimerVisible}
            timerSeconds={timerSeconds}
            referredBy={extraData.referred_by}
            onReferredByChange={(val) => handleExtraChange('referred_by', val)}
            initialReferredBy={initialExtraData?.referred_by}
          />

          <div className="lg:col-span-3 min-h-[calc(100vh-2rem)]">
            {selectedConsultation && editablePatientDetails ? (
              <div className="space-y-6">
                <PatientDemographics
                  patient={editablePatientDetails}
                  visitType={extraData.visit_type}
                  onVisitTypeChange={(t) => handleExtraChange('visit_type', t)}
                  lastVisitDate={lastVisitDate}
                  onHistoryClick={() => selectedConsultation?.patient.id && handleOpenHistory(String(selectedConsultation.patient.id))}
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
                  onLinkClick={() => setIsLinkPatientModalOpen(true)}
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
                  language={consultationLanguage}
                  onLanguageChange={(lang) => setConsultationLanguage(lang)}
                  initialData={initialExtraData}
                />

                <MedicationManager
                  medications={extraData.medications}
                  initialMedications={initialExtraData?.medications}
                  sensors={sensors}
                  handleDragEnd={handleDragEnd}
                  handleMedChange={handleMedChange}
                  removeMedication={removeMedication}
                  savedMedications={savedMedications}
                  setExtraData={setExtraData}
                  medicationNameInputRef={medicationNameInputRef}
                  fetchSavedMedications={fetchSavedMedications}
                  language={consultationLanguage}
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
                  initialFollowup={initialExtraData?.followup}
                />

                {(extraData.procedure || extraData.referred_by) && (
                  <div className="border rounded-md p-4 space-y-4">
                    <div
                      className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer select-none"
                      onClick={() => setIsFinancialExpanded(!isFinancialExpanded)}
                    >
                      <IndianRupee className="w-4 h-4" />
                      Financial Details
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
                          isFinancialExpanded && "rotate-180"
                        )}
                      />
                    </div>

                    {isFinancialExpanded && (
                      <div className="space-y-4 pt-4 border-t mt-4">

                        {/* Unified Financial Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Procedure Fields (only if procedure selected) */}
                          {extraData.procedure && (
                            <>
                              <div className="space-y-2">
                                <Label>Procedure Fee (₹)</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter fee amount"
                                  value={extraData.procedure_fee}
                                  onChange={(e) => handleExtraChange('procedure_fee', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Consultant Share</Label>
                                <Input
                                  type="number"
                                  placeholder="Amount or %"
                                  value={extraData.procedure_consultant_cut}
                                  onChange={(e) => handleExtraChange('procedure_consultant_cut', e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Enter number for fixed amount.</p>
                              </div>
                            </>
                          )}

                          {/* Referral Amount (Only if referred_by is set) */}
                          {extraData.referred_by && (
                            <div className="space-y-2">
                              <Label>Referral Amount (₹)</Label>
                              <Input
                                type="number"
                                placeholder="Amount to pay referrer"
                                value={extraData.referral_amount}
                                onChange={(e) => handleExtraChange('referral_amount', e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

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
                  showDoctorProfile={showDoctorProfile}
                  onToggleDoctorProfile={toggleDoctorProfile}
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
      < div style={{ position: 'absolute', left: '-9999px' }
      }> <div ref={printRef}>{selectedConsultation && editablePatientDetails && <Prescription patient={editablePatientDetails} consultation={cleanConsultationData(extraData)} consultationDate={selectedDate || new Date()} age={age} language={consultationLanguage} logoUrl={selectedHospital.logoUrl} className="min-h-[297mm]" visitType={extraData.visit_type} forceDesktop={true} showDoctorProfile={showDoctorProfile} />}</div></div >
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={certificatePrintRef}>{selectedConsultation && editablePatientDetails && certificateData && <MedicalCertificate patient={editablePatientDetails} diagnosis={extraData.diagnosis} certificateData={certificateData} />}</div></div>
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={receiptPrintRef}>{selectedConsultation && editablePatientDetails && receiptData && <Receipt patient={editablePatientDetails} receiptData={receiptData} />}</div></div>

      {/* Modals */}
      <SavedMedicationsModal isOpen={isMedicationsModalOpen} onClose={() => setIsMedicationsModalOpen(false)} onMedicationsUpdate={fetchSavedMedications} />
      <KeywordManagementModal isOpen={isKeywordModalOpen} onClose={() => { setIsKeywordModalOpen(false); setKeywordModalPrefill(null); }} prefilledData={keywordModalPrefill} />
      <UnsavedChangesModal isOpen={isUnsavedModalOpen} onConfirm={handleConfirmSave} onDiscard={handleDiscardChanges} />
      <PatientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryPatientId(null);
        }}
        patientId={historyPatientId}
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
      <TextShortcutManagementModal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)} onUpdate={fetchTextShortcuts} />
      {
        selectedConsultation && editablePatientDetails && (
          <MedicalCertificateModal
            isOpen={isMedicalCertificateModalOpen}
            onClose={() => setIsMedicalCertificateModalOpen(false)}
            onSubmit={(data) => {
              setCertificateData(data);
              setIsMedicalCertificateModalOpen(false);
              setIsReadyToPrintCertificate(true);
            }}
            patientName={editablePatientDetails.name}
            patient={{
              id: editablePatientDetails.id, // Using existing data structure
              name: editablePatientDetails.name,
              sex: editablePatientDetails.sex || 'M' // Fallback
            }}
            diagnosis={extraData.diagnosis}
          />
        )
      }
      {
        selectedConsultation && editablePatientDetails && (
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
        )
      }
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
                  // setPendingSyncIds handled globally by scanning store
                } else if (selectedDate) {
                  fetchConsultations(selectedDate, newConsultation.patient_id, consultationData);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

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

      {editablePatientDetails && (
        <LinkPatientModal
          isOpen={isLinkPatientModalOpen}
          onClose={() => setIsLinkPatientModalOpen(false)}
          currentPatientId={String(editablePatientDetails.id)}
          onLinkSuccess={() => {
            // Refresh consultations to reflect merged history
            fetchConsultations();
          }}
        />
      )}
    </>
  );
};

export default ConsultationPage;