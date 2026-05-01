import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { toast } from '@/hooks/use-toast';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { Loader2, IndianRupee, ChevronDown } from 'lucide-react';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { cleanConsultationData, pruneEmptyFields, cn, calculateFollowUpDate, normalizeMedName, escapeRegex, areExtraDataEqual, arePatientsEqual, areLocationsEqual } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';
import { fetchRecentHistory, generateAutofillData, calculateLastVisitString } from '@/lib/consultation-history';
import SavedMedicationsModal from '@/components/consultation/SavedMedicationsModal';
import KeywordManagementModal, { KeywordPrefillData } from '@/components/consultation/KeywordManagementModal';
import UnsavedChangesModal from '@/components/consultation/UnsavedChangesModal';
import PatientHistoryModal from '@/components/consultation/PatientHistoryModal';
import TextShortcutManagementModal from '@/components/consultation/TextShortcutManagementModal';

import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/consultation/Prescription';
import { MedicalCertificate, MedicalCertificateModal } from '@/components/consultation/MedicalCertificate';
import { Receipt, ReceiptModal } from '@/components/consultation/Receipt';
import { useHospitals } from '@/context/HospitalsContext';
import { useAuth } from "@/hooks/useAuth";
import { useConsultant } from "@/context/ConsultantContext";
import { getDistance } from '@/lib/geolocation';
import ConsultationRegistration from '@/components/consultation/ConsultationRegistration';
import ReferralDoctorManagementModal from '@/components/consultation/ReferralDoctorManagementModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConsultationSearchModal } from '@/components/consultation/ConsultationSearchModal';
import { LinkPatientModal } from '@/components/consultation/LinkPatientModal';
import { CompletionMessageModal } from '@/components/consultation/CompletionMessageModal';
import { scheduleService } from '@/utils/scheduleService';
import { ConsultantProfileModal } from '@/components/consultation/ConsultantProfileModal';
import { DoctorLoginGate } from '@/components/consultation/DoctorLoginGate';
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
import { OnboardingTour } from '@/components/consultation/OnboardingTour';
import { SavedDocumentsSection } from '@/components/consultation/SavedDocumentsSection';
import PatientHealthDashboard from '@/components/consultation/PatientHealthDashboard';
import { Patient, Consultation, Medication, TextShortcut, ExtraData, AutofillProtocol, CertificateData, ReceiptData, DrugWarning, PrintOptions } from '@/types/consultation';

import { processTextShortcuts } from '@/lib/textShortcuts';
import { getMatchingGuides } from '@/lib/guideMatching';
import { Guide } from '@/types/consultation';
import { useConsultationTimer } from '@/hooks/useConsultationTimer';
import { generateCompletionMessage as generateCompletionMessageUtil } from '@/lib/consultation-utils';
import { requestOfflineSyncNow } from '@/lib/offline-sync-events';
import { OfflineConsultationBundle } from '@/types/offline-sync';

const waitForNextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Local Translations
const TRANSLATIONS = {
  en: {
    day: "day",
    day_plural: "days",
    week: "week",
    week_plural: "weeks",
    month: "month",
    month_plural: "months",
    year: "year",
    year_plural: "years",
    followup_message_structure: "after {{count}} {{unit}}, or immediately if symptoms worsen."
  },
  te: {
    day: "రోజు తర్వాత",
    day_plural: "రోజుల తర్వాత",
    week: "వారం తర్వాత",
    week_plural: "వారాల తర్వాత",
    month: "నెల తర్వాత",
    month_plural: "నెలల తర్వాత",
    year: "సంవత్సరం తర్వాత",
    year_plural: "సంవత్సరాల తర్వాత",
    followup_message_structure: "{{count}} {{unit}} / వెంటనే- ఏవైనా లక్షణాలు తీవ్రమైతే."
  }
};

const t = (key: string, options?: { lng?: string, count?: number, unit?: string }) => {
  const lang = (options?.lng || 'en') as keyof typeof TRANSLATIONS;
  let text = (TRANSLATIONS[lang] as any)[key] || key;

  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v));
    });
  }
  return text;
};

// arePatientsEqual moved to @/lib/utils.ts

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { consultant, isReceptionist, isMasterAdmin, isLoading: isConsultantLoading } = useConsultant();
  const { hospitals, isLoading: isHospitalsLoading } = useHospitals();

  // (Redirect to Auth removed to support same-page login)

  // (Early return removed from here to top level to avoid hook order violation)

  // --- Data State ---
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [isEvaluationCollapsed, setIsEvaluationCollapsed] = useState(true);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [editablePatientDetails, setEditablePatientDetails] = useState<Patient | null>(null);
  const [initialPatientDetails, setInitialPatientDetails] = useState<Patient | null>(null);
  const [initialExtraData, setInitialExtraData] = useState<ExtraData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHospital') || '';
    }
    return '';
  });
  const [initialLocation, setInitialLocation] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHospital') || '';
    }
    return '';
  });
  const [initialLanguage, setInitialLanguage] = useState<string>('te');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isTourSimulation, setIsTourSimulation] = useState(false);

  // SEO & Page Title - Optimise for link sharing
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Doctor Workspace | OrthoLife";

    // Create or update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    const originalDescription = metaDescription?.getAttribute('content') || '';

    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Secure professional workspace for OrthoLife consultants. Manage patient consultations, digital prescriptions, and medical records.');

    // Add OG tags for link previews (WhatsApp/FB/Twitter)
    const createOrUpdateMeta = (property: string, content: string, isProperty = true) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    createOrUpdateMeta('og:title', 'OrthoLife Doctor Workspace');
    createOrUpdateMeta('og:description', 'Professional portal for managing orthopedic consultations and digital health records.');
    createOrUpdateMeta('og:url', window.location.href);
    createOrUpdateMeta('og:type', 'website');
    createOrUpdateMeta('og:image', 'https://ortho.life/logo.png');
    createOrUpdateMeta('twitter:card', 'summary_large_image');

    return () => {
      document.title = originalTitle;
      if (metaDescription) {
        metaDescription.setAttribute('content', originalDescription);
      }
    };
  }, []);

  // Check onboarding on mount
  useEffect(() => {
    const isDone = localStorage.getItem('ortholife_onboarding_done');
    if (!isDone && consultant) {
      setShowTour(true);
    }
  }, [consultant]);

  // Handle tour simulation (inject sample patient)
  useEffect(() => {
    if (showTour && !selectedConsultation) {
      setIsTourSimulation(true);

      const samplePatient: Patient = {
        id: 'tour-sample',
        name: 'Mr. Sample Patient',
        phone: '1234567890',
        dob: '1980-01-01',
        sex: 'M',
        drive_id: null,
      };

      const sampleExtraData: ExtraData = {
        complaints: 'Sample joint pain for demonstration.',
        medicalHistory: 'None',
        findings: 'Normal movements',
        diagnosis: 'Mild Strain',
        medications: [],
        advice: 'Rest and ice pack.',
        followup: 'after 2 weeks',
        weight: '70',
        bp: '130/85',
        temperature: '98.4',
        height: '170',
        pulse: '72',
        spo2: '98',
        bmi: '24.2',
        investigations: '',
        procedure: '',
        procedure_fee: '0',
        procedure_consultant_cut: '0',
        referred_to: '',
        referred_to_list: [],
        referred_by: '',
        referral_amount: '0',
        visit_type: 'Paid',
        affordabilityPreference: 'none',
        personalNote: 'This is a sample consultation for training.',
      };

      const sampleConsultation: Consultation = {
        id: 'tour-sample-cons',
        created_at: new Date().toISOString(),
        status: 'under_evaluation',
        patient: samplePatient,
        patient_id: samplePatient.id,
        consultation_data: sampleExtraData,
      };

      setSelectedConsultation(sampleConsultation);
      setEditablePatientDetails(samplePatient);
      setExtraData(sampleExtraData);
    }
  }, [showTour, selectedConsultation]);

  const handleTourComplete = () => {
    setShowTour(false);
    localStorage.setItem('ortholife_onboarding_done', 'true');
    if (isTourSimulation) {
      setSelectedConsultation(null);
      setEditablePatientDetails(null);
      setIsTourSimulation(false);
    }
  };

  const [extraData, setExtraData] = useState<ExtraData>({
    complaints: '',
    medicalHistory: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: '',
    medications: [] as Medication[],
    weight: '',
    bp: '',
    temperature: '',
    height: '',
    pulse: '',
    spo2: '',
    bmi: '',
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
    affordabilityPreference: 'none',
    orthotics: '',
    certificates: [],
    receipts: [],
  });

  const extraDataRef = useRef(extraData);
  useEffect(() => {
    extraDataRef.current = extraData;
  }, [extraData]);

  const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);

  // --- Modals State ---
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Consultation | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [deletePatientAlso, setDeletePatientAlso] = useState<boolean>(false);

  // History Modal State - generalized to support any patient
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);
  const [historyPatientName, setHistoryPatientName] = useState<string | undefined>(undefined);

  const handleOpenHistory = (patientId: string, patientName?: string) => {
    setHistoryPatientId(patientId);
    setHistoryPatientName(patientName);
    setIsHistoryModalOpen(true);
  };
  const [isOnlyConsultation, setIsOnlyConsultation] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLinkPatientModalOpen, setIsLinkPatientModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isMessageManuallyEdited, setIsMessageManuallyEdited] = useState(false);
  const [editingCertificateIndex, setEditingCertificateIndex] = useState<number | null>(null);
  const [editingReceiptIndex, setEditingReceiptIndex] = useState<number | null>(null);



  // UI State
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const recentlyHandledIds = useRef<Set<string | number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const [consultationLanguage, setConsultationLanguage] = useState<string>('te');


  // --- Derived State for Location ---
  const selectedHospital = useMemo(() => {
    if (hospitals.length === 0) return { name: 'OrthoLife', logoUrl: '', lat: 0, lng: 0, settings: { op_fees: 0, free_visit_duration_days: 14 } };
    return hospitals.find(h => areLocationsEqual(h.name, selectedLocation)) || hospitals[0];
  }, [hospitals, selectedLocation]);

  const [isGpsEnabled, setIsGpsEnabled] = useState(() => {
    const stored = localStorage.getItem('isGpsEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [age, setAge] = useState<number | ''>('');

  const medicationNameInputRef = useRef<HTMLInputElement | null>(null);

  const debouncedAdvice = useDebounce(extraData.advice, 500);

  // Refs
  const complaintsRef = useRef<HTMLTextAreaElement>(null);
  const medicalHistoryRef = useRef<HTMLTextAreaElement>(null);
  const findingsRef = useRef<HTMLTextAreaElement>(null);
  const investigationsRef = useRef<HTMLTextAreaElement>(null);
  const diagnosisRef = useRef<HTMLTextAreaElement>(null);
  const adviceRef = useRef<HTMLTextAreaElement>(null);
  const followupRef = useRef<HTMLTextAreaElement>(null);
  const procedureRef = useRef<HTMLTextAreaElement>(null);
  const referredToRef = useRef<HTMLInputElement>(null);
  const personalNoteRef = useRef<HTMLTextAreaElement>(null);
  const referredByRef = useRef<HTMLInputElement>(null);
  const orthoticsRef = useRef<HTMLTextAreaElement>(null);
  const sidebarSearchRef = useRef<HTMLInputElement>(null);

  // Med Refs
  const medFrequencyRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const medDurationRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medInstructionsRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const medNotesRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const activeConsultationIdRef = useRef<string | null>(null);

  // Syncs latest textarea values from DOM refs into state to avoid stale prints.
  // Returns the latest ExtraData object (either updated or current).
  const syncExtraDataFromRefs = useCallback(() => {
    const currentExtraData = extraDataRef.current;
    const updates: Partial<typeof currentExtraData> = {};

    const syncField = (field: keyof typeof currentExtraData, ref: React.RefObject<HTMLTextAreaElement | null>) => {
      const value = ref.current?.value;
      if (typeof value === 'string' && value !== currentExtraData[field]) {
        updates[field] = value as any;
      }
    };

    syncField('complaints', complaintsRef);
    syncField('medicalHistory', medicalHistoryRef);
    syncField('findings', findingsRef);
    syncField('investigations', investigationsRef);
    syncField('diagnosis', diagnosisRef);
    syncField('advice', adviceRef);
    syncField('followup', followupRef);
    syncField('procedure', procedureRef);
    syncField('orthotics', orthoticsRef);
    if (Object.keys(updates).length > 0) {
      const nextData = { ...currentExtraData, ...updates };
      setExtraData(nextData);
      return nextData;
    }
    return currentExtraData;
  }, [
    complaintsRef,
    medicalHistoryRef,
    findingsRef,
    investigationsRef,
    diagnosisRef,
    adviceRef,
    followupRef,
    procedureRef,
    orthoticsRef
  ]);


  // Keyword Modal Prefill
  const [keywordModalPrefill, setKeywordModalPrefill] = useState<KeywordPrefillData | null>(null);

  const handleSaveBundleClick = () => {
    const isTelugu = consultationLanguage === 'te';
    setKeywordModalPrefill({
      medications: extraData.medications.map(m => ({ composition: m.composition || '' })),
      advice: isTelugu ? '' : extraData.advice, // Default to empty if not English
      advice_te: isTelugu ? extraData.advice : '', // Populate Telugu if current language is Telugu
      investigations: extraData.investigations, // Usually English?
      followup: isTelugu ? '' : extraData.followup,
      followup_te: isTelugu ? extraData.followup : '',
      orthotics: isTelugu ? '' : extraData.orthotics,
      orthotics_te: isTelugu ? extraData.orthotics : '',
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
  const [autofillKeywords, setAutofillKeywords] = useState<AutofillProtocol[]>([]);
  const [textShortcuts, setTextShortcuts] = useState<TextShortcut[]>([]);
  const [isProcedureExpanded, setIsProcedureExpanded] = useState(false);
  const [isReferredToExpanded, setIsReferredToExpanded] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [referralDoctors, setReferralDoctors] = useState<{ id: string, name: string, specialization?: string, address?: string, phone?: string }[]>([]);
  const [isFinancialExpanded, setIsFinancialExpanded] = useState(false);

  // Timer (Refactored)
  const { timerSeconds, isTimerVisible, setIsTimerVisible, stopTimer, isTimerPausedRef } = useConsultationTimer(selectedConsultation);

  // Date Pickers
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);

  // Doctor Profile Visibility (Location-Aware)
  const [showDoctorProfile, setShowDoctorProfile] = useState<boolean>(true);
  const [showSignSeal, setShowSignSeal] = useState<boolean>(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    vitals: true,
    clinicalNotes: true,
    diagnosis: true,
    investigations: true,
    medications: true,
    advice: true,
    followup: true,
    procedure: true,
    referrals: true,
    orthotics: true,
    letterheadMode: false,
    fontSize: 'standard',
    signatureAlignment: 'right'
  });

  // Load profile preference on location change
  useEffect(() => {
    if (selectedLocation) {
      const settings = consultant?.messaging_settings as any;
      const dbProfile = settings?.location_print_overrides?.[selectedLocation]?.show_profile;
      const dbSignSeal = settings?.location_print_overrides?.[selectedLocation]?.show_sign_seal;
      const dbPrintOptions = settings?.location_print_options?.[selectedLocation];

      // 1. Default to true for profiles if not set in DB
      setShowDoctorProfile(dbProfile !== undefined ? dbProfile : true);

      // 2. Default to false for sign+seal if not set in DB
      setShowSignSeal(dbSignSeal !== undefined ? dbSignSeal : false);

      // 3. Default to full print options if not set in DB
      if (dbPrintOptions !== undefined) {
        setPrintOptions({
          vitals: true,
          clinicalNotes: true,
          diagnosis: true,
          investigations: true,
          medications: true,
          advice: true,
          followup: true,
          procedure: true,
          referrals: true,
          orthotics: true,
          letterheadMode: false,
          fontSize: 'standard',
          signatureAlignment: 'right',
          ...dbPrintOptions
        });
      } else {
        setPrintOptions({
          vitals: true,
          clinicalNotes: true,
          diagnosis: true,
          investigations: true,
          medications: true,
          advice: true,
          followup: true,
          procedure: true,
          referrals: true,
          orthotics: true,
          letterheadMode: false,
          fontSize: 'standard',
          signatureAlignment: 'right'
        });
      }
    }
  }, [selectedLocation, consultant]);

  const toggleDoctorProfile = (checked: boolean) => {
    setShowDoctorProfile(checked);
  };

  const toggleSignSeal = (checked: boolean) => {
    setShowSignSeal(checked);
  };

  const updatePrintOptions = (options: PrintOptions) => {
    setPrintOptions(options);
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

  /**
   * Loads a selected consultation into the editing state.
   * 
   * - Hydrates form fields (`extraData`) from `consultation_data`.
   * - Sets initial comparison point for `hasChanges`.
   * - Handles backward compatibility for fields like `referred_to_list`.
   * - Sets `lastVisitDate` for display.
   */
  const confirmSelection = useCallback(async (consultation: Consultation) => {
    activeConsultationIdRef.current = consultation.id;
    setSelectedConsultation(consultation);

    // If consultation has no data (e.g. registered by receptionist) OR missing precomputed last visit date, 
    // try to autofill on the fly. Skip for offline patients.
    let effectiveConsultationData = consultation.consultation_data;
    let effectiveReferredBy = consultation.referred_by;
    let effectiveLastVisitDate = consultation.last_visit_date;
    const patientId = consultation.patient_id || consultation.patient?.id;
    const isOffline = String(patientId).startsWith('offline-');

    if (isOffline) {
      effectiveLastVisitDate = null;
    } else if (!effectiveConsultationData || (typeof effectiveConsultationData === 'object' && Object.keys(effectiveConsultationData).length === 0) || !effectiveLastVisitDate) {
      try {
        const { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate } = await fetchRecentHistory(patientId, consultation.created_at);

        // Race condition guard: If user selected another consultation while this was in flight, abort
        if (activeConsultationIdRef.current !== consultation.id) return;

        // Only apply autofill if the data part is actually missing
        if (!effectiveConsultationData || (typeof effectiveConsultationData === 'object' && Object.keys(effectiveConsultationData).length === 0)) {
          effectiveConsultationData = generateAutofillData(consultation, lastConsultation, lastDischarge, lastOpDate, lastDischargeDate);
        }

        // Only apply last visit date if it was missing
        if (!effectiveLastVisitDate) {
          effectiveLastVisitDate = calculateLastVisitString(lastOpDate, lastDischargeDate);
        }

        // Fallback for referred_by if missing in current but present in last
        if (!effectiveReferredBy && lastConsultation?.referred_by) {
          effectiveReferredBy = lastConsultation.referred_by;
        }
      } catch (err) {
        if (activeConsultationIdRef.current !== consultation.id) return;
        console.warn('Failed to perform on-the-fly autofill:', err);
        // Ensure we don't stay in "Loading..." state if we add it later
        if (!effectiveLastVisitDate || effectiveLastVisitDate === 'First Consultation') effectiveLastVisitDate = 'First Consultation';
      }
    }

    const normalizedPatient = {
      ...consultation.patient,
      secondary_phone: consultation.patient.secondary_phone || '',
      allergies: consultation.patient.allergies || (effectiveConsultationData as any)?.allergy || '',
    };
    setEditablePatientDetails(normalizedPatient);
    setInitialPatientDetails(normalizedPatient);
    if (consultation.patient.dob) {
      setAge(calculateAge(new Date(consultation.patient.dob)));
    } else {
      setAge('');
    }

    // Update last visit date from either pre-calculated or on-the-fly value
    setLastVisitDate(effectiveLastVisitDate || consultation.last_visit_date || 'First Consultation');

    const savedData = (effectiveConsultationData || {}) as Partial<ExtraData>;
    const loadedMedications = (() => {
      if (Array.isArray(savedData.medications)) return savedData.medications;
      if (typeof savedData.medications === 'string') {
        try {
          const parsed = JSON.parse(savedData.medications);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.warn('Invalid medications payload in consultation data:', error);
          return [];
        }
      }
      return [];
    })();
    // Handle Referred To List Backward Compatibility
    let loadedReferredToList = savedData.referred_to_list || [];
    if ((!loadedReferredToList || loadedReferredToList.length === 0) && savedData.referred_to) {
      loadedReferredToList = [savedData.referred_to];
    }

    const newExtraData: ExtraData = {
      complaints: savedData.complaints || '',
      medicalHistory: savedData.medicalHistory || (savedData as any).medical_history || '',
      findings: savedData.findings || '',
      investigations: savedData.investigations || '',
      diagnosis: savedData.diagnosis || '',
      advice: savedData.advice || '',
      followup: savedData.followup || '',
      medications: (loadedMedications || []).map((m: any) => ({ ...m, composition: m.composition || m.name || '' })),
      weight: savedData.weight || '',
      bp: savedData.bp || '',
      temperature: savedData.temperature || '',
      height: savedData.height || '',
      pulse: savedData.pulse || '',
      spo2: savedData.spo2 || '',
      bmi: savedData.bmi || '',
      allergy: savedData.allergy || '',
      personalNote: savedData.personalNote || (savedData as any).personal_note || '',
      procedure: savedData.procedure || '',

      procedure_fee: consultation.procedure_fee !== null ? String(consultation.procedure_fee) : '',
      procedure_consultant_cut: consultation.procedure_consultant_cut !== null ? String(consultation.procedure_consultant_cut) : '',
      referred_by: effectiveReferredBy || '',
      referral_amount: consultation.referral_amount !== null ? String(consultation.referral_amount) : '',

      referred_to: savedData.referred_to || '',
      referred_to_list: loadedReferredToList,

      visit_type: savedData.visit_type || consultation.visit_type || 'paid',
      affordabilityPreference: savedData.affordabilityPreference || 'none',
      orthotics: savedData.orthotics || '',
      investigation_reports: savedData.investigation_reports || [],
      certificates: (savedData.certificates || []).map(cert => ({
        ...cert,
        restPeriodStartDate: cert.restPeriodStartDate ? new Date(cert.restPeriodStartDate) : new Date(),
        treatmentFromDate: cert.treatmentFromDate ? new Date(cert.treatmentFromDate) : new Date(),
        rejoinDate: cert.rejoinDate ? new Date(cert.rejoinDate) : undefined,
        certificateDate: cert.certificateDate ? new Date(cert.certificateDate) : new Date(),
        consultationDate: cert.consultationDate ? new Date(cert.consultationDate) : new Date(),
      })),
      receipts: savedData.receipts || [],
    };
    setExtraData(newExtraData);
    setInitialExtraData(newExtraData);
    const consultationLocation = consultation.location || (hospitals.length > 0 ? hospitals[0].name : '');
    setSelectedLocation(consultationLocation);
    setInitialLocation(consultationLocation);
    const lang = consultation.language || 'te';
    setInitialLanguage(lang);
    setConsultationLanguage(lang);


    setIsProcedureExpanded(!!newExtraData.procedure);
    setIsReferredToExpanded(!!newExtraData.referred_to);
    setIsFinancialExpanded(false);


    setIsEvaluationCollapsed(true);
    setIsCompletedCollapsed(true);

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


  /**
   * Fetches the list of consultations for a given date and optionally selects a specific one.
   * 
   * @param date - The date to fetch consultations for. Defaults to `selectedDate`.
   * @param patientId - (Optional) If provided, finds and selects the consultation for this patient on the given date.
   * @param consultationData - (Optional) Consultation data to hydrate if selecting a specific consultation (e.g., from search/history).
   * @param languageOverride - (Optional) Force a specific language for the consultation.
   */
  const fetchConsultations = useCallback(async (date: Date = selectedDate || new Date(), patientId?: string, consultationData?: any, languageOverride?: string) => {
    // Security Guard: No active doctor profile = No data
    if (!consultant && !patientId) {
      console.warn("[Consultation] No consultant profile available. Aborting fetch.");
      setAllConsultations([]);
      setIsFetchingConsultations(false);
      return;
    }

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
        body: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          hospital: selectedHospital?.name,
          consultant_id: consultant?.id
        }
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
          const found = list.find((c: Consultation) => String(c.patient.id) === String(patientId) && c.created_at.startsWith(formattedDate));
          if (found) {
            const consultationToSelect = { ...found };
            if (consultationData) {
              consultationToSelect.consultation_data = {
                ...(consultationToSelect.consultation_data || {}),
                ...consultationData
              };
            }
            if (languageOverride) {
              consultationToSelect.language = languageOverride;
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
  }, [selectedDate, selectedHospital, confirmSelection, isOnline, consultant?.id]);

  useEffect(() => {
    // Only fetch if a hospital is selected AND the consultant profile is ready
    if (selectedHospital.name && consultant?.id) {
      fetchConsultations();
    }
  }, [fetchConsultations, selectedHospital.name, consultant?.id]);


  const hydrateInsertedConsultation = useCallback(async (
    id: string | number,
    options?: { force?: boolean }
  ) => {
    // Optimization: Skip if we just registered this or it's already in list
    if (!options?.force && recentlyHandledIds.current.has(id)) return null;

    if (!recentlyHandledIds.current.has(id)) {
      recentlyHandledIds.current.add(id);
      // Clean up after 10 seconds
      setTimeout(() => recentlyHandledIds.current.delete(id), 10000);
    }

    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      // Ensure the new record belongs to the currently viewed date
      const dataDate = format(new Date(data.created_at), 'yyyy-MM-dd');
      const viewDate = format(selectedDate || new Date(), 'yyyy-MM-dd');
      if (dataDate !== viewDate) return null;

      // --- AUTOFILL RESTORATION LOGIC ---
      let consultation_data = data.consultation_data;
      if (!consultation_data || (typeof consultation_data === 'object' && Object.keys(consultation_data).length === 0)) {
        const { lastConsultation, lastDischarge, lastOpDate, lastDischargeDate } = await fetchRecentHistory(data.patient_id, data.created_at);
        consultation_data = generateAutofillData(data, lastConsultation, lastDischarge, lastOpDate, lastDischargeDate);

        let referred_by = data.referred_by;
        if (!referred_by && !data.consultation_data && lastConsultation && lastConsultation.referred_by) {
          referred_by = lastConsultation.referred_by;
        }

        const last_visit_date = calculateLastVisitString(lastOpDate, lastDischargeDate);

        // update memory object before pushing to state
        data.consultation_data = consultation_data;
        data.referred_by = referred_by;
        data.last_visit_date = last_visit_date;
      }
      // ----------------------------------------

      setAllConsultations(prev => {
        const exists = prev.some(c => c.id === data.id);
        const newList = exists
          ? prev.map(c => (c.id === data.id ? data : c))
          : [data, ...prev];

        // Keep sorted by created_at DESC (newest at top)
        return [...newList].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      return data;
    } catch (err) {
      console.error('Failed to hydrate inserted consultation:', err);
      return null;
    }
  }, [selectedDate]);

  // Realtime subscription for instant updates (e.g., from front desk registration)
  useEffect(() => {
    if (!isOnline || !selectedHospital.name) return;

    const channel = supabase
      .channel('consultation-updates')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
        },
        (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          // Guard for location
          const locationMatch =
            areLocationsEqual(newRow?.location, selectedHospital.name) ||
            areLocationsEqual(oldRow?.location, selectedHospital.name);

          // For deletions, we can't check location easily without REPLICA IDENTITY FULL,
          // but filtering locally by ID is safe and cost-free.
          if (eventType !== 'DELETE' && !locationMatch) return;

          if (eventType === 'INSERT') {
            // New record: we must refetch to get nested patient data and full hydration
            if (newRow?.id != null) {
              if (recentlyHandledIds.current.has(newRow.id)) return;
              console.log(`Realtime ${eventType} detected, handling...`);
              hydrateInsertedConsultation(newRow.id);
            }
          }
          else if (eventType === 'UPDATE') {
            // Data change: update local state instantly to save egress
            if (newRow?.id != null && recentlyHandledIds.current.has(newRow.id)) return;
            console.log(`Realtime ${eventType} detected, handling...`);

            setAllConsultations(prev => prev.map(c =>
              c.id === newRow.id ? { ...c, ...newRow } : c
            ));
          }
          else if (eventType === 'DELETE') {
            // Removal: filter out locally
            console.log(`Realtime ${eventType} detected, handling...`);
            setAllConsultations(prev => prev.filter(c => c.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, selectedHospital.name, consultant, hydrateInsertedConsultation]);

  /**
   * GPS Logic
   * Automatically selects the nearest hospital based on the user's current location.
   * Only runs if GPS is enabled in settings.
   */
  useEffect(() => {
    // GPS Logic
    if (isGpsEnabled && navigator.geolocation && hospitals.length > 0 && consultant) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Only consider hospitals that are explicitly part of this consultant's list
          // if any such hospitals exist. This prevents switching to "global" defaults.
          const consultantHospitals = hospitals.filter(h => h.consultantId === consultant.id);
          const candidates = consultantHospitals.length > 0 ? consultantHospitals : hospitals;

          let closest = candidates[0];
          let minDistance = Infinity;

          candidates.forEach(hospital => {
            const distance = getDistance(latitude, longitude, hospital.lat, hospital.lng);
            if (distance < minDistance) {
              minDistance = distance;
              closest = hospital;
            }
          });

          if (closest.name !== selectedHospital.name) {
            setSelectedLocation(closest.name);
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
  }, [isGpsEnabled, selectedHospital.name, hospitals, consultant?.id]);

  // State for auto-sending WhatsApp messages
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState<boolean>(true);

  // Load auto-send preference on location change
  useEffect(() => {
    if (selectedLocation) {
      const settings = consultant?.messaging_settings as any;
      const dbAutoSend = settings?.location_auto_send_overrides?.[selectedLocation];
      setIsAutoSendEnabled(dbAutoSend !== undefined ? dbAutoSend : true);
    }
  }, [selectedLocation, consultant]);

  // Modification: Added consultant dependency for scoped messaging
  const generateCompletionMessage = useCallback((patient: Patient, guidesMatched: any[], adviceOverride?: string) => {
    // Pass consultant profile and advice for personalized messages
    return generateCompletionMessageUtil(
      patient,
      guidesMatched,
      consultationLanguage,
      consultant?.name,
      adviceOverride || extraData.advice
    );
  }, [consultationLanguage, consultant, extraData.advice]);

  // --- Completion Message Logic ---
  const handleOpenCompletionModal = useCallback(() => {
    if (!editablePatientDetails || !selectedConsultation) return;

    if (!isMessageManuallyEdited) {
      const latestData = syncExtraDataFromRefs();
      const message = generateCompletionMessage(editablePatientDetails, matchedGuides, latestData.advice);
      setCompletionMessage(message);
    }
    // If manually edited, keep the existing 'completionMessage' state

    setIsCompletionModalOpen(true);
  }, [editablePatientDetails, selectedConsultation, isMessageManuallyEdited, generateCompletionMessage, matchedGuides]);

  useEffect(() => {
    setCompletionMessage('');
    setIsMessageManuallyEdited(false);
  }, [selectedConsultation?.id]);



  // Derived state to check for changes
  const isReadOnly = useMemo(() => {
    if (!selectedConsultation || !consultant) return false;
    // New/Offline consultations are editable by the current session creator
    if (String(selectedConsultation.id).startsWith('offline-')) return false;

    // Use robust comparison to handle possible missing fields from search results or type mismatches
    if (!selectedConsultation.consultant_id) return false;

    return String(selectedConsultation.consultant_id) !== String(consultant.id);
  }, [selectedConsultation, consultant?.id]);

  const { hasChanges, hasSignificantChanges } = useMemo(() => {
    if (isReadOnly) return { hasChanges: false, hasSignificantChanges: false };
    if (!selectedConsultation || !editablePatientDetails || !initialPatientDetails) return { hasChanges: false, hasSignificantChanges: false };

    const patientDetailsChanged = !arePatientsEqual(editablePatientDetails, initialPatientDetails);
    const extraDataChanged = !areExtraDataEqual(extraData, initialExtraData);
    const extraDataSignificantChanged = !areExtraDataEqual(extraData, initialExtraData, true);

    const locationChanged = !areLocationsEqual(selectedLocation, initialLocation);
    const languageChanged = consultationLanguage !== initialLanguage;

    const baseChanges = patientDetailsChanged || extraDataChanged || languageChanged;
    const baseSignificantChanges = patientDetailsChanged || extraDataSignificantChanged || languageChanged;
    const allChanges = baseChanges || locationChanged;
    const allSignificantChanges = baseSignificantChanges || locationChanged;

    // Check if it's a saved consultation (not a new/offline one)
    const isSavedConsultation = selectedConsultation?.id && !String(selectedConsultation.id).startsWith('offline-');

    return {
      hasChanges: allChanges,
      hasSignificantChanges: isSavedConsultation ? baseSignificantChanges : allSignificantChanges
    };
  }, [isReadOnly, selectedConsultation, editablePatientDetails, initialPatientDetails, extraData, initialExtraData, selectedHospital, initialLocation, consultationLanguage, initialLanguage]);

  /**
   * Persists changes to the current consultation.
   * 
   * @param options.markAsCompleted - If true, attempts to mark status as 'completed' (or 'under_evaluation' if incomplete).
   * @param options.skipToast - If true, suppresses success toasts (e.g., for auto-saves).
   * @param options.extraDataOverride - If provided, use this data instead of the current state (for bypassing React state races).
   */
  const saveChanges = useCallback(async (options: { markAsCompleted?: boolean, skipToast?: boolean, extraDataOverride?: ExtraData } = {}) => {
    if (!selectedConsultation || !editablePatientDetails) throw new Error("No consultation selected");

    if (isReadOnly) {
      toast({ variant: "destructive", title: "Read Only", description: "You cannot edit another consultant's record." });
      return false;
    }

    const activeExtraData = options.extraDataOverride || extraData;

    const hasMedsOrFollowup = activeExtraData.medications.length > 0 || (activeExtraData.followup && activeExtraData.followup.trim() !== '');
    const hasInvestigations = activeExtraData.investigations && activeExtraData.investigations.trim() !== '';

    let newStatus = selectedConsultation.status;
    if (options.markAsCompleted) {
      newStatus = hasMedsOrFollowup ? 'completed' : 'under_evaluation';
    } else if (hasInvestigations && newStatus === 'pending') {
      newStatus = 'under_evaluation';
    }
    const statusChanged = newStatus !== selectedConsultation.status;

    const extraDataChanged = !areExtraDataEqual(activeExtraData, initialExtraData);
    const patientDetailsChanged = !arePatientsEqual(editablePatientDetails, initialPatientDetails);
    const locationChanged = !areLocationsEqual(selectedHospital.name, initialLocation);
    const languageChanged = consultationLanguage !== initialLanguage;

    const hasActualChanges = patientDetailsChanged || extraDataChanged || locationChanged || languageChanged;
    const shouldSave = hasActualChanges || statusChanged;

    if (!shouldSave) {
      return true;
    }

    setIsSaving(true);
    try {
      const { visit_type, location, language, ...restExtraData } = activeExtraData as any;

      const cleanMedicationForSave = (med: any) => {
        const cleaned = { ...med };
        delete cleaned.freq_morning;
        delete cleaned.freq_noon;
        delete cleaned.freq_night;
        delete cleaned.created_at;
        delete cleaned.updated_at;

        // Remove backup language fields before saving
        delete cleaned.frequency_te;
        delete cleaned.duration_te;
        delete cleaned.instructions_te;
        delete cleaned.notes_te;
        delete cleaned.contraindications;
        delete cleaned.interactions;

        if (!cleaned.freqMorning) delete cleaned.freqMorning;
        if (!cleaned.freqNoon) delete cleaned.freqNoon;
        if (!cleaned.freqNight) delete cleaned.freqNight;
        return cleaned;
      };

      const {
        procedure_fee,
        procedure_consultant_cut,
        referred_by,
        referral_amount,
        referred_to,
        referred_to_list,
        // Destructure backup fields to exclude them from the saved JSON
        advice_te,
        followup_te,
        ...jsonExtraData
      } = restExtraData;

      const medications = (restExtraData.medications || []).map(cleanMedicationForSave);
      const nextReviewDate = calculateFollowUpDate(activeExtraData.followup, new Date(selectedConsultation.created_at));

      const dataToSave = pruneEmptyFields({
        ...jsonExtraData,
        referred_to: referred_to_list && referred_to_list.length > 0 ? referred_to_list.join(', ') : '',
        referred_to_list: referred_to_list || [],
        medications
      });

      const parseConsultantCut = (val: any, fee: any) => {
        if (!val) return null;
        const sVal = String(val).trim();
        if (sVal.endsWith('%')) {
          const percent = parseFloat(sVal.replace('%', ''));
          const f = fee ? Number(fee) : 0;
          return isNaN(percent) ? null : (percent / 100) * f;
        }
        const num = Number(sVal);
        return isNaN(num) ? null : num;
      };

      // 1. Build Standardized Payload (v2)
      const offlineBundle: OfflineConsultationBundle = {
        schemaVersion: 2,
        timestamp: new Date().toISOString(),
        patientDetails: {
          ...editablePatientDetails,
          secondary_phone: editablePatientDetails.secondary_phone,
          is_dob_estimated: editablePatientDetails.is_dob_estimated
        },
        extraData: dataToSave,
        status: newStatus as any,
        language: consultationLanguage,
        visit_type: activeExtraData.visit_type,
        location: selectedHospital.name,
        duration: timerSeconds,
        procedure_fee: procedure_fee ? Number(procedure_fee) : null,
        procedure_consultant_cut: parseConsultantCut(procedure_consultant_cut, procedure_fee),
        referred_by: referred_by || null,
        referral_amount: referral_amount ? Number(referral_amount) : null,
        next_review_date: nextReviewDate,
      };

      // 2. PRIMARY WRITE: IndexedDB (offlineStore)
      if (selectedConsultation.id) {
        recentlyHandledIds.current.add(selectedConsultation.id);
        // Clean up after 10 seconds
        setTimeout(() => recentlyHandledIds.current.delete(selectedConsultation.id), 10000);
      }
      await offlineStore.setItem(selectedConsultation.id, offlineBundle);

      // 3. INTERNAL STATE UPDATE (Reflect changes immediately)
      const updatedConsultation: Consultation = {
        ...selectedConsultation,
        patient: { ...editablePatientDetails },
        consultation_data: dataToSave,
        visit_type: extraData.visit_type,
        location: selectedHospital.name,
        language: consultationLanguage,
        status: newStatus as any,
        duration: timerSeconds,
        procedure_fee: procedure_fee ? Number(procedure_fee) : null,
        procedure_consultant_cut: parseConsultantCut(procedure_consultant_cut, procedure_fee),
        referred_by: referred_by || null,
        referral_amount: referral_amount ? Number(referral_amount) : null,
        next_review_date: nextReviewDate,
      };

      setSelectedConsultation(updatedConsultation);
      setInitialPatientDetails(editablePatientDetails);
      setInitialExtraData(activeExtraData);
      setInitialLocation(selectedHospital.name);
      setInitialLanguage(consultationLanguage);

      setAllConsultations(prev =>
        prev.map(c => (c.id === updatedConsultation.id ? updatedConsultation : c))
      );

      // 4. SIDE EFFECTS (Decoupled from cloud)
      if (statusChanged && newStatus === 'completed') {
        stopTimer();
        isTimerPausedRef.current = true;
      }

      if (isOnline) {
        requestOfflineSyncNow();

        // Auto-schedule Follow-up Reminder- better to send it the day before the actual visit- so they can plan ahead- currently we are sending it on the day of the visit
        if (newStatus === 'completed' && consultant?.is_whatsauto_active && editablePatientDetails.phone) {
          // Auto-schedule Follow-up Reminder (Customizable)
          const config = (consultant?.messaging_settings as any)?.auto_followup_config;
          const scheduledDate = nextReviewDate
            ? new Date(`${nextReviewDate}T10:00:00.000Z`) // 10 AM on the review date
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now if not set

          // Use custom timing or default to 1 day before
          const daysBefore = config?.days_before ?? 1;
          scheduledDate.setDate(scheduledDate.getDate() - daysBefore);

          const defaultTe = `నమస్కారం ${editablePatientDetails.name} గారు, ఇది మీ ఫాలో-అప్ రిమైండర్. దయచేసి క్లినిక్‌ని సంప్రదించండి.`;
          const defaultEn = `Hello ${editablePatientDetails.name}, this is a gentle reminder for your follow-up consultation. Please contact the clinic.`;
          
          const template = consultationLanguage === 'te' 
            ? (config?.message_te || defaultTe) 
            : (config?.message_en || defaultEn);

          // Basic placeholder replacement
          const finalMessage = template.replace(/\{\{patient_name\}\}/g, editablePatientDetails.name);

          scheduleService.upsertAutoTask({
            task_type: 'whatsapp_message',
            scheduled_for: scheduledDate.toISOString(),
            payload: {
              number: editablePatientDetails.phone,
              message: finalMessage,
              consultant_id: consultant.phone,
              reference_id: selectedConsultation.id
            },
            source: 'auto_post_consultation_followup',
            consultant_id: consultant.id,
            location: selectedConsultation.location
          });
        }
      }

      return true;
    } catch (err: any) {
      console.error('Local save failed:', err);
      toast({ variant: "destructive", title: "Save Error", description: "Failed to save locally. Please check storage." });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [selectedConsultation, editablePatientDetails, extraData, hasChanges, consultationLanguage, selectedHospital, timerSeconds, stopTimer, isTimerPausedRef, isOnline, initialExtraData, initialLocation, initialPatientDetails, initialLanguage]);


  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasSignificantChanges) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser's native confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasSignificantChanges]);



  /**
   * Persist User Preferences
   * Saves GPS setting and selected hospital to localStorage.
   */
  useEffect(() => {
    localStorage.setItem('isGpsEnabled', JSON.stringify(isGpsEnabled));
    localStorage.setItem('selectedHospital', selectedHospital.name);
  }, [selectedHospital, isGpsEnabled]);

  const handleSelectConsultation = async (consultation: Consultation) => {
    // If passing from fetch logic, we might need to skip unsaved check or handle it
    if (hasSignificantChanges) {
      setPendingSelection(consultation);
      setPendingPath(null);
      setIsUnsavedModalOpen(true);
    } else {
      confirmSelection(consultation);
    }
  };

  const handleNavigate = useCallback((path: string) => {
    if (hasSignificantChanges) {
      setPendingPath(path);
      setPendingSelection(null);
      setIsUnsavedModalOpen(true);
    } else {
      navigate(path);
    }
  }, [hasSignificantChanges, navigate]);



  const handleConfirmSave = async () => {
    setIsUnsavedModalOpen(false);
    const saved = await saveChanges();
    if (!saved) {
      setIsUnsavedModalOpen(true);
      return;
    }
    if (pendingSelection) confirmSelection(pendingSelection);
    if (pendingPath) navigate(pendingPath);
    setPendingSelection(null);
    setPendingPath(null);
  };

  const handleDiscardChanges = () => {
    setIsUnsavedModalOpen(false);
    // No need to setHasUnsavedChanges(false) as we are selecting new data which resets initial/current state MATCH
    if (pendingSelection) confirmSelection(pendingSelection);
    if (pendingPath) navigate(pendingPath);
    setPendingSelection(null);
    setPendingPath(null);
  };

  // Data Fetching
  const fetchSavedMedications = useCallback(async () => {
    const { data, error } = await supabase.from('saved_medications').select('*').order('composition');
    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        ...item,
        freqMorning: item.freq_morning,
        freqNoon: item.freq_noon,
        freqNight: item.freq_night,
      }));
      setSavedMedications(mappedData as Medication[]);
    }
  }, []);

  const fetchAutofillKeywords = useCallback(async () => {
    if (!consultant) return;
    const { data } = await supabase.from('autofill_keywords').select('*').eq('consultant_id', consultant.id);
    if (data) setAutofillKeywords(data);
  }, [consultant]);

  const fetchTextShortcuts = useCallback(async () => {
    if (!consultant) return;
    const { data } = await supabase.from('text_shortcuts').select('*').eq('consultant_id', consultant.id);
    if (data) setTextShortcuts(data);
  }, [consultant]);

  const fetchReferralDoctors = useCallback(async () => {
    if (!consultant) return;
    const { data } = await supabase.from('referral_doctors').select('*').eq('consultant_id', consultant.id).order('name');
    if (data) setReferralDoctors(data);
  }, [consultant]);

  useEffect(() => {
    fetchSavedMedications();
    fetchAutofillKeywords();
    fetchTextShortcuts();
    fetchReferralDoctors();
  }, [fetchSavedMedications, fetchAutofillKeywords, fetchTextShortcuts, fetchReferralDoctors]);



  // Handlers

  /**
   * Updates patient demographic details.
   * Triggers autosave flag.
   */
  const handlePatientDetailsChange = useCallback((field: string, value: string) => {
    if (isReadOnly) return;
    setEditablePatientDetails(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  }, [isReadOnly]);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
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
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (isReadOnly) return;
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

  const handleAppendSuggestion = (field: string, suggestion: string | { text: string; translatedText?: string }) => {
    if (isReadOnly) return;
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
    const translatedText = typeof suggestion === 'string' ? undefined : suggestion.translatedText;

    setExtraData(prev => {
      const currentVal = prev[field as keyof typeof prev] as string || '';
      const separator = currentVal.trim() ? '\n' : '';

      const newState = { ...prev, [field]: currentVal + separator + text };

      // If there's a translation, also append it to the corresponding _te field
      const teField = `${field}_te`;
      if (translatedText && teField in prev) {
        const currentTeVal = (prev as any)[teField] || '';
        const teSeparator = currentTeVal.trim() ? '\n' : '';
        (newState as any)[teField] = currentTeVal + teSeparator + translatedText;
      }

      return newState;
    });
  };



  /**
   * Handles changes to "Extra Data" fields (Complaints, Findings, etc.).
   * 
   * Features:
   * - Text Shortcut Expansion: Replaces triggers like `//` with expansion content.
   * - Complaints Shortcuts: Expands `2w.` -> "2 weeks".
   * - Follow-up Shortcuts: Expands `2w.` -> "after 2 weeks...".
   * - Cursor Management: Restore cursor position after text replacement.
   * 
   * @param field - The field name in `extraData`.
   * @param value - The new value (usually string).
   * @param cursorPosition - The current cursor position (if applicable) for managing caret placement.
   */
  const handleExtraChange = useCallback((field: string, value: any, cursorPosition?: number | null) => {
    if (field === 'allergy') {
      setEditablePatientDetails(prev => prev ? ({ ...prev, allergies: value }) : prev);
      return;
    }
    if (field === 'complaints' && typeof value === 'string' && value.includes('//')) {
      setIsShortcutModalOpen(true);
      setExtraData(prev => ({ ...prev, [field]: value.replace('//', '') })); // Remove the trigger
      return;
    }

    if (field === 'referred_to_list' && Array.isArray(value) && value.some(val => typeof val === 'string' && val.includes('//'))) {
      setIsReferralModalOpen(true);
      const cleanedValue = value.map(val => typeof val === 'string' ? val.replace('//', '') : val);
      setExtraData(prev => ({ ...prev, [field]: cleanedValue }));
      return;
    }

    if (typeof value === 'string' && (field === 'complaints' || field === 'medicalHistory' || field === 'findings' || field === 'diagnosis' || field === 'advice' || field === 'followup' || field === 'personalNote' || field === 'procedure' || field === 'investigations' || field === 'referred_to' || field === 'orthotics')) {
      let processedValue = value;
      let newCursor = cursorPosition || value.length;

      // Special Duration Shortcuts for Complaints/Advice
      if (field === 'complaints' || field === 'advice' || field === 'medicalHistory' || field === 'investigations' || field === 'orthotics') {
        const textBeforeCursor = value.substring(0, newCursor);
        const durationRegex = /(\d+)([dwmy])\.\s$/i;
        const match = textBeforeCursor.match(durationRegex);

        if (match) {
          const shortcut = match[0];
          const count = parseInt(match[1], 10);
          const unitChar = match[2].toLowerCase();
          let unitText = '';

          switch (unitChar) {
            case 'd': unitText = count === 1 ? 'day' : 'days'; break;
            case 'w': unitText = count === 1 ? 'week' : 'weeks'; break;
            case 'm': unitText = count === 1 ? 'month' : 'months'; break;
            case 'y': unitText = count === 1 ? 'year' : 'years'; break;
          }

          if (unitText) {
            const expandedText = `${count} ${unitText} `;
            const shortcutIndex = textBeforeCursor.lastIndexOf(shortcut);
            if (shortcutIndex !== -1) {
              const textBefore = value.substring(0, shortcutIndex);
              const textAfter = value.substring(newCursor);
              processedValue = textBefore + expandedText + textAfter;
              newCursor = textBefore.length + expandedText.length;

              setExtraData(prev => ({ ...prev, [field]: processedValue }));
              setTimeout(() => {
                const refs: any = { advice: adviceRef, medicalHistory: medicalHistoryRef, investigations: investigationsRef, complaints: complaintsRef, orthotics: orthoticsRef };
                const targetRef = refs[field] || complaintsRef;
                if (targetRef.current) {
                  targetRef.current.setSelectionRange(newCursor, newCursor);
                }
              }, 0);
              return;
            }
          }
        } else if (field === 'complaints' || field === 'advice' || field === 'medicalHistory' || field === 'investigations' || field === 'orthotics') {
          // Unit-only shortcuts (e.g. "y. " -> "years ")
          const unitOnlyRegex = /(?:^|\s)([dwmy])\.\s$/i;
          const unitMatch = textBeforeCursor.match(unitOnlyRegex);

          if (unitMatch) {
            const fullShortcut = unitMatch[0];
            const unitChar = unitMatch[1].toLowerCase();
            let unitText = '';

            switch (unitChar) {
              case 'd': unitText = 'days'; break;
              case 'w': unitText = 'weeks'; break;
              case 'm': unitText = 'months'; break;
              case 'y': unitText = 'years'; break;
            }

            if (unitText) {
              const prefix = fullShortcut.match(/^\s/) ? ' ' : '';
              const expandedText = `${prefix}${unitText} `;

              const shortcutIndex = textBeforeCursor.lastIndexOf(fullShortcut);
              if (shortcutIndex !== -1) {
                const textBefore = value.substring(0, shortcutIndex);
                const textAfter = value.substring(newCursor);
                processedValue = textBefore + expandedText + textAfter;
                newCursor = textBefore.length + expandedText.length;

                setExtraData(prev => ({ ...prev, [field]: processedValue }));
                setTimeout(() => {
                  const refs: any = { advice: adviceRef, medicalHistory: medicalHistoryRef, investigations: investigationsRef, complaints: complaintsRef, orthotics: orthoticsRef };
                  const targetRef = refs[field] || complaintsRef;
                  if (targetRef.current) {
                    targetRef.current.setSelectionRange(newCursor, newCursor);
                  }
                }, 0);
                return;
              }
            }
          }
        }
      }

      // Special Followup Shortcuts
      if (field === 'followup') {
        const textBeforeCursor = value.substring(0, newCursor);
        const shortcutRegex = /(\d+)([dwmy])\.\s$/i;
        const match = textBeforeCursor.match(shortcutRegex);
        if (match) {
          const shortcut = match[0];
          const count = parseInt(match[1], 10);
          const unitChar = match[2].toLowerCase();
          let unitKey = '';
          switch (unitChar) {
            case 'd': unitKey = count === 1 ? 'day' : 'day_plural'; break;
            case 'w': unitKey = count === 1 ? 'week' : 'week_plural'; break;
            case 'm': unitKey = count === 1 ? 'month' : 'month_plural'; break;
            case 'y': unitKey = count === 1 ? 'year' : 'year_plural'; break;
          }
          if (unitKey) {
            const unitText = t(unitKey, { lng: consultationLanguage });
            const expandedText = t('followup_message_structure', { count, unit: unitText, lng: consultationLanguage }) + ' ';
            const shortcutIndex = textBeforeCursor.lastIndexOf(shortcut);
            if (shortcutIndex !== -1) {
              const textBefore = value.substring(0, shortcutIndex);
              const textAfter = value.substring(newCursor);
              processedValue = textBefore + expandedText + textAfter;
              newCursor = textBefore.length + expandedText.length;

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
          const refs = {
            complaints: complaintsRef.current,
            medicalHistory: medicalHistoryRef.current,
            findings: findingsRef.current,
            diagnosis: diagnosisRef.current,
            investigations: investigationsRef.current,
            procedure: procedureRef.current,
            advice: adviceRef.current,
            personalNote: personalNoteRef.current,
            followup: followupRef.current,
            referred_to: referredToRef.current,
            referred_by: referredByRef.current,
            orthotics: orthoticsRef.current,
          };
          const ref = (refs as any)[field];
          if (ref) {
            ref.setSelectionRange(processed.newCursorPosition, processed.newCursorPosition);
          }
        }, 0);
        return;
      }
    }

    if (isReadOnly) return;
    setExtraData(prev => ({ ...prev, [field]: value }));
  }, [textShortcuts, consultationLanguage, isReadOnly]);


  /**
   * Adds a medication to the list from a suggestion.
   * Handles language-specific fields (Telugu support) if applicable.
   */
  const handleMedicationSuggestionClick = useCallback((med: Medication) => {
    const isTelugu = consultationLanguage === 'te';

    let finalBrandName: string | undefined = med.brandName;

    // Auto-swap logic for generic suggestions
    const affordabilityPreference = extraData.affordabilityPreference || 'none';
    const currentLocation = selectedHospital?.name || '';

    if (affordabilityPreference !== 'none') {
      let validBrands = med.brand_metadata?.filter(b => !b.locations || b.locations.length === 0 || b.locations.includes(currentLocation)) || [];
      if (validBrands.length === 0 && med.brand_metadata) {
        validBrands = [...med.brand_metadata];
      }

      if (validBrands.length > 0) {
        if (affordabilityPreference === 'cheap') {
          validBrands.sort((a, b) => ((a.cost || 0) / (a.packSize || 1)) - ((b.cost || 0) / (b.packSize || 1)));
        } else if (affordabilityPreference === 'costly') {
          validBrands.sort((a, b) => ((b.cost || 0) / (b.packSize || 1)) - ((a.cost || 0) / (a.packSize || 1)));
        }
        finalBrandName = validBrands[0].name;
      }
    }

    const newMed: Medication = {
      id: crypto.randomUUID(),
      composition: med.composition || '',
      savedMedicationId: med.id,
      brandName: finalBrandName,
      brand_metadata: med.brand_metadata,
      dose: med.dose || '',
      freqMorning: med.freqMorning || false,
      freqNoon: med.freqNoon || false,
      freqNight: med.freqNight || false,
      // Active field based on language
      frequency: (isTelugu && med.frequency_te) ? med.frequency_te : (med.frequency || ''),
      duration: (isTelugu && med.duration_te) ? med.duration_te : (med.duration || ''),
      instructions: (isTelugu && med.instructions_te) ? med.instructions_te : (med.instructions || ''),
      notes: (isTelugu && med.notes_te) ? med.notes_te : (med.notes || ''),
      // Backup field (always the text for the *other* language)
      frequency_te: isTelugu ? (med.frequency || '') : (med.frequency_te || ''),
      duration_te: isTelugu ? (med.duration || '') : (med.duration_te || ''),
      instructions_te: isTelugu ? (med.instructions || '') : (med.instructions_te || ''),
      notes_te: isTelugu ? (med.notes || '') : (med.notes_te || '')
    };

    setExtraData(prev => {
      const meds = [...prev.medications];
      const emptyIdx = meds.findIndex(m => !m.composition || m.composition.trim() === "");

      if (emptyIdx !== -1) {
        // Use existing row but update all fields. Keep original stable ID for dnd-kit
        const existingId = meds[emptyIdx].id;
        meds[emptyIdx] = { ...newMed, id: existingId };
        return { ...prev, medications: meds };
      }
      return { ...prev, medications: [...prev.medications, newMed] };
    });
  }, [consultationLanguage, extraData.affordabilityPreference, selectedHospital?.name]);

  /**
   * Handles changes to individual medication fields.
   * Includes logic for:
   * - 'composition' field shortcuts: '//' for Keyword, '@' for Medication Manager (Admin only)
   * - Text shortcuts expansion for all text fields
   */
  const handleMedChange = useCallback((index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => {
    if (isReadOnly) return;
    setExtraData(prev => {
      const newMeds = [...prev.medications];
      const currentVal = newMeds[index][field];

      if (field === 'composition' && typeof value === 'string' && value.includes('@')) {
        if (isMasterAdmin) {
          setIsMedicationsModalOpen(true);
          newMeds[index] = { ...newMeds[index], composition: value.replace('@', '') };
          return { ...prev, medications: newMeds };
        }
      }

      if (field === 'composition' && typeof value === 'string' && value.includes('//')) {
        setIsKeywordModalOpen(true);
        newMeds[index] = { ...newMeds[index], composition: value.replace('//', '') };
        return { ...prev, medications: newMeds };
      }

      if (typeof value === 'string' && (field === 'composition' || field === 'dose' || field === 'frequency' || field === 'duration' || field === 'instructions' || field === 'notes')) {
        const processed = processTextShortcuts(value, cursorPosition || value.length, textShortcuts);
        if (processed) {
          newMeds[index] = { ...newMeds[index], [field]: processed.newValue };
          // Cursor update logic
          setTimeout(() => {
            const refs = {
              composition: medicationNameInputRef.current,
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

      if (field === 'composition') {
        newMeds[index] = {
          ...newMeds[index],
          [field]: value,
          brandName: undefined, // Reset brand name when composition is manually edited
          brand_metadata: []    // Reset brand metadata when composition is manually edited
        };
      } else {
        newMeds[index] = { ...newMeds[index], [field]: value };
      }
      return { ...prev, medications: newMeds };
    });
  }, [textShortcuts, isReadOnly]);

  /**
   * Handles language change for the entire consultation.
   * Swaps medication fields (frequency, duration, instructions, notes) with their Telugu counterparts.
   */
  const handleLanguageChange = useCallback((newLang: string) => {
    if (newLang === consultationLanguage || isReadOnly) return;

    setConsultationLanguage(newLang);

    setExtraData(prev => ({
      ...prev,
      // Two-way swap of clinical notes (only translated fields)
      advice: prev.advice_te || '',
      advice_te: prev.advice || '',
      followup: prev.followup_te || '',
      followup_te: prev.followup || '',

      // Two-way swap of medications
      medications: prev.medications.map(med => ({
        ...med,
        frequency: med.frequency_te || '',
        frequency_te: med.frequency || '',
        duration: med.duration_te || '',
        duration_te: med.duration || '',
        instructions: med.instructions_te || '',
        instructions_te: med.instructions || '',
        notes: med.notes_te || '',
        notes_te: med.notes || '',
      }))
    }));

    toast({
      title: "Language Switched",
      description: `Consultation switched to ${newLang === 'te' ? 'Telugu' : 'English'}. Text fields have been swapped.`,
    });
  }, [consultationLanguage, isReadOnly]);

  const addMedication = useCallback(() => {
    if (isReadOnly) return;
    const newMed: Medication = {
      id: crypto.randomUUID(),
      composition: '', dose: '', frequency: '', duration: '', instructions: '', notes: '',
      freqMorning: false, freqNoon: false, freqNight: false
    };
    setExtraData(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
  }, [isReadOnly]);

  const removeMedication = useCallback((index: number) => {
    if (isReadOnly) return;
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  }, [isReadOnly]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (isReadOnly) return;
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
  }, [isReadOnly]);

  // Suggestions Helpers (Protocol Logic)

  const { suggestedAdvice, suggestedInvestigations, suggestedFollowup, suggestedMedications, suggestedOrthotics } = useMemo(() => {
    const inputDerivedSuggestions = {
      advice: new Set<{ text: string; translatedText?: string; badge?: string }>(),
      investigations: new Set<string>(),
      followup: new Set<{ text: string; translatedText?: string }>(),
      orthotics: new Set<{ text: string; translatedText?: string }>(),
      medicationIds: new Set<number>()
    };

    const inputText = `${extraData.complaints} ${extraData.medicalHistory} ${extraData.diagnosis} ${extraData.procedure}`.toLowerCase();
    const activeText = `${extraData.complaints} ${extraData.diagnosis}`.toLowerCase();
    const isTelugu = consultationLanguage === 'te';

    // Automated Health Monitoring Suggestions (scan complaints/diagnosis only)
    const healthKeywords = [
      {
        keywords: ['diabetes', 'diabetic', 'sugar', 'dm', 'iddm', 'niddm'],
        en: 'Regular sugar monitoring/logging at home',
        te: 'ఇంట్లో క్రమం తప్పకుండా షుగర్ లెవల్స్ నమోదు చేయండి',
        badge: 'Sugar Tracking'
      },
      {
        keywords: ['hypertension', 'htn', 'bp', 'high bp', 'hypertensive'],
        en: 'Regular BP monitoring/logging at home',
        te: 'ఇంట్లో క్రమం తప్పకుండా బీపీ నమోదు చేయండి',
        badge: 'BP Tracking'
      },
      {
        keywords: ['fever', 'temp', 'febrile', 'chills'],
        en: 'Regular temperature/fever monitoring at home',
        te: 'ఇంట్లో క్రమం తప్పకుండా జ్వరం/ఉష్ణోగ్రత నమోదు చేయండి',
        badge: 'Temp Tracking'
      },
      {
        keywords: ['operated case of', 'post-op', 'postop', 'post operative'],
        en: 'Monitor recovery progress regularly',
        te: 'రికవరీ పురోగతిని క్రమం తప్పకుండా ఇంట్లో నమోదు చేయండి',
        badge: 'Recovery Tracking'
      },
      {
        keywords: ['operated case of', 'post-op', 'postop', 'post operative', 'joint pain', 'pain', 'severe pain', 'chronic pain', 'acute pain', 'persistent pain'],
        en: 'Regular pain monitoring/logging at home',
        te: 'ఇంట్లో క్రమం తప్పకుండా నొప్పి తీవ్రతను నమోదు చేయండి',
        badge: 'Pain Tracking'
      }
    ];

    healthKeywords.forEach(hk => {
      if (hk.keywords.some(k => activeText.includes(k))) {
        inputDerivedSuggestions.advice.add({
          text: isTelugu ? hk.te : hk.en,
          translatedText: isTelugu ? hk.en : hk.te,
          badge: hk.badge
        });
      }
    });

    autofillKeywords.forEach(protocol => {
      const match = (protocol.keywords || []).some(k => inputText.includes(k.toLowerCase()));
      if (match) {
        if (protocol.investigations) {
          protocol.investigations.split('\n').filter(Boolean).forEach(s => inputDerivedSuggestions.investigations.add(s.trim()));
        }

        if (protocol.advice || protocol.advice_te) {
          const en = protocol.advice || '';
          const te = protocol.advice_te || '';
          const active = isTelugu ? te : en;
          const backup = isTelugu ? en : te;
          if (active) {
            active.split('\n').filter(Boolean).forEach((s, idx) => {
              const translatedLines = backup.split('\n').filter(Boolean);
              inputDerivedSuggestions.advice.add({
                text: s.trim(),
                translatedText: translatedLines[idx]?.trim()
              });
            });
          }
        }

        if (protocol.followup || protocol.followup_te) {
          const en = protocol.followup || '';
          const te = protocol.followup_te || '';
          const active = isTelugu ? te : en;
          const backup = isTelugu ? en : te;
          if (active) {
            active.split('\n').filter(Boolean).forEach((s, idx) => {
              const translatedLines = backup.split('\n').filter(Boolean);
              inputDerivedSuggestions.followup.add({
                text: s.trim(),
                translatedText: translatedLines[idx]?.trim()
              });
            });
          }
        }

        if (protocol.orthotics || protocol.orthotics_te) {
          const en = protocol.orthotics || '';
          const te = protocol.orthotics_te || '';
          const active = isTelugu ? te : en;
          const backup = isTelugu ? en : te;
          if (active) {
            active.split('\n').filter(Boolean).forEach((s, idx) => {
              const translatedLines = backup.split('\n').filter(Boolean);
              inputDerivedSuggestions.orthotics.add({
                text: s.trim(),
                translatedText: translatedLines[idx]?.trim()
              });
            });
          }
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

    const currentlyAddedMedIds = new Set(extraData.medications.map(m => m.savedMedicationId).filter(Boolean));
    const currentlyAddedMedNames = new Set(extraData.medications.map(m => normalizeMedName(m.brandName || m.composition || '')));

    return {
      suggestedAdvice: Array.from(inputDerivedSuggestions.advice).filter(s => !extraData.advice.includes(s.text)),
      suggestedInvestigations: Array.from(inputDerivedSuggestions.investigations).filter(s => !extraData.investigations.includes(s)),
      suggestedFollowup: Array.from(inputDerivedSuggestions.followup).filter(s => !extraData.followup.includes(s.text)),
      suggestedOrthotics: Array.from(inputDerivedSuggestions.orthotics).filter(s => !extraData.orthotics.includes(s.text)),
      suggestedMedications: finalMedications
        .filter(m => {
          const isAddedById = currentlyAddedMedIds.has(m.id) || currentlyAddedMedIds.has(String(m.id) as any);
          const cleanedName = normalizeMedName(m.composition);
          const isAddedByName = Array.from(currentlyAddedMedNames).some(name => normalizeMedName(name) === cleanedName);
          return !isAddedById && !isAddedByName;
        })
        .map(med => {
          const affordabilityPreference = extraData.affordabilityPreference || 'none';
          const currentLocation = selectedHospital?.name || '';
          let bestBrand: string | undefined = undefined;

          if (med.brand_metadata && med.brand_metadata.length > 0) {
            let validBrands = med.brand_metadata.filter(b => !b.locations || b.locations.length === 0 || b.locations.includes(currentLocation));
            if (validBrands.length === 0) validBrands = [...med.brand_metadata];

            if (affordabilityPreference === 'cheap') {
              validBrands.sort((a, b) => ((a.cost || 0) / (a.packSize || 1)) - ((b.cost || 0) / (b.packSize || 1)));
            } else if (affordabilityPreference === 'costly') {
              validBrands.sort((a, b) => ((b.cost || 0) / (b.packSize || 1)) - ((a.cost || 0) / (a.packSize || 1)));
            }
            bestBrand = validBrands[0].name;
          }

          return {
            ...med,
            brandName: bestBrand
          };
        })
    };
  }, [autofillKeywords, extraData.complaints, extraData.medicalHistory, extraData.diagnosis, extraData.procedure, extraData.advice, extraData.investigations, extraData.followup, extraData.orthotics, extraData.medications, consultationLanguage, savedMedications, selectedLocation, extraData.affordabilityPreference]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: useCallback(async () => {
      // Small delay to ensure layout is settled and styles are parsed
      await new Promise(resolve => setTimeout(resolve, 500));
    }, []),
    onAfterPrint: useCallback(() => {
      // Focus search bar in sidebar after printing for better UX
      setTimeout(() => {
        sidebarSearchRef.current?.focus();
      }, 100);
    }, []),
  });

  const handleAfterPrintCertificate = useCallback(() => {
    setIsReadyToPrintCertificate(false);
    setTimeout(() => {
      sidebarSearchRef.current?.focus();
    }, 100);
  }, []);

  const handleCertificatePrint = useReactToPrint({
    contentRef: certificatePrintRef,
    onAfterPrint: handleAfterPrintCertificate,
    onBeforePrint: useCallback(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    }, []),
  });

  const handleAfterPrintReceipt = useCallback(() => {
    setIsReadyToPrintReceipt(false);
    setTimeout(() => {
      sidebarSearchRef.current?.focus();
    }, 100);
  }, []);

  const handleReceiptPrint = useReactToPrint({
    contentRef: receiptPrintRef,
    onAfterPrint: handleAfterPrintReceipt,
    onBeforePrint: useCallback(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    }, []),
  });

  const handleSaveAndPrint = useCallback(async () => {
    if (isReadOnly) {
      handlePrint();
      return;
    }
    const latestData = syncExtraDataFromRefs();
    const saved = await saveChanges({ markAsCompleted: true, extraDataOverride: latestData });
    if (saved) {
      await waitForNextPaint();
      // Additional wait to ensure DOM settles after save/state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      handlePrint();
    }
  }, [syncExtraDataFromRefs, saveChanges, handlePrint]);

  const handleOpenMedicalCertificate = async () => {
    syncExtraDataFromRefs();
    setIsMedicalCertificateModalOpen(true);
  };

  const handleMedicalCertificateSubmit = async (data: CertificateData) => {
    const latestData = syncExtraDataFromRefs();

    let updatedCertificates: CertificateData[];
    if (editingCertificateIndex !== null) {
      // Update existing
      updatedCertificates = [...(latestData.certificates || [])];
      updatedCertificates[editingCertificateIndex] = data;
    } else {
      // Add new
      updatedCertificates = [data, ...(latestData.certificates || [])];
    }

    const dataToSave = { ...latestData, certificates: updatedCertificates };

    setExtraData(dataToSave);
    await saveChanges({ extraDataOverride: dataToSave });

    setCertificateData(data);
    setIsMedicalCertificateModalOpen(false);
    setEditingCertificateIndex(null); // Reset
    setIsReadyToPrintCertificate(true);
  };

  const handleEditCertificate = (index: number) => {
    setEditingCertificateIndex(index);
    setIsMedicalCertificateModalOpen(true);
  };

  const handleDeleteCertificate = async (index: number) => {
    const latestData = syncExtraDataFromRefs();
    const updatedCertificates = (latestData.certificates || []).filter((_, i) => i !== index);
    const dataToSave = { ...latestData, certificates: updatedCertificates };
    setExtraData(dataToSave);
    await saveChanges({ extraDataOverride: dataToSave });
  };

  const handleEditReceipt = (index: number) => {
    setEditingReceiptIndex(index);
    setIsReceiptModalOpen(true);
  };

  const handleDeleteReceipt = async (index: number) => {
    const latestData = syncExtraDataFromRefs();
    const updatedReceipts = (latestData.receipts || []).filter((_, i) => i !== index);
    const dataToSave = { ...latestData, receipts: updatedReceipts };
    setExtraData(dataToSave);
    await saveChanges({ extraDataOverride: dataToSave });
  };



  const handleDeleteClick = async (e: React.MouseEvent, c: Consultation) => {
    e.stopPropagation();
    setPendingSelection(c);
    setIsDeleteModalOpen(true);
    setIsOnlyConsultation(false); // Reset first
    setDeletePatientAlso(false);

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
    } finally {
      setDeletePatientAlso(false);
      setPendingSelection(null);
    }
  };

  const drugWarnings = useMemo((): DrugWarning[] => {
    const warnings: DrugWarning[] = [];
    const clinicalTextRaw = [
      extraData.complaints,
      extraData.medicalHistory,
      extraData.diagnosis,
      extraData.findings
    ].join(' ').toLowerCase();

    // 1. Negation Pre-masking: Remove clauses that likely refer to absence/negative findings
    // We strip text starting from a negation keyword up until the next major punctuation
    const clinicalTextSanitized = clinicalTextRaw.replace(
      /\b(no|nil|denies|denied|r\/o|rule out|ruled out|without|absent)\b[^.,;]*/gi,
      ''
    );

    const allergiesText = (editablePatientDetails?.allergies || '').toLowerCase();
    const ALLERGY_STOPWORDS = new Set(['known', 'none', 'nkda', 'nil', 'mild', 'rash', 'allergies', 'allergy', 'stated', 'to', 'no', 'h/o', 'f/h/o', 'past', 'previous', 'suspected']);

    // Set to track unique interactions to avoid duplicates: medA_idx|medB_idx|substance
    const interactionSet = new Set<string>();

    extraData.medications.forEach((med, idx) => {
      const composition = med.composition?.toLowerCase()?.trim();
      if (!composition) return;

      // 2. Allergy check with word boundaries and stopwords
      if (allergiesText) {
        const allergyTokens = allergiesText.split(/[,;\s]+/).filter(t => t.length > 2 && !ALLERGY_STOPWORDS.has(t));
        for (const token of allergyTokens) {
          try {
            const allergyRe = new RegExp(`\\b${escapeRegex(token)}\\b`, 'i');
            if (allergyRe.test(composition)) {
              warnings.push({ medIndex: idx, type: 'allergy', message: `Patient may be allergic to ${token} (matches ${med.composition})` });
              break;
            }
          } catch (e) { console.error("Regex error in allergy check", e); }
        }
      }

      // 3. SavedMed Lookup (ID then Fallback to Name)
      let savedMed = savedMedications.find(s => String(s.id) === String(med.savedMedicationId));
      if (!savedMed) {
        savedMed = savedMedications.find(s => normalizeMedName(s.composition) === normalizeMedName(med.composition));
      }
      if (!savedMed) return;

      // 4. Contraindication check with Negation Detection
      (savedMed.contraindications || []).forEach(condition => {
        const cond = condition.trim().toLowerCase();
        if (!cond) return;

        try {
          // Since clinicalTextSanitized has negated bits removed, we can just do a direct word boundary match
          const contraRe = new RegExp(`\\b${escapeRegex(cond)}\\b`, 'i');
          if (contraRe.test(clinicalTextSanitized)) {
            warnings.push({ medIndex: idx, type: 'contraindication', message: `Avoid in ${condition}` });
          }
        } catch (e) { console.error("Regex error in contraindication check", e); }
      });

      // 5. Drug-drug interaction check (symmetric and properly deduped)
      (savedMed.interactions || []).forEach(interactingComp => {
        const interCompLower = interactingComp.toLowerCase().trim();
        if (!interCompLower) return;

        extraData.medications.forEach((otherMed, otherIdx) => {
          if (idx === otherIdx || !otherMed.composition) return;

          if (otherMed.composition.toLowerCase().includes(interCompLower)) {
            const medA_comp = med.composition || '';
            const medB_comp = otherMed.composition || '';

            // Unique key for this specific interaction pair
            const iKey = `${idx}|${otherIdx}|${interCompLower}`;
            const reverseKey = `${otherIdx}|${idx}|${interCompLower}`;

            if (!interactionSet.has(iKey)) {
              warnings.push({ medIndex: idx, type: 'interaction', message: `Interacts with ${medB_comp} (${interactingComp})` });
              interactionSet.add(iKey);
            }
            if (!interactionSet.has(reverseKey)) {
              warnings.push({ medIndex: otherIdx, type: 'interaction', message: `Interacts with ${medA_comp} (${interactingComp})` });
              interactionSet.add(reverseKey);
            }
          }
        });
      });
    });

    return warnings;
  }, [
    extraData.medications, extraData.complaints, extraData.medicalHistory,
    extraData.diagnosis, extraData.findings,
    editablePatientDetails?.allergies, savedMedications
  ]);

  // Filter Consultations
  const filteredConsultations = useMemo(() => {
    return allConsultations.filter(c => {
      if (selectedHospital?.name && c.location && !areLocationsEqual(c.location, selectedHospital.name)) {
        return false;
      }
      return true;
    });
  }, [allConsultations, selectedHospital]);

  const pendingConsultations = filteredConsultations.filter(c => c.status === 'pending');
  const evaluationConsultations = filteredConsultations.filter(c => c.status === 'under_evaluation');
  const completedConsultations = filteredConsultations.filter(c => c.status === 'completed');


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
        saveChanges().catch(err => {
          console.error("Manual save failed:", err);
          toast({ variant: 'destructive', title: 'Save Failed', description: String(err) });
        });
      }
      // Print: Ctrl/Cmd + P
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handleSaveAndPrint().catch(err => {
          console.error("Manual print failed:", err);
          toast({ variant: 'destructive', title: 'Print Failed', description: String(err) });
        });
      }
      // Search: Ctrl/Cmd + F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges, handleSaveAndPrint]);

  // Touch Gestures for Mobile/Tablet
  useEffect(() => {
    let touchStartTime = 0;
    let touchCount = 0;
    let startY = 0;
    let lastY = 0;
    let longPressTimer: NodeJS.Timeout | null = null;
    let hasSignificantMove = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now();
      touchCount = e.touches.length;
      startY = e.touches[0].clientY;
      lastY = startY;
      hasSignificantMove = false;

      if (touchCount === 3) {
        longPressTimer = setTimeout(() => {
          if (!hasSignificantMove) {
            // 3 finger long press: Save & Print
            handleSaveAndPrint().catch(err => {
              console.error("Touch print failed:", err);
              toast({ variant: 'destructive', title: 'Print Failed', description: String(err) });
            });
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }, 800); // 800ms for long press
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (Math.abs(currentY - startY) > 10) {
        hasSignificantMove = true;
      }
      lastY = currentY;
      if (longPressTimer) clearTimeout(longPressTimer);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) clearTimeout(longPressTimer);
      const duration = Date.now() - touchStartTime;
      const deltaY = lastY - startY;

      if (touchCount === 2) {
        if (deltaY > 50 && Math.abs(deltaY) > 30) {
          // 2 finger swipe down: Search Old Consultations (Cmd+F)
          setIsSearchModalOpen(true);
          if (navigator.vibrate) navigator.vibrate(30);
        } else if (!hasSignificantMove && duration < 300) {
          // 2 finger tap: Focus Search Bar (Cmd+D)
          window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'd',
            metaKey: true,
            ctrlKey: true,
            bubbles: true
          }));
        }
      } else if (touchCount === 3) {
        if (!hasSignificantMove && duration < 300) {
          // 3 finger tap: Quick Save (Cmd+S)
          saveChanges().catch(err => {
            console.error("Touch save failed:", err);
            toast({ variant: 'destructive', title: 'Save Failed', description: String(err) });
          });
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [saveChanges, handleSaveAndPrint]);

  const handleRegistrationSuccess = async (newConsultation: Consultation, consultationData?: Partial<ExtraData>) => {
    setIsRegistrationModalOpen(false);

    // If we don't have patient data, hydrate first to avoid null access
    if (newConsultation?.id && !newConsultation.patient && !String(newConsultation.patient_id).startsWith('offline-')) {
      const hydrated = await hydrateInsertedConsultation(newConsultation.id, { force: true });
      if (hydrated) {
        const consultationToSelect = { ...hydrated };
        if (consultationData) {
          consultationToSelect.consultation_data = {
            ...(consultationToSelect.consultation_data || {}),
            ...consultationData
          } as ExtraData;
        }
        confirmSelection(consultationToSelect);
      }
      return;
    }

    // Track ID to prevent WebSocket redundant fetch (only when already hydrated)
    if (newConsultation.id) {
      recentlyHandledIds.current.add(newConsultation.id);
      // Clean up after 10 seconds
      setTimeout(() => recentlyHandledIds.current.delete(newConsultation.id), 10000);
    }

    if (String(newConsultation.patient_id).startsWith('offline-')) {
      setAllConsultations(prev => [newConsultation, ...prev]);
      confirmSelection(newConsultation);
    } else if (selectedDate) {
      // Ensure the new record belongs to the currently viewed date
      const dataDate = format(new Date(newConsultation.created_at), 'yyyy-MM-dd');
      const viewDate = format(selectedDate || new Date(), 'yyyy-MM-dd');
      if (dataDate !== viewDate) return;

      // Optimization: Update list locally instead of full re-fetch
      setAllConsultations(prev => {
        const exists = prev.some(c => c.id === newConsultation.id);
        if (exists) return prev;
        return [newConsultation, ...prev];
      });

      // Ensure data is merged if provided
      const consultationToSelect = { ...newConsultation };
      if (consultationData) {
        consultationToSelect.consultation_data = {
          ...(consultationToSelect.consultation_data || {}),
          ...consultationData
        } as ExtraData;
      }

      confirmSelection(consultationToSelect);
    }
  };


  const handleLocationChange = (name: string) => {
    const h = hospitals.find(x => x.name === name);
    if (h) {
      setSelectedLocation(h.name);
      setIsGpsEnabled(false);
    }
  };



  if (isHospitalsLoading || isConsultantLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Initializing workspace...</p>
      </div>
    );
  }

  // Doctor Auth Gate
  if (!consultant || isReceptionist) {
    return (
      <DoctorLoginGate
        restrictToDoctor={true}
        onLogin={(phone, name) => {
          localStorage.setItem('consultant_phone', phone);
          localStorage.setItem('consultant_name', name);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ConsultationSidebar
            selectedHospitalName={selectedHospital.name}
            onHospitalSelect={handleLocationChange}
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
            onShortcutsClick={() => setIsShortcutModalOpen(true)}
            personalNote={extraData.personalNote || ''}
            onPersonalNoteChange={(val) => handleExtraChange('personalNote', val)}
            personalNoteRef={personalNoteRef}
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
            referredByRef={referredByRef}
            initialReferredBy={initialExtraData?.referred_by}
            onProfileClick={() => setIsProfileModalOpen(true)}
            hasChanges={hasChanges}
            onNavigate={handleNavigate}
            searchInputRef={sidebarSearchRef}
          />

          <div className="lg:col-span-3 min-h-[calc(100vh-2rem)]">
            {selectedConsultation && editablePatientDetails ? (
              <div className="space-y-6">
                <PatientDemographics
                  patient={editablePatientDetails}
                  visitType={extraData.visit_type}
                  onVisitTypeChange={(t) => handleExtraChange('visit_type', t)}
                  lastVisitDate={lastVisitDate}
                  onHistoryClick={
                    (lastVisitDate && lastVisitDate !== 'First Consultation')
                      ? () => selectedConsultation?.patient.id && handleOpenHistory(String(selectedConsultation.patient.id), selectedConsultation.patient.name)
                      : undefined
                  }
                  onPatientDetailsChange={handlePatientDetailsChange}
                  isPatientDatePickerOpen={isPatientDatePickerOpen}
                  setIsPatientDatePickerOpen={setIsPatientDatePickerOpen}
                  age={age}
                  onAgeChange={handleAgeChange}
                  onDateChange={handleDateChange}
                  onLinkClick={() => setIsLinkPatientModalOpen(true)}
                  isReadOnly={isReadOnly}
                />

                <div id="vitals-section">
                  <VitalsForm
                    weight={extraData.weight}
                    height={extraData.height}
                    pulse={extraData.pulse}
                    spo2={extraData.spo2}
                    bp={extraData.bp}
                    temperature={extraData.temperature}
                    allergy={editablePatientDetails.allergies || ''}
                    bloodGroup={editablePatientDetails.blood_group}
                    onExtraChange={handleExtraChange}
                    onPatientDetailsChange={handlePatientDetailsChange}
                    initialData={initialExtraData}
                    initialPatientData={initialPatientDetails}
                    isReadOnly={isReadOnly}
                  />
                </div>

                <PatientHealthDashboard
                  patientId={String(selectedConsultation.patient.id)}
                />

                <div id="clinical-notes-section">
                  <ClinicalNotesForm
                    extraData={extraData}
                    onExtraChange={handleExtraChange}
                    complaintsRef={complaintsRef}
                    medicalHistoryRef={medicalHistoryRef}
                    findingsRef={findingsRef}
                    investigationsRef={investigationsRef}
                    diagnosisRef={diagnosisRef}
                    procedureRef={procedureRef}
                    adviceRef={adviceRef}
                    orthoticsRef={orthoticsRef}
                    referredToRef={referredToRef}
                    suggestedInvestigations={suggestedInvestigations}
                    suggestedAdvice={suggestedAdvice}
                    suggestedOrthotics={suggestedOrthotics}
                    onInvestigationSuggestionClick={(val) => handleAppendSuggestion('investigations', val)}
                    onAdviceSuggestionClick={(val) => handleAppendSuggestion('advice', val)}
                    onOrthoticsSuggestionClick={(val) => handleAppendSuggestion('orthotics', val)}
                    matchedGuides={matchedGuides}
                    isProcedureExpanded={isProcedureExpanded}
                    setIsProcedureExpanded={setIsProcedureExpanded}
                    isReferredToExpanded={isReferredToExpanded}
                    setIsReferredToExpanded={setIsReferredToExpanded}
                    referralDoctors={referralDoctors}
                    language={consultationLanguage}
                    onLanguageChange={handleLanguageChange}
                    initialData={initialExtraData}
                    isReadOnly={isReadOnly}
                    patientId={selectedConsultation?.patient?.id}
                    onShortcutsClick={() => setIsShortcutModalOpen(true)}
                  />
                </div>

                <div id="medications-section">
                  <MedicationManager
                    drugWarnings={drugWarnings}
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
                    currentLocation={selectedLocation}
                    affordabilityPreference={extraData.affordabilityPreference}
                    onAffordabilityChange={(val) => setExtraData(prev => ({ ...prev, affordabilityPreference: val }))}
                    consultationId={selectedConsultation?.id}
                    isMasterAdmin={isMasterAdmin}
                    isReadOnly={isReadOnly}
                  />

                </div>

                <FollowUpSection
                  followup={extraData.followup}
                  onExtraChange={handleExtraChange}
                  followupRef={followupRef}
                  suggestedFollowup={suggestedFollowup}
                  onFollowupSuggestionClick={(val) => handleAppendSuggestion('followup', val)}
                  language={consultationLanguage}
                  baseDate={selectedConsultation ? new Date(selectedConsultation.created_at) : new Date()}
                  initialFollowup={initialExtraData?.followup}
                  isReadOnly={isReadOnly}
                />

                <SavedDocumentsSection
                  className="mt-6"
                  certificates={extraData.certificates || []}
                  receipts={extraData.receipts || []}
                  onEditCertificate={handleEditCertificate}
                  onDeleteCertificate={handleDeleteCertificate}
                  onEditReceipt={handleEditReceipt}
                  onDeleteReceipt={handleDeleteReceipt}
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
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Consultant Share</Label>
                                <Input
                                  type="text"
                                  placeholder="Amount or %"
                                  value={extraData.procedure_consultant_cut}
                                  onChange={(e) => handleExtraChange('procedure_consultant_cut', e.target.value)}
                                  disabled={isReadOnly}
                                />
                                {extraData.procedure_consultant_cut?.toString().endsWith('%') && extraData.procedure_fee && (
                                  <p className="text-[10px] text-primary font-bold mt-1 animate-pulse-soft">
                                    Calculated: ₹{((parseFloat(extraData.procedure_consultant_cut.toString().replace('%', '')) / 100) * Number(extraData.procedure_fee)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground">Type e.g. 500 or 10%</p>
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
                                disabled={isReadOnly}
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
                  currentLocation={selectedLocation}
                  onSaveBundleClick={handleSaveBundleClick}
                  onMedicalCertificateClick={handleOpenMedicalCertificate}
                  onReceiptClick={() => setIsReceiptModalOpen(true)}
                  onManageMedicationsClick={isMasterAdmin ? () => setIsMedicationsModalOpen(true) : undefined}
                  onManageKeywordsClick={() => setIsKeywordModalOpen(true)}
                  onManageShortcutsClick={() => setIsShortcutModalOpen(true)}
                  onManageReferralDoctorsClick={() => setIsReferralModalOpen(true)}
                  onSendCompletionClick={handleOpenCompletionModal}
                  isAutoSendEnabled={isAutoSendEnabled}
                  showDoctorProfile={showDoctorProfile}
                  onToggleDoctorProfile={toggleDoctorProfile}
                  showSignSeal={showSignSeal}
                  onToggleSignSeal={toggleSignSeal}
                  printOptions={printOptions}
                  onUpdatePrintOptions={updatePrintOptions}

                  isReadOnly={isReadOnly}
                  isWhatsAppEnabled={consultant?.is_whatsauto_active}
                  hasChanges={hasChanges}
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
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={printRef}>
          {selectedConsultation && editablePatientDetails && (
            <Prescription
              patient={editablePatientDetails}
              consultation={cleanConsultationData(extraData)}
              consultationDate={selectedDate || new Date()}
              age={age}
              language={consultationLanguage}
              logoUrl={selectedHospital.logoUrl}
              hospitalName={selectedHospital.name}
              className="min-h-[297mm]"
              visitType={extraData.visit_type}
              forceDesktop={true}
              showDoctorProfile={showDoctorProfile}
              showSignSeal={showSignSeal}
              printOptions={printOptions}
              consultant={consultant}
            />
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={certificatePrintRef}>
          {selectedConsultation && editablePatientDetails && certificateData && (
            <MedicalCertificate patient={editablePatientDetails} diagnosis={extraData.diagnosis} certificateData={certificateData} consultant={consultant} showSignSeal={showSignSeal} />
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={receiptPrintRef}>
          {selectedConsultation && editablePatientDetails && receiptData && (
            <Receipt patient={editablePatientDetails} receiptData={receiptData} consultant={consultant} />
          )}
        </div>
      </div>

      {/* Modals */}
      <SavedMedicationsModal isOpen={isMedicationsModalOpen} onClose={() => setIsMedicationsModalOpen(false)} onMedicationsUpdate={fetchSavedMedications} />
      <KeywordManagementModal isOpen={isKeywordModalOpen} onClose={() => { setIsKeywordModalOpen(false); setKeywordModalPrefill(null); }} prefilledData={keywordModalPrefill} consultantId={consultant?.id} />
      <UnsavedChangesModal isOpen={isUnsavedModalOpen} onConfirm={handleConfirmSave} onDiscard={handleDiscardChanges} />
      <PatientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryPatientId(null);
        }}
        patientId={historyPatientId}
        patientName={historyPatientName}
        onSelectConsultation={(consultation) => {
          const consultationDate = new Date(consultation.created_at);
          setSelectedDate(consultationDate);
          // Directly load the consultation. This handles location updates and UI rendering.
          handleSelectConsultation(consultation);
          setIsHistoryModalOpen(false);
          setHistoryPatientId(null);
        }}
      />
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeletePatientAlso(false);
            setPendingSelection(null);
          }
        }}
      >
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
      <TextShortcutManagementModal isOpen={isShortcutModalOpen} onClose={() => setIsShortcutModalOpen(false)} onUpdate={fetchTextShortcuts} consultantId={consultant?.id} />

      <OnboardingTour run={showTour} onComplete={handleTourComplete} />
      <ReferralDoctorManagementModal isOpen={isReferralModalOpen} onClose={() => setIsReferralModalOpen(false)} onUpdate={fetchReferralDoctors} consultantId={consultant?.id} />
      {
        selectedConsultation && editablePatientDetails && (
          <MedicalCertificateModal
            isOpen={isMedicalCertificateModalOpen}
            onClose={() => {
              setIsMedicalCertificateModalOpen(false);
              setEditingCertificateIndex(null);
            }}
            onSubmit={handleMedicalCertificateSubmit}
            patientName={editablePatientDetails.name}
            patient={editablePatientDetails}
            diagnosis={extraData.diagnosis}
            initialData={editingCertificateIndex !== null ? extraData.certificates?.[editingCertificateIndex] : null}
          />
        )
      }
      {
        selectedConsultation && editablePatientDetails && (
          <ReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => {
              setIsReceiptModalOpen(false);
              setEditingReceiptIndex(null);
            }}
            onSubmit={async (data) => {
              const latestData = syncExtraDataFromRefs();

              let updatedReceipts: ReceiptData[];
              if (editingReceiptIndex !== null) {
                updatedReceipts = [...(latestData.receipts || [])];
                updatedReceipts[editingReceiptIndex] = {
                  ...data,
                  created_at: latestData.receipts?.[editingReceiptIndex]?.created_at || new Date().toISOString()
                };
              } else {
                const receiptWithDate = { ...data, created_at: new Date().toISOString() };
                updatedReceipts = [receiptWithDate, ...(latestData.receipts || [])];
              }

              const dataToSave = { ...latestData, receipts: updatedReceipts };

              setExtraData(dataToSave);
              await saveChanges({ extraDataOverride: dataToSave });

              setReceiptData(data);
              setIsReceiptModalOpen(false);
              setEditingReceiptIndex(null);
              setIsReadyToPrintReceipt(true);
            }}
            patientName={editablePatientDetails.name}
            initialData={editingReceiptIndex !== null ? extraData.receipts?.[editingReceiptIndex] : null}
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
              onSuccess={handleRegistrationSuccess}
              consultantId={consultant?.id}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CompletionMessageModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        patientPhone={editablePatientDetails?.phone || ''}
        initialMessage={completionMessage}
        consultantId={consultant?.phone}
        isWhatsAppIntegrated={consultant?.is_whatsauto_active}
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
          // Directly load the consultation. This handles location updates and UI rendering.
          handleSelectConsultation(consultation);
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
      {isProfileModalOpen && (
        <ConsultantProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
};

export default ConsultationPage;
