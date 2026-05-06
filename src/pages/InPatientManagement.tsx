import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, differenceInDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import {
    Users,
    UserPlus,
    Calendar,
    Stethoscope,
    ClipboardList,
    Send,
    ArrowRightLeft,
    Search,
    CheckCircle2,
    History,
    Loader2,
    BedDouble,
    Pencil,
    FileText,
    CalendarDays,
    User,
    CalendarCheck,
    BookOpen,
    AlertTriangle,
    Activity,
    Trash2,
    Download,
    MoreVertical,
    ExternalLink,
    ChevronDown,
    X,
    ClipboardPen,
    Settings2,
    Bot,
    Languages
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { pruneEmptyFields } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReactToPrint } from 'react-to-print';
import { DischargeSummaryPrint } from '@/components/inpatient/DischargeSummaryPrint';
import { PrintSettingsModal } from '@/components/consultation/PrintSettingsModal';
import { Printer, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMatchingGuides } from '@/lib/guideMatching';
import { useHospitalLocation } from '@/hooks/useHospitalLocation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/lib/age";
import { Switch } from "@/components/ui/switch";
import { MedicationManager } from '@/components/consultation/MedicationManager';
import { Medication } from '@/types/consultation';
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMedicationManager } from '../hooks/useMedicationManager';
import { useClinicalAutofill } from '../hooks/useClinicalAutofill';
import { useMedicationLibrary } from '../hooks/useMedicationLibrary';
// Removed useTranslation import correctly
import { DISCHARGE_INSTRUCTIONS, DAMA_TEXT } from '@/utils/dischargeConstants';
import { ConsentManagementModal } from '@/components/inpatient/ConsentManagementModal';
// Removed ConsentTemplateManager import
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useConsultant } from '@/context/ConsultantContext';
import { DoctorLoginGate } from '@/components/consultation/DoctorLoginGate';
import { SchedulePopover } from '@/components/SchedulePopover';
import { scheduleService } from '@/utils/scheduleService';
import { getLocalDateTime } from '@/utils/dateUtils';
import { MessagingSettingsModal } from '@/components/consultant/MessagingSettingsModal';
import { useHospitals } from '@/context/HospitalsContext';

// --- Types ---
import { InPatient, DischargeSummary, DischargeData } from '@/types/inPatients';
import { Consultant, PrintOptions } from '@/types/consultation';


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


// --- Main Component ---

const cleanText = (html: string) => html.replace(/<[^>]*>?/gm, ' ');



const InPatientManagement = () => {
    const { consultant, isMasterAdmin, isLoading: isConsultantLoading, refreshConsultant } = useConsultant();
    const { hospitals, getHospitalByName } = useHospitals();
    const {
        locationName,
        isGpsEnabled,
        toggleGps,
        handleManualLocationChange
    } = useHospitalLocation('inpatient');
    const [isMessagingSettingsModalOpen, setIsMessagingSettingsModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [dischargeDateStart, setDischargeDateStart] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dischargeDateEnd, setDischargeDateEnd] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [isAdmissionDatePickerOpen, setIsAdmissionDatePickerOpen] = useState(false);
    const [isProcedureDatePickerOpen, setIsProcedureDatePickerOpen] = useState(false);
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState('admitted');
    const [fetchAll, setFetchAll] = useState(false);
    const [inPatientLanguage, setInPatientLanguage] = useState<string>('te');
    const { savedMedications, refreshLibrary: fetchSavedMedications } = useMedicationLibrary();
    const { autofillKeywords, processFieldChange: autofillProcessor } = useClinicalAutofill({ consultantId: consultant?.id });

    // Refs
    const dischargeFormRef = useRef<{ print: () => void }>(null);
    const admissionDiagnosisRef = useRef<HTMLInputElement>(null);
    const admissionProcedureRef = useRef<HTMLTextAreaElement>(null);

    // Printing
    const [printData, setPrintData] = useState<DischargeSummary | null>(null);
    const [printDate, setPrintDate] = useState<string | undefined>(undefined);
    const [printConsultant, setPrintConsultant] = useState<Consultant | null>(null);
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);


    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setIsReadyToPrint(false),
        onBeforePrint: useCallback(async () => {
            // Small delay to ensure layout is settled and styles are parsed
            await new Promise(resolve => setTimeout(resolve, 500));
        }, []),
        pageStyle: `
            @page {
                /* Custom size: Width (210mm) followed by Height (310mm) */
                size: 210mm 302mm;
                /* General margins for 2nd page onwards - safer bottom margin to prevent footer cutoff */
                margin: 15mm 10mm 0mm 20mm;
            }
            @page :first {
                size: 210mm 297mm;
                /* Specific margins for 1st page - as requested */
                margin: 2mm 10mm 1mm 20mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });
    // After all hooks to follow rules
    React.useEffect(() => {
        if (isReadyToPrint && printRef.current) {
            handlePrint();
        }
    }, [isReadyToPrint, handlePrint]);

    const triggerPrint = (summary: DischargeSummary, consultantData?: Consultant | null, date?: string) => {
        setPrintData(summary);
        setPrintDate(date);
        setPrintConsultant(consultantData || null);
        setIsReadyToPrint(true);
    };

    const handleSavePrintSettings = async (
        profile: boolean,
        signSeal: boolean,
        options: PrintOptions,
        multiChanges?: Record<string, { profile: boolean, signSeal: boolean, options: PrintOptions }>
    ) => {
        if (!consultant) return;

        try {
            const currentSettings = consultant.messaging_settings || {};
            let newSettings = { ...currentSettings };

            if (multiChanges) {
                // Batch update all locations
                const optionsMap = { ...(currentSettings.location_print_options || {}) };
                const overridesMap = { ...(currentSettings.location_print_overrides || {}) };

                Object.entries(multiChanges).forEach(([loc, data]) => {
                    optionsMap[loc] = data.options;
                    overridesMap[loc] = {
                        ...(overridesMap[loc] || {}),
                        show_profile: data.profile,
                        show_sign_seal: data.signSeal
                    };
                });

                newSettings.location_print_options = optionsMap;
                newSettings.location_print_overrides = overridesMap;
            } else {
                // Single update (fallback)
                const location = settingsLocation;
                newSettings.location_print_options = {
                    ...(currentSettings.location_print_options || {}),
                    [location]: options
                };

                const printOverrides = currentSettings.location_print_overrides || {};
                newSettings.location_print_overrides = {
                    ...printOverrides,
                    [location]: {
                        ...(printOverrides[location] || {}),
                        show_profile: profile,
                        show_sign_seal: signSeal
                    }
                };
            }

            const { error } = await supabase
                .from('consultants')
                .update({ messaging_settings: newSettings })
                .eq('id', consultant.id);

            if (error) throw error;
            await refreshConsultant();
            toast({ title: "Success", description: "Print settings updated." });
            setIsPrintSettingsModalOpen(false);
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
        }
    };


    const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const [settingsLocation, setSettingsLocation] = useState('OrthoLife');

    // Print Settings Computed State
    const localProfileEnabled = useMemo(() => {
        const overrides = consultant?.messaging_settings?.location_print_overrides?.[settingsLocation] || {};
        return overrides.show_profile ?? true;
    }, [consultant, settingsLocation]);

    const localSignSealEnabled = useMemo(() => {
        const overrides = consultant?.messaging_settings?.location_print_overrides?.[settingsLocation] || {};
        return overrides.show_sign_seal ?? true;
    }, [consultant, settingsLocation]);

    const localPrintOptions = useMemo(() => {
        const options = consultant?.messaging_settings?.location_print_options;
        return options?.[settingsLocation] || options?.['OrthoLife'];
    }, [consultant, settingsLocation]);

    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    // Removed isTemplateManagerOpen state

    const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);

    // Consolidated Sync Handler
    const updateLocalLanguage = (code: string) => {
        setInPatientLanguage(code);
        setAdmissionData(prev => ({ ...prev, language: code }));
    };

    // Selection States
    const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<InPatient | null>(null);
    const [selectedPatientForWhatsApp, setSelectedPatientForWhatsApp] = useState<InPatient | null>(null);
    const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<InPatient | null>(null);
    const [selectedPatientForConsent, setSelectedPatientForConsent] = useState<InPatient | null>(null);
    const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
    const [whatsAppType, setWhatsAppType] = useState<'pre-op' | 'post-op' | 'rehab' | 'general'>('general');
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [matchedGuideTitle, setMatchedGuideTitle] = useState<string | null>(null);
    const [availableGuides, setAvailableGuides] = useState<any[]>([]);
    const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
    const [currentGuideLink, setCurrentGuideLink] = useState<string | null>(null);
    const [whatsAppPhone, setWhatsAppPhone] = useState('');
    const [scheduledDate, setScheduledDate] = useState<Date>();
    const [scheduledTime, setScheduledTime] = useState("");

    // Admission Form State
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientSearch, setPatientSearch] = useState('');
    const [admissionData, setAdmissionData] = useState({
        diagnosis: '',
        procedure: '',
        admission_date: format(new Date(), 'yyyy-MM-dd'),
        procedure_date: '',
        room_number: '',
        language: inPatientLanguage || 'te',
        total_bill: '',
        consultant_cut: '',
        referred_by: '',
        referral_amount: '',
        emergency_contact: '',
        payment_mode: 'Cash',
        location: 'OrthoLife',
    });

    // Suggestion Navigation State
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const suggestionsListRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isAdmitModalOpen) {
            setAdmissionData(prev => ({ ...prev, location: locationName }));
        }
    }, [isAdmitModalOpen, locationName]);

    // Scroll highlighted item into view
    React.useEffect(() => {
        if (highlightedIndex >= 0 && suggestionsListRef.current) {
            const list = suggestionsListRef.current;
            const element = list.children[highlightedIndex] as HTMLElement;
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // --- Queries ---
    const { data: searchPatients } = useQuery({
        queryKey: ['patients-search', patientSearch],
        queryFn: async () => {
            if (patientSearch.length < 3) return [];
            const { data, error } = await supabase
                .rpc('search_patients_normalized', { search_term: patientSearch })
                .select('id, name, phone, secondary_phone')
                .limit(5);
            if (error) throw error;
            return data;
        },
        enabled: patientSearch.length >= 3
    });

    // --- Queries ---
    const { data: admittedInPatients, isLoading: isLoadingAdmitted } = useQuery({
        queryKey: ['in-patients', 'admitted', consultant?.id, fetchAll],
        queryFn: async () => {
            let query = supabase
                .from('in_patients')
                .select(`
          *,
          patient:patients(name, phone, dob, sex, drive_id),
          consultant:consultants(*),
          surgical_consents(id)
        `)
                .eq('status', 'admitted');

            if (!fetchAll && consultant?.id) {
                query = query.eq('consultant_id', consultant.id);
            }

            const { data, error } = await query.order('admission_date', { ascending: false });

            if (error) throw error;
            return data as InPatient[];
        },
        enabled: !!consultant || isMasterAdmin,
        placeholderData: keepPreviousData
    });

    const { data: dischargedInPatients, isLoading: isLoadingDischarged } = useQuery({
        queryKey: ['in-patients', 'discharged', dischargeDateStart, dischargeDateEnd, paymentFilter, consultant?.id, fetchAll],
        queryFn: async () => {
            let query = supabase
                .from('in_patients')
                .select(`
          *,
          patient:patients(name, phone, dob, sex, drive_id),
          consultant:consultants(*),
          surgical_consents(id)
        `)
                .eq('status', 'discharged');

            if (!fetchAll && consultant?.id) {
                query = query.eq('consultant_id', consultant.id);
            }

            query = query.order('discharge_date', { ascending: false });

            if (dischargeDateStart) {
                query = query.gte('discharge_date', startOfDay(new Date(dischargeDateStart)).toISOString());
            }
            if (dischargeDateEnd) {
                query = query.lte('discharge_date', endOfDay(new Date(dischargeDateEnd)).toISOString());
            }
            if (paymentFilter && paymentFilter !== 'all') {
                query = query.eq('payment_mode', paymentFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as InPatient[];
        },
        placeholderData: keepPreviousData
    });

    const isLoading = isLoadingAdmitted || isLoadingDischarged;

    // --- Mutations ---

    const admitMutation = useMutation({
        mutationFn: async (vars: any) => {
            const { error } = await supabase.from('in_patients').insert([{
                patient_id: vars.patient_id,
                consultant_id: consultant?.id,
                diagnosis: vars.diagnosis,
                procedure: vars.procedure,
                admission_date: new Date(vars.admission_date).toISOString(),
                procedure_date: vars.procedure_date ? new Date(vars.procedure_date).toISOString() : null,
                room_number: vars.room_number || null,
                status: 'admitted',
                language: vars.language || 'en',
                total_bill: vars.total_bill ? Number(vars.total_bill) : 0,
                consultant_cut: vars.consultant_cut ? Number(vars.consultant_cut) : 0,
                referred_by: vars.referred_by || null,
                referral_amount: vars.referral_amount ? Number(vars.referral_amount) : 0,
                emergency_contact: vars.emergency_contact || null,
                payment_mode: vars.payment_mode || 'Cash',
                location: vars.location || 'OrthoLife',
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['in-patients'] });
            setIsAdmitModalOpen(false);
            resetAdmitForm();
            toast({ title: "Success", description: "Patient admitted successfully." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const editMutation = useMutation({
        mutationFn: async (vars: any) => {
            let query = supabase.from('in_patients').update({
                diagnosis: vars.diagnosis,
                procedure: vars.procedure,
                admission_date: new Date(vars.admission_date).toISOString(),
                procedure_date: vars.procedure_date ? new Date(vars.procedure_date).toISOString() : null,
                room_number: vars.room_number || null,
                total_bill: vars.total_bill ? Number(vars.total_bill) : 0,
                consultant_cut: vars.consultant_cut ? Number(vars.consultant_cut) : 0,
                referred_by: vars.referred_by || null,
                referral_amount: vars.referral_amount ? Number(vars.referral_amount) : 0,
                emergency_contact: vars.emergency_contact || null,
                payment_mode: vars.payment_mode || 'Cash',
                language: vars.language || 'en',
                location: vars.location || 'OrthoLife',
            }).eq('id', vars.id);

            if (!isMasterAdmin && consultant?.id) {
                query = query.eq('consultant_id', consultant.id);
            }

            const { error } = await query;
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['in-patients'] });
            setIsEditModalOpen(false);
            setSelectedPatientForEdit(null);
            toast({ title: "Updated", description: "Patient details updated." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const dischargeMutation = useMutation({
        mutationFn: async ({ id, summary, language, dischargeDate, isDraft }: { id: string, summary: DischargeSummary, language: string, dischargeDate?: string, isDraft?: boolean }) => {
            const updateData: any = {
                status: isDraft ? 'admitted' : 'discharged',
                discharge_date: dischargeDate || (isDraft ? null : new Date().toISOString()),
                discharge_summary: summary,
                language: language,
                // Sync main columns with refined data from summary if available
                diagnosis: summary.course_details.diagnosis,
                procedure: summary.course_details.procedure,
                procedure_date: summary.course_details.procedure_date || null
            };

            let query = supabase
                .from('in_patients')
                .update(updateData)
                .eq('id', id);

            if (!isMasterAdmin && consultant?.id) {
                query = query.eq('consultant_id', consultant.id);
            }

            const { error } = await query;
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['in-patients'] });
            setIsDischargeModalOpen(false);
            toast({
                title: variables.isDraft ? "Draft Saved" : "Discharged",
                description: variables.isDraft ? "Discharge summary draft saved successfully." : "Patient discharged successfully."
            });

            // Send notification ONLY if this is NOT a draft AND it's the first time (status changing from admitted -> discharged)
            if (!variables.isDraft && selectedPatientForDischarge && selectedPatientForDischarge.status !== 'discharged') {
                sendDischargeNotification(selectedPatientForDischarge, variables.language);

                // Auto-schedule Google Review Request (Customizable)
                const config = (consultant?.messaging_settings as any)?.auto_discharge_config;
                const isEnabled = config ? config.enabled : (consultant?.messaging_settings as any)?.auto_discharge_review;

                if (consultant?.is_whatsauto_active && selectedPatientForDischarge.patient?.phone && isEnabled) {
                    const delayDays = config?.delay_days ?? 3;
                    const defaultTe = `నమస్కారం ${selectedPatientForDischarge.patient.name} గారు, మీ ఆరోగ్యం కుదుటపడుతోందని ఆశిస్తున్నాము. మీ అనుభవం బాగుంటే, దయచేసి మాకు గూగుల్ రివ్యూ ఇవ్వగలరు. మీ ఫీడ్‌బ్యాక్ మాకు చాలా ముఖ్యం!`;
                    const defaultEn = `Hello ${selectedPatientForDischarge.patient.name}, we hope you are recovering well. If you had a good experience with us, please consider leaving a Google Review. Your feedback is highly appreciated!`;

                    const template = variables.language === 'te'
                        ? (config?.message_te || defaultTe)
                        : (config?.message_en || defaultEn);

                    // Basic placeholder replacement
                    const reviewMessage = template.replace(/\{\{patient_name\}\}/g, selectedPatientForDischarge.patient.name);

                    scheduleService.upsertAutoTask({
                        task_type: 'whatsapp_message',
                        scheduled_for: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString(),
                        payload: {
                            number: selectedPatientForDischarge.patient.phone,
                            message: reviewMessage,
                            consultant_phone: consultant.phone,
                            reference_id: selectedPatientForDischarge.id
                        },
                        source: 'auto_post_discharge_review',
                        consultant_id: consultant.id
                    });
                }
            }
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const sendWhatsAppMutation = useMutation({
        mutationFn: async ({ phone, message, scheduled_at }: { phone: string, message: string, scheduled_at?: string }) => {
            if (!consultant?.is_whatsauto_active) return;

            if (scheduled_at) {
                const { success, error } = await scheduleService.scheduleTask({
                    task_type: 'whatsapp_message',
                    scheduled_for: scheduled_at,
                    payload: {
                        number: phone,
                        message,
                        consultant_phone: consultant.phone
                    },
                    source: 'manual_inpatient_whatsapp',
                    consultant_id: consultant.id
                });
                if (!success) throw new Error("Failed to schedule task");
            } else {
                const { error } = await supabase.functions.invoke('send-whatsapp', {
                    body: { number: phone, message, consultant_phone: consultant.phone },
                });
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            setIsWhatsAppModalOpen(false);
            toast({ title: variables.scheduled_at ? "Scheduled" : "Sent", description: variables.scheduled_at ? "WhatsApp message scheduled." : "WhatsApp message sent." });
            setScheduledDate(undefined);
            setScheduledTime("");
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // 1. Fetch linked consents to find files
            const { data: consents } = await supabase
                .from('surgical_consents')
                .select('patient_signature, selfie_url')
                .eq('in_patient_id', id);

            if (consents && consents.length > 0) {
                const filesToDelete: string[] = [];
                consents.forEach(c => {
                    if (c.patient_signature?.includes('consent-evidence')) {
                        const parts = c.patient_signature.split('consent-evidence/');
                        if (parts[1]) filesToDelete.push(parts[1]);
                    }
                    if (c.selfie_url?.includes('consent-evidence')) {
                        const parts = c.selfie_url.split('consent-evidence/');
                        if (parts[1]) filesToDelete.push(parts[1]);
                    }
                });

                if (filesToDelete.length > 0) {
                    const { error: storageError } = await supabase.storage.from('consent-evidence').remove(filesToDelete);
                    if (storageError) {
                        console.error("Error deleting storage files:", storageError);
                        throw new Error(`Failed to delete storage evidence: ${storageError.message}`);
                    }
                }
            }

            let deleteQuery = supabase.from('in_patients').delete().eq('id', id);

            if (!isMasterAdmin && consultant?.id) {
                deleteQuery = deleteQuery.eq('consultant_id', consultant.id);
            }

            const { error } = await deleteQuery;
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['in-patients'] });
            toast({ title: "Deleted", description: "Patient record deleted successfully." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    // --- Helpers ---

    const resetAdmitForm = () => {
        setSelectedPatientId(null);
        setPatientSearch('');
        setHighlightedIndex(-1);
        setAdmissionData({
            diagnosis: '',
            procedure: '',
            admission_date: format(new Date(), 'yyyy-MM-dd'),
            procedure_date: '',
            room_number: '',
            language: inPatientLanguage || 'te',
            total_bill: '',
            consultant_cut: '',
            referred_by: '',
            referral_amount: '',
            emergency_contact: '',
            payment_mode: 'Cash',
            location: 'OrthoLife',
        });
    };

    const handleSelectPatient = async (p: any) => {
        setSelectedPatientId(p.id);
        setPatientSearch(p.name);
        setHighlightedIndex(-1);

        // Fetch latest consultation data for this patient
        try {
            const { data: consultations } = await supabase
                .from('consultations')
                .select('consultation_data')
                .eq('patient_id', p.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (consultations && consultations.length > 0 && consultations[0].consultation_data) {
                const data = consultations[0].consultation_data;
                const latestAdvice = data.advice || '';
                const diagnosis = data.diagnosis || '';

                const cleanAdvice = latestAdvice
                    .split('\n')
                    .filter((line: string) => !line.toLowerCase().includes('guide'))
                    .join('\n')
                    .trim();

                setAdmissionData(prev => ({
                    ...prev,
                    procedure: cleanAdvice || prev.procedure,
                    diagnosis: diagnosis || prev.diagnosis,
                    emergency_contact: p.secondary_phone || prev.emergency_contact
                }));
            }
        } catch (err) {
            console.error("Error fetching patient advice:", err);
        }
    };

    const sendDischargeNotification = async (patient: InPatient, language: string) => {
        const isTelugu = language === 'te';
        const link = `https://ortho.life/d/${encodeURIComponent(patient.patient.phone)}`;

        const message = isTelugu
            ? `🙏 నమస్కారం ${patient.patient.name} గారు,\nమీ డిశ్చార్జ్ ప్రక్రియ ప్రారంభమైంది. మీ డిశ్చార్జ్ సారాంశాన్ని ఇక్కడ డౌన్‌లోడ్ చేసుకోవచ్చు:\n\n${link}`
            : `Dear ${patient.patient.name},\nYour discharge process has started. You can view/download your discharge summary here:\n\n${link}`;

        try {
            if (!consultant?.is_whatsauto_active) return;
            await supabase.functions.invoke('send-whatsapp', {
                body: { number: patient.patient.phone, message, consultant_phone: consultant?.phone },
            });
            console.log("Discharge Notification Sent");
        } catch (error) {
            console.error("Failed to send discharge notification", error);
            toast({ variant: "destructive", title: "Notification Failed", description: "Could not send WhatsApp message." });
        }
    };

    const handleGuideChange = (guideId: string) => {
        if (!selectedPatientForWhatsApp) return;
        const guide = availableGuides.find(g => String(g.id) === guideId);
        if (!guide) return;

        setSelectedGuideId(guideId);

        const isTelugu = selectedPatientForWhatsApp.language === 'te';
        const langPrefix = isTelugu ? '/te' : '';
        const newLink = `https://ortho.life${langPrefix}/guides/${guide.id}`;

        let guideTitle = guide.title;
        if (isTelugu && guide.guide_translations) {
            const translation = guide.guide_translations.find((t: any) => t.language === 'te');
            if (translation) guideTitle = translation.title;
        }
        setMatchedGuideTitle(guideTitle);

        let newMessage = whatsAppMessage;

        if (currentGuideLink && newMessage.includes(currentGuideLink)) {
            // Replace existing link
            newMessage = newMessage.replace(currentGuideLink, newLink);
        } else {
            // Append if no link was present
            if (isTelugu) {
                const insertText = ` మీ కోసం ప్రత్యేకంగా రూపొందించిన వ్యాయామాల గైడ్ ఇక్కడ ఉంది 🧘‍♂️:\n${newLink}\n\n`;
                // Try to insert before signature
                if (newMessage.includes('శుభాకాంక్షలు')) {
                    newMessage = newMessage.replace('శుభాకాంక్షలు', `${insertText}శుభాకాంక్షలు`);
                } else {
                    newMessage += insertText;
                }
            } else {
                const insertText = ` Here is a customised guide for your rehabilitation journey 🧘‍♂️:\n${newLink}\n\n`;
                if (newMessage.includes('Best regards')) {
                    newMessage = newMessage.replace('Best regards', `${insertText}Best regards`);
                } else {
                    newMessage += insertText;
                }
            }
        }

        setCurrentGuideLink(newLink);
        setWhatsAppMessage(newMessage);
    };

    const initWhatsApp = async (patient: InPatient, type: 'pre-op' | 'post-op' | 'rehab' | 'general') => {
        setSelectedPatientForWhatsApp(patient);
        setWhatsAppPhone(patient.patient.phone || '');
        setWhatsAppType(type);
        setMatchedGuideTitle(null); // Reset
        setAvailableGuides([]);
        setSelectedGuideId(null);
        setCurrentGuideLink(null);

        const patientName = patient.patient.name;
        // Identify language: prioritize explicit language preference, default to logic if missing
        // For admitted patients, we should have saved 'language'. If not, default to English.
        const isTelugu = (patient.language === 'te');

        let message = '';

        if (type === 'pre-op') {
            if (isTelugu) {
                message = `🙏 నమస్కారం ${patientName} గారు,\nరేపు మీ ${patient.procedure} శస్త్రచికిత్స జరగనుంది. \nదయచేసి ఈ రోజు అర్ధరాత్రి నుండి ఉపవాసం ఉండండి - ఎటువంటి ఆహారం లేదా నీరు తీసుకోవద్దు 🚫🍽️.\n\nశస్త్రచికిత్సకు ముందు తెలుసుకోవలసిన విషయాలు ఇక్కడ చూడండి:\nhttps://ortho.life/te/guides/15\n\nశుభాకాంక్షలు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి.`;
            } else {
                message = `🙏 Hello ${patientName},\nThis is an update regarding your scheduled procedure: ${patient.procedure}.\nPlease ensure you are fasting from midnight - No food or water 🚫🍽️.\n\nHere is an article outlining common before-surgery concerns:\nhttps://ortho.life/guides/15\n\nBest regards,\nDr Samuel Manoj Cherukuri.`;
            }
        } else if (type === 'post-op') {
            if (isTelugu) {
                message = `🙏 నమస్కారం ${patientName} గారు,\nశస్త్రచికిత్స తర్వాత మీరు త్వరగా కోలుకుంటున్నారని ఆశిస్తున్నాము. మీకు ఏవైనా సందేహాలు ఉంటే, ఈ నంబర్‌ను సంప్రదించండి 📞.\n\nశస్త్రచికిత్స తర్వాత తీసుకోవలసిన ఆహరం కోసం:\nhttps://ortho.life/te/guides/10\n\nశుభాకాంక్షలు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి.`;
            } else {
                message = `🙏 Hello ${patientName},\nHope you are recovering well after your procedure. If you have any concerns, you can contact this number directly 📞.\n\nHere is our after-surgery diet recommendation:\nhttps://ortho.life/guides/10\n\nBest regards,\nDr Samuel Manoj Cherukuri.`;
            }
        } else if (type === 'rehab') {
            // Lazy load guides and match
            let guideLink = '';
            let guideTitle = '';

            try {
                const { data: guidesData } = await supabase
                    .from('guides')
                    .select('id, title, description, categories(name), guide_translations(language, title, description)');

                if (guidesData) {
                    setAvailableGuides(guidesData); // Save for dropdown

                    const searchText = `${patient.diagnosis} guide ${patient.procedure} guide`;
                    const matches = getMatchingGuides(searchText, guidesData as any[], patient.language || 'en');

                    // Filter for matches that actually have a guide
                    const bestMatch = matches.find(m => m.guide && m.guideLink);

                    if (bestMatch) {
                        guideLink = bestMatch.guideLink || '';
                        guideTitle = bestMatch.guide?.title || '';

                        // Try to get translated title if available
                        if (isTelugu && bestMatch.guide?.guide_translations) {
                            const translation = bestMatch.guide.guide_translations.find((t: any) => t.language === 'te');
                            if (translation) guideTitle = translation.title;
                        }

                        setMatchedGuideTitle(guideTitle);
                        setSelectedGuideId(String(bestMatch.guide.id));
                        setCurrentGuideLink(guideLink);
                    }
                }
            } catch (error) {
                console.error("Error fetching guides", error);
            }

            if (isTelugu) {
                message = `🙏 నమస్కారం ${patientName} గారు,\nమీరు త్వరగా కోలుకుంటున్నారని ఆశిస్తున్నాము.`;
                if (guideLink) {
                    message += ` మీ కోసం ప్రత్యేకంగా రూపొందించిన వ్యాయామాల గైడ్ ఇక్కడ ఉంది 🧘‍♂️:\n${guideLink}\n\n`;
                } else {
                    message += `\n\n`;
                }
                message += `శుభాకాంక్షలు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి.`;
            } else {
                message = `🙏 Hello ${patientName},\nHope you are recovering well.`;
                if (guideLink) {
                    message += ` Here is a customised guide for your rehabilitation journey 🧘‍♂️:\n${guideLink}\n\n`;
                } else {
                    message += `\n\n`;
                }
                message += `Best regards,\nDr Samuel Manoj Cherukuri.`;
            }
        } else {
            // General Update
            if (isTelugu) {
                message = `నమస్కారం ${patientName} గారు:\nమీ ఆరోగ్య పరిస్థితి స్థిరంగా ఉంది 👍.\nవ్యాధి నిర్ధారణ: ${patient.diagnosis}.\nతదుపరి ప్రణాళికను మీకు తెలియజేస్తాము.\n\nశుభాకాంక్షలు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరి.`;
            } else {
                message = `Update for ${patientName}:\nYour current clinical status is stable 👍.\nDiagnosis: ${patient.diagnosis}.\nWe will keep you updated on the further plan.\n\nBest regards,\nDr Samuel Manoj Cherukuri.`;
            }
        }

        setWhatsAppMessage(message);
        setIsWhatsAppModalOpen(true);
    };

    const openEditModal = (patient: InPatient) => {
        updateLocalLanguage(patient.language || inPatientLanguage || 'en');
        setAdmissionData({
            diagnosis: patient.diagnosis || '',
            procedure: patient.procedure || '',
            admission_date: patient.admission_date ? format(new Date(patient.admission_date), 'yyyy-MM-dd') : '',
            procedure_date: patient.procedure_date ? format(new Date(patient.procedure_date), 'yyyy-MM-dd') : '',
            room_number: patient.room_number || '',
            language: patient.language || 'en',
            total_bill: patient.total_bill?.toString() || '',
            consultant_cut: patient.consultant_cut?.toString() || '',
            referred_by: patient.referred_by || '',
            referral_amount: patient.referral_amount?.toString() || '',
            emergency_contact: patient.emergency_contact || '',
            payment_mode: patient.payment_mode || 'Cash',
            location: patient.location || 'OrthoLife',
        });
        setSelectedPatientForEdit(patient);
        setIsEditModalOpen(true);
    };

    const openDischargeModal = (patient: InPatient) => {
        // Localize language: do NOT change global i18n
        const lang = patient.language || inPatientLanguage || 'en';
        updateLocalLanguage(lang);
        setSelectedPatientForDischarge(patient);
        setIsDischargeModalOpen(true);
    };

    const openConsentModal = (patient: InPatient) => {
        setSelectedPatientForConsent(patient);
        setIsConsentModalOpen(true);
    };

    const handleDeletePatient = async (patient: InPatient) => {
        if (window.confirm(`Are you sure you want to delete ${patient.patient.name}? This action cannot be undone.`)) {
            deleteMutation.mutate(patient.id);
        }
    };

    const admittedPatients = useMemo(() => {
        if (!admittedInPatients) return [];
        if (!searchTerm) return admittedInPatients;
        return admittedInPatients.filter(p =>
            p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.patient.phone.includes(searchTerm) ||
            (p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [admittedInPatients, searchTerm]);

    const filteredDischargedPatients = useMemo(() => {
        if (!dischargedInPatients) return [];
        if (!searchTerm) return dischargedInPatients;
        return dischargedInPatients.filter(p =>
            p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.patient.phone.includes(searchTerm) ||
            (p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [dischargedInPatients, searchTerm]);

    const dischargedPatients = filteredDischargedPatients;

    const handleExport = (exportFormat: 'excel' | 'text') => {
        if (!filteredDischargedPatients.length) {
            toast({ title: "No Data", description: "No records to export.", variant: "destructive" });
            return;
        }

        const headers = ["Patient Name", "Admission Date", "Discharge Date", "Diagnosis", "Procedure", "Insurance Type"];

        // Helper to escape CSV fields
        const escapeCsv = (str: string | null | undefined) => {
            if (!str) return '';
            const stringValue = String(str);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        // Helper for Text (Tab separated)
        const checkTxt = (str: string | null | undefined) => {
            if (!str) return '';
            return String(str).replace(/\t/g, ' ').replace(/\n/g, ' '); // Remove tabs/newlines to avoid breaking format
        }

        const rows = filteredDischargedPatients.map(p => {
            const name = p.patient?.name || 'Unknown';
            const adminDate = p.admission_date ? format(new Date(p.admission_date), 'dd/MM/yyyy') : '-';
            const dischDate = p.discharge_date ? format(new Date(p.discharge_date), 'dd/MM/yyyy') : '-';
            const diag = p.diagnosis || '-';
            const proc = p.procedure || '-';
            const ins = p.payment_mode || 'Cash';

            if (exportFormat === 'excel') {
                return [
                    escapeCsv(name),
                    escapeCsv(adminDate),
                    escapeCsv(dischDate),
                    escapeCsv(diag),
                    escapeCsv(proc),
                    escapeCsv(ins)
                ].join(',');
            } else {
                return [
                    checkTxt(name),
                    checkTxt(adminDate),
                    checkTxt(dischDate),
                    checkTxt(diag),
                    checkTxt(proc),
                    checkTxt(ins)
                ].join('\t');
            }
        });

        let content = '';
        let filename = `discharge_data_${exportFormat === 'excel' ? 'xls' : 'txt'}_${format(new Date(), 'yyyy-MM-dd')}`;
        let mimeType = '';

        if (exportFormat === 'excel') {
            // Add BOM for Excel UTF-8 compatibility
            const bom = '\uFEFF';
            content = bom + headers.join(',') + '\n' + rows.join('\n');
            filename += '.csv';
            mimeType = 'text/csv;charset=utf-8;';
        } else {
            content = headers.join('\t') + '\n' + rows.join('\n');
            filename += '.txt';
            mimeType = 'text/plain;charset=utf-8;';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Early returns moved after hook declarations to follow Rules of Hooks
    if (isConsultantLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse text-sm">Validating session...</p>
            </div>
        );
    }

    if (!consultant) {
        return (
            <DoctorLoginGate
                onLogin={(phone, name) => {
                    localStorage.setItem('consultant_phone', phone);
                    localStorage.setItem('consultant_name', name);
                    window.location.reload();
                }}
            />
        );
    }

    // Only show full page loader if we have NO data at all on first entry
    const isFirstEverLoad = !admittedInPatients && !dischargedInPatients && (isLoadingAdmitted || isLoadingDischarged);

    if (isFirstEverLoad) {
        return (
            <div className="flex items-center justify-center p-12 h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Initializing IP Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                <div className="w-full">
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
                        <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                        IP Management
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage patient admissions and procedures.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                    <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                        {isMasterAdmin && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 border rounded-lg flex-none h-10">
                                <Label htmlFor="global-fetch-all" className="text-[10px] font-bold uppercase tracking-tight text-primary/70 whitespace-nowrap">Show All</Label>
                                <Switch
                                    id="global-fetch-all"
                                    checked={fetchAll}
                                    onCheckedChange={setFetchAll}
                                    className="scale-75 data-[state=checked]:bg-primary"
                                />
                            </div>
                        )}
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search patients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 w-full"
                            />
                        </div>

                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center sm:justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
                                    <Settings2 size={16} />
                                    Settings
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64 p-2" align="end">
                                <div className="p-2 space-y-4">
                                    {/* Messaging Settings */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-4 w-4 text-primary" />
                                            <span className="font-bold text-sm">Messaging Settings</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-md">
                                            <div className="flex flex-col">
                                                <Label htmlFor="auto-discharge-toggle" className="text-xs font-semibold">Auto-Discharge Review</Label>
                                                <span className="text-[9px] text-muted-foreground uppercase">3-day review request</span>
                                            </div>
                                            <Switch
                                                id="auto-discharge-toggle"
                                                checked={(consultant?.messaging_settings as any)?.auto_discharge_review ?? false}
                                                onCheckedChange={async (enabled) => {
                                                    if (!consultant) return;
                                                    const currentSettings = (consultant.messaging_settings || {}) as any;
                                                    const newSettings = {
                                                        ...currentSettings,
                                                        auto_discharge_review: enabled,
                                                        auto_discharge_config: {
                                                            ...(currentSettings.auto_discharge_config || {}),
                                                            enabled: enabled
                                                        }
                                                    };
                                                    const { error } = await supabase
                                                        .from('consultants')
                                                        .update({ messaging_settings: newSettings })
                                                        .eq('id', consultant.id);

                                                    if (!error) {
                                                        await refreshConsultant();
                                                        toast({ title: enabled ? "Enabled" : "Disabled", description: "Auto-discharge review reminders updated." });
                                                    }
                                                }}
                                                className="scale-75"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-[10px] h-7 text-primary hover:text-primary hover:bg-primary/5 border border-primary/20 border-dashed"
                                            onClick={() => setIsMessagingSettingsModalOpen(true)}
                                        >
                                            Customize Timing & Messages
                                        </Button>
                                    </div>

                                    <DropdownMenuSeparator />

                                    {/* Language Selection */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Languages className="h-4 w-4 text-primary" />
                                            <span className="font-bold text-sm">Default Language</span>
                                        </div>
                                        <div className="flex bg-muted/40 p-1 rounded-lg border h-9 items-center w-full">
                                            {[
                                                { code: 'en', label: 'English' },
                                                { code: 'te', label: 'తెలుగు' }
                                            ].map((lang) => (
                                                <Button
                                                    key={lang.code}
                                                    variant={inPatientLanguage === lang.code ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => updateLocalLanguage(lang.code)}
                                                    className={cn(
                                                        "flex-1 h-7 text-[10px] font-bold transition-all duration-200",
                                                        inPatientLanguage === lang.code ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-primary"
                                                    )}
                                                >
                                                    {lang.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {(isMasterAdmin) && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <div className="space-y-1">
                                                <DropdownMenuItem asChild>
                                                    <Link to="/consents" className="flex items-center w-full cursor-pointer">
                                                        <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                                        <span className="text-sm">Consents Management</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link to="/ot-notes" className="flex items-center w-full cursor-pointer">
                                                        <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                                                        <span className="text-sm">OT Notes Registry</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setIsPrintSettingsModalOpen(true)} className="cursor-pointer">
                                                    <Settings2 className="w-4 h-4 mr-2 text-muted-foreground" />
                                                    <span className="text-sm">Print Customization</span>
                                                </DropdownMenuItem>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => setIsAdmitModalOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Admit
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:max-w-md mb-6">
                    <TabsTrigger value="admitted" className="flex items-center gap-2 h-10">
                        <CheckCircle2 className="w-4 h-4" />
                        Admitted ({admittedInPatients?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="discharged" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Discharged ({dischargedInPatients?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="admitted">
                    {isLoadingAdmitted ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {admittedPatients.length > 0 ? admittedPatients.map(p => (
                                <InPatientCard
                                    key={p.id}
                                    patient={p}
                                    onSendWhatsApp={initWhatsApp}
                                    onEdit={() => openEditModal(p)}
                                    onDischarge={() => openDischargeModal(p)}
                                    onConsents={() => openConsentModal(p)}
                                    onDelete={() => handleDeletePatient(p)}
                                />
                            )) : (
                                <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                    <h3 className="text-xl font-medium text-muted-foreground">No patients currently admitted</h3>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="discharged">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-muted/40 rounded-lg border">
                        <div className="space-y-1.5 h-full flex flex-col justify-end">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">From Date</Label>
                            <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-background h-10",
                                            !dischargeDateStart && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {dischargeDateStart ? format(new Date(dischargeDateStart), "dd MMM yyyy") : <span>Pick date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                        mode="single"
                                        selected={dischargeDateStart ? new Date(dischargeDateStart) : undefined}
                                        onSelect={(date) => {
                                            setDischargeDateStart(date ? format(date, "yyyy-MM-dd") : "");
                                            setIsStartDatePickerOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-1.5 h-full flex flex-col justify-end">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">To Date</Label>
                            <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-background h-10",
                                            !dischargeDateEnd && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {dischargeDateEnd ? format(new Date(dischargeDateEnd), "dd MMM yyyy") : <span>Pick date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                        mode="single"
                                        selected={dischargeDateEnd ? new Date(dischargeDateEnd) : undefined}
                                        onSelect={(date) => {
                                            setDischargeDateEnd(date ? format(date, "yyyy-MM-dd") : "");
                                            setIsEndDatePickerOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-1.5 h-full flex flex-col justify-end">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Payment Mode</Label>
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger className="bg-background h-10">
                                    <SelectValue placeholder="Filter by Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Modes</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                                    <SelectItem value="Govt Insurance">Govt Insurance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="h-full flex flex-col justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setDischargeDateStart(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                                    setDischargeDateEnd(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                                    setPaymentFilter('all');
                                }}
                                className="w-full h-10"
                            >
                                Reset Filters
                            </Button>
                        </div>
                        <div className="h-full flex flex-col justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full h-10 gap-2">
                                        <Download className="w-4 h-4" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                                        Export as Excel (CSV)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('text')}>
                                        Export as Text (Tab Separated)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                        {isLoadingDischarged && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        )}
                        {filteredDischargedPatients.length > 0 ? filteredDischargedPatients.map(p => (
                            <InPatientCard
                                key={p.id}
                                patient={p}
                                onSendWhatsApp={initWhatsApp}
                                onEdit={() => openEditModal(p)}
                                onViewSummary={() => openDischargeModal(p)}
                                onPrint={() => p.discharge_summary && triggerPrint({
                                    ...p.discharge_summary,
                                    language: p.language || 'en',
                                    patient_snapshot: {
                                        ...p.discharge_summary.patient_snapshot,
                                        location: p.location || 'OrthoLife'
                                    }
                                }, (p as any).consultant, p.discharge_date || undefined)}
                                onConsents={(p.surgical_consents && p.surgical_consents.length > 0) ? () => openConsentModal(p) : undefined}
                            />
                        )) : (
                            <EmptyState icon={History} message="No discharge history found for the selected period" />
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- MODALS --- */}

            {/* 1. Admission Modal */}
            <Dialog open={isAdmitModalOpen} onOpenChange={setIsAdmitModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-start justify-between text-left pr-10">
                        <div className="space-y-1">
                            <DialogTitle>New Patient Admission</DialogTitle>
                            <DialogDescription>Search for a patient and enter admission details.</DialogDescription>
                        </div>
                        <div className="flex bg-muted rounded-md p-1 shrink-0 mt-0 ml-2">
                            {[
                                { code: 'en', label: 'EN' },
                                { code: 'te', label: 'తె' }
                            ].map(({ code, label }) => (
                                <Button
                                    key={code}
                                    size="sm"
                                    variant={inPatientLanguage === code ? "default" : "ghost"}
                                    className="h-6 px-2 text-xs"
                                    onClick={() => updateLocalLanguage(code)}
                                    type="button"
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </DialogHeader>
                    <div className="py-2 flex flex-col lg:grid lg:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Search Patient (Name/Phone)</Label>
                            <Input
                                placeholder="Type at least 3 chars..."
                                value={patientSearch}
                                onChange={(e) => {
                                    setPatientSearch(e.target.value);
                                    setSelectedPatientId(null);
                                    setHighlightedIndex(-1);
                                }}
                                onKeyDown={async (e) => {
                                    if (!searchPatients || searchPatients.length === 0) return;

                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setHighlightedIndex(prev => (prev < searchPatients.length - 1 ? prev + 1 : prev));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (highlightedIndex >= 0 && searchPatients[highlightedIndex]) {
                                            handleSelectPatient(searchPatients[highlightedIndex]);
                                        }
                                    }
                                }}
                            />
                            {searchPatients && searchPatients.length > 0 && !selectedPatientId && (
                                <div ref={suggestionsListRef} className="border rounded-md mt-1 divide-y max-h-32 overflow-y-auto">
                                    {searchPatients.map((p, index) => (
                                        <div
                                            key={p.id}
                                            className={cn(
                                                "p-2 cursor-pointer transition-colors flex justify-between items-center",
                                                (selectedPatientId === p.id || index === highlightedIndex) && "bg-primary/10 border-l-4 border-primary",
                                                index === highlightedIndex && "bg-accent"
                                            )}
                                            onClick={() => handleSelectPatient(p)}
                                        >
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-xs text-muted-foreground">{p.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Admission Date</Label>
                            <Popover open={isAdmissionDatePickerOpen} onOpenChange={setIsAdmissionDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !admissionData.admission_date && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {admissionData.admission_date ? format(new Date(admissionData.admission_date), "dd MMM yyyy") : <span>Pick date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                        mode="single"
                                        selected={admissionData.admission_date ? new Date(admissionData.admission_date) : undefined}
                                        onSelect={(date) => {
                                            setAdmissionData({ ...admissionData, admission_date: date ? format(date, "yyyy-MM-dd") : "" });
                                            setIsAdmissionDatePickerOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Room / Bed Number (Optional)</Label>
                            <Input
                                placeholder="e.g. 101-A"
                                value={admissionData.room_number}
                                onChange={(e) => setAdmissionData({ ...admissionData, room_number: e.target.value })}
                            />
                        </div>


                        <div className="space-y-2 col-span-1 lg:col-span-2">
                            <Label>Diagnosis</Label>
                            <Input
                                ref={admissionDiagnosisRef}
                                placeholder="Clinical diagnosis..."
                                value={admissionData.diagnosis}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const cursor = e.target.selectionStart;
                                    const result = autofillProcessor(val, cursor || val.length, { enableDurationShortcuts: true, language: 'en', variant: 'default' });
                                    setAdmissionData({ ...admissionData, diagnosis: result ? result.newValue : val });
                                    if (result) {
                                        setTimeout(() => {
                                            admissionDiagnosisRef.current?.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                                        }, 0);
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-2 col-span-1 lg:col-span-2">
                            <Label>Procedure Plan</Label>
                            <Textarea
                                ref={admissionProcedureRef}
                                placeholder="Procedure details..."
                                value={admissionData.procedure}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const cursor = e.target.selectionStart;
                                    const result = autofillProcessor(val, cursor || val.length, { enableDurationShortcuts: true, language: 'en', variant: 'default' });
                                    setAdmissionData({ ...admissionData, procedure: result ? result.newValue : val });
                                    if (result) {
                                        setTimeout(() => {
                                            admissionProcedureRef.current?.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                                        }, 0);
                                    }
                                }}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Procedure Date (Optional)</Label>
                            <Popover open={isProcedureDatePickerOpen} onOpenChange={setIsProcedureDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !admissionData.procedure_date && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {admissionData.procedure_date ? format(new Date(admissionData.procedure_date), "dd MMM yyyy") : <span>Pick date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                        mode="single"
                                        selected={admissionData.procedure_date ? new Date(admissionData.procedure_date) : undefined}
                                        onSelect={(date) => {
                                            setAdmissionData({ ...admissionData, procedure_date: date ? format(date, "yyyy-MM-dd") : "" });
                                            setIsProcedureDatePickerOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select
                                value={admissionData.payment_mode || 'Cash'}
                                onValueChange={(value) => setAdmissionData({ ...admissionData, payment_mode: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                                    <SelectItem value="Govt Insurance">Govt Insurance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Hospital Location</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={toggleGps}
                                    title={isGpsEnabled ? "GPS Auto-detect ON" : "GPS Auto-detect OFF"}
                                >
                                    <MapPin className={cn("h-3.5 w-3.5", isGpsEnabled ? "text-blue-500 fill-blue-200" : "text-muted-foreground")} />
                                </Button>
                            </div>
                            <Select
                                value={admissionData.location || 'OrthoLife'}
                                onValueChange={(value) => {
                                    handleManualLocationChange(value);
                                    setAdmissionData({ ...admissionData, location: value });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hospitals.map(h => (
                                        <SelectItem key={h.name} value={h.name}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Approx Total Bill (₹)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={admissionData.total_bill}
                                onChange={(e) => setAdmissionData({ ...admissionData, total_bill: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Consultant Cut (₹)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={admissionData.consultant_cut}
                                onChange={(e) => setAdmissionData({ ...admissionData, consultant_cut: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Referred By</Label>
                                <Input
                                    placeholder="Name"
                                    value={admissionData.referred_by}
                                    onChange={(e) => setAdmissionData({ ...admissionData, referred_by: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Referral Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={admissionData.referral_amount}
                                    onChange={(e) => setAdmissionData({ ...admissionData, referral_amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 col-span-1 lg:col-span-2">
                            <Label>Emergency Contact</Label>
                            <Input
                                placeholder="Name / Phone"
                                value={admissionData.emergency_contact}
                                onChange={(e) => setAdmissionData({ ...admissionData, emergency_contact: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdmitModalOpen(false)}>Cancel</Button>
                        <Button
                            disabled={!selectedPatientId || admitMutation.isPending}
                            onClick={() => admitMutation.mutate({ ...admissionData, patient_id: selectedPatientId })}
                        >
                            {admitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Admit Patient
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 2. Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <EditPatientForm
                        patient={selectedPatientForEdit}
                        onSubmit={(data: any) => editMutation.mutate({ ...data, id: selectedPatientForEdit?.id })}
                        onLanguageChange={updateLocalLanguage}
                        isSaving={editMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                        processFieldChange={autofillProcessor}
                    />
                </DialogContent>
            </Dialog>

            {/* 3. Discharge Modal */}
            <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0">
                    <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b">
                        <div className="space-y-1">
                            <DialogTitle>Discharge Process</DialogTitle>
                            <DialogDescription>Review and complete discharge summary.</DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 mr-10">
                            {/* Local Language Switcher */}
                            <div className="flex items-center gap-1">
                                <div className="flex bg-muted rounded-md p-1">
                                    {[
                                        { code: 'en', label: 'EN' },
                                        { code: 'te', label: 'తె' }
                                    ].map(({ code, label }) => (
                                        <Button
                                            key={code}
                                            size="sm"
                                            variant={inPatientLanguage === code ? "default" : "ghost"}
                                            className="h-6 px-2 text-xs"
                                            onClick={() => updateLocalLanguage(code)}
                                            type="button"
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => dischargeFormRef.current?.print()}
                            >
                                <Printer className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    {selectedPatientForDischarge && (
                        <DischargeForm
                            ref={dischargeFormRef}
                            patient={selectedPatientForDischarge}
                            currentLanguage={inPatientLanguage}
                            onSubmit={(summary, date, isDraft) => {
                                // Use the date selected in the form
                                let isoDate = date;
                                if (date && !date.includes('T')) {
                                    // Append time if it's just YYYY-MM-DD
                                    isoDate = new Date(date).toISOString();
                                }

                                dischargeMutation.mutate({
                                    id: selectedPatientForDischarge.id,
                                    summary: pruneEmptyFields(summary),
                                    language: inPatientLanguage,
                                    dischargeDate: isoDate,
                                    isDraft: isDraft
                                });
                            }}
                            isSaving={dischargeMutation.isPending}
                            onPrint={(summary: DischargeSummary, date: string) => {
                                triggerPrint(summary, (selectedPatientForDischarge as any)?.consultant, date);
                            }}
                            consultant={consultant}
                            selectedHospital={getHospitalByName(selectedPatientForDischarge.location)}
                            processFieldChange={autofillProcessor}
                            autofillKeywords={autofillKeywords}
                            savedMedications={savedMedications}
                            fetchSavedMedications={fetchSavedMedications}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {consultant && (
                <PrintSettingsModal
                    isOpen={isPrintSettingsModalOpen}
                    onClose={() => setIsPrintSettingsModalOpen(false)}
                    isDoctorProfileEnabled={localProfileEnabled}
                    isSignSealEnabled={localSignSealEnabled}
                    printOptions={localPrintOptions}
                    onToggleProfile={() => { }}
                    onToggleSignSeal={() => { }}
                    onUpdatePrintOptions={() => { }}
                    onSaveAll={handleSavePrintSettings}
                    currentLocation={settingsLocation}
                    mode="ip"
                    hospitals={hospitals}
                    onLocationChange={(newLoc) => setSettingsLocation(newLoc)}
                />
            )}

            {/* Hidden Print Component */}
            <div style={{ display: 'none' }}>
                {printData && (
                    <DischargeSummaryPrint
                        ref={printRef}
                        patientSnapshot={printData.patient_snapshot}
                        courseDetails={printData.course_details}
                        dischargeData={printData.discharge_data}
                        language={printData?.language || inPatientLanguage}
                        logoUrl={getHospitalByName(printData.patient_snapshot.location || 'OrthoLife')?.logoUrl || (printConsultant && consultant && printConsultant.id === consultant.id ? consultant.logo_url : (printConsultant?.logo_url || consultant?.logo_url || "/images/logos/logo.png"))}
                        dischargeDate={printDate}
                        consultant={(printConsultant && consultant && printConsultant.id === consultant.id) ? consultant : (printConsultant || consultant)}
                        showSignSeal={(() => {
                            const activeConsultant = (printConsultant && consultant && printConsultant.id === consultant.id) ? consultant : (printConsultant || consultant);
                            const location = (printData.patient_snapshot as any).location || 'OrthoLife';
                            return activeConsultant?.messaging_settings?.location_print_overrides?.[location]?.show_sign_seal ?? true;
                        })()}
                        printOptions={(() => {
                            const activeConsultant = (printConsultant && consultant && printConsultant.id === consultant.id) ? consultant : (printConsultant || consultant);
                            if (!activeConsultant) return undefined;
                            const settings = activeConsultant.messaging_settings as any;
                            const location = (printData.patient_snapshot as any).location || 'OrthoLife';
                            return settings?.location_print_options?.[location] || settings?.location_print_options?.['OrthoLife'];
                        })()}
                    />
                )}
            </div>

            {/* 4. WhatsApp Modal */}
            <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Send WhatsApp Message</DialogTitle>
                        <DialogDescription>Review and edit the message before sending.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="mb-4 space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                value={whatsAppPhone}
                                onChange={(e) => setWhatsAppPhone(e.target.value)}
                                placeholder="Enter phone number..."
                            />
                        </div>
                        {whatsAppType === 'rehab' && availableGuides.length > 0 && (
                            <div className="mb-4 space-y-2">
                                <Label>Attached Rehabilitation Guide</Label>
                                <Select
                                    value={selectedGuideId || ''}
                                    onValueChange={handleGuideChange}
                                >
                                    <SelectTrigger className="w-full bg-green-50 border-green-200 text-green-800">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <BookOpen className="w-4 h-4 shrink-0 text-green-600" />
                                            <SelectValue placeholder="Select a guide to attach..." />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {availableGuides.map((guide) => (
                                            <SelectItem key={guide.id} value={String(guide.id)}>
                                                {guide.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Label className="mb-2 block">Message Preview</Label>
                        <Textarea
                            value={whatsAppMessage}
                            onChange={(e) => setWhatsAppMessage(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <DialogFooter className="flex gap-2 justify-end sm:justify-end">
                        <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>Cancel</Button>
                        <SchedulePopover
                            scheduledDate={scheduledDate}
                            scheduledTime={scheduledTime}
                            onDateChange={setScheduledDate}
                            onTimeChange={setScheduledTime}
                            disabled={sendWhatsAppMutation.isPending}
                        />
                        <Button
                            onClick={() => {
                                if (selectedPatientForWhatsApp) {
                                    const scheduledDateTime = scheduledDate ? getLocalDateTime(scheduledDate, scheduledTime) : undefined;
                                    if (scheduledDate && !scheduledDateTime) {
                                        toast({ variant: "destructive", title: "Error", description: "Invalid schedule time." });
                                        return;
                                    }
                                    if (scheduledDateTime && scheduledDateTime <= new Date()) {
                                        toast({ variant: "destructive", title: "Error", description: "Scheduled time must be in the future." });
                                        return;
                                    }
                                    sendWhatsAppMutation.mutate({
                                        phone: whatsAppPhone,
                                        message: whatsAppMessage,
                                        scheduled_at: scheduledDateTime?.toISOString()
                                    });
                                }
                            }}
                            disabled={sendWhatsAppMutation.isPending}
                        >
                            {sendWhatsAppMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Send className="w-4 h-4 mr-2" />
                            {scheduledDate ? "Schedule Message" : "Send Message"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Consent Form Modal */}
            <ConsentManagementModal
                isOpen={isConsentModalOpen}
                onClose={() => {
                    setIsConsentModalOpen(false);
                    setSelectedPatientForConsent(null);
                }}
                patient={selectedPatientForConsent}
            />

            {/* Consent Templates Bank is now a separate page */}

            <MessagingSettingsModal
                isOpen={isMessagingSettingsModalOpen}
                onClose={() => setIsMessagingSettingsModalOpen(false)}
                initialTab="discharge"
            />
        </div>
    );
};

// --- Sub-Components ---

const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="col-span-full py-16 text-center bg-muted/20 rounded-xl border-2 border-dashed">
        <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
        <h3 className="text-lg font-medium text-muted-foreground">{message}</h3>
    </div>
);

const EditPatientForm = ({ patient, onSubmit, onLanguageChange, isSaving, onCancel, processFieldChange }: {
    patient: InPatient | null,
    onSubmit: (data: any) => void,
    onLanguageChange?: (code: string) => void,
    isSaving: boolean,
    onCancel: () => void,
    processFieldChange: any
}) => {
    const { hospitals } = useHospitals();
    const {
        locationName,
        isGpsEnabled,
        toggleGps,
        handleManualLocationChange
    } = useHospitalLocation('inpatient');

    const diagRef = useRef<HTMLInputElement>(null);
    const procRef = useRef<HTMLTextAreaElement>(null);

    const [data, setData] = useState({
        diagnosis: patient?.diagnosis || '',
        procedure: patient?.procedure || '',
        admission_date: patient?.admission_date ? patient.admission_date.split('T')[0] : '',
        procedure_date: patient?.procedure_date ? patient.procedure_date.split('T')[0] : '',
        room_number: patient?.room_number || '',
        total_bill: patient?.total_bill || '',
        consultant_cut: patient?.consultant_cut || '',
        referred_by: patient?.referred_by || '',
        referral_amount: patient?.referral_amount || '',
        emergency_contact: patient?.emergency_contact || '',
        payment_mode: patient?.payment_mode || 'Cash',
        language: patient?.language || 'en',
        location: patient?.location || 'OrthoLife',
    });

    const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
    const [isProcedureOpen, setIsProcedureOpen] = useState(false);
    const [hasToggledGps, setHasToggledGps] = useState(false);

    React.useEffect(() => {
        if (hasToggledGps && isGpsEnabled && locationName) {
            setData(prev => ({ ...prev, location: locationName }));
            setHasToggledGps(false);
        }
    }, [hasToggledGps, isGpsEnabled, locationName]);

    if (!patient) return null;

    return (
        <div className="space-y-4">
            <DialogHeader className="flex flex-row items-start justify-between text-left pr-10 mb-4">
                <div className="space-y-1">
                    <DialogTitle>Edit Patient Details</DialogTitle>
                    <DialogDescription>Update patient information and preferences.</DialogDescription>
                </div>
                <div className="flex bg-muted rounded-md p-1 shrink-0 mt-0 ml-2">
                    {[
                        { code: 'en', label: 'EN' },
                        { code: 'te', label: 'తె' }
                    ].map(({ code, label }) => (
                        <Button
                            key={code}
                            size="sm"
                            variant={data.language === code ? "default" : "ghost"}
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                                setData({ ...data, language: code });
                                if (onLanguageChange) onLanguageChange(code);
                            }}
                            type="button"
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </DialogHeader>
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Admission Date</Label>
                    <Popover open={isAdmissionOpen} onOpenChange={setIsAdmissionOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !data.admission_date && "text-muted-foreground"
                                )}
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                {data.admission_date ? format(new Date(data.admission_date), "dd MMM yyyy") : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                                mode="single"
                                selected={data.admission_date ? new Date(data.admission_date) : undefined}
                                onSelect={(date) => {
                                    setData({ ...data, admission_date: date ? format(date, "yyyy-MM-dd") : "" });
                                    setIsAdmissionOpen(false);
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>Room / Bed</Label>
                    <Input value={data.room_number || ''} onChange={e => setData({ ...data, room_number: e.target.value })} />
                </div>

            </div>
            <div className="space-y-2 col-span-1 lg:col-span-2">
                <Label>Diagnosis</Label>
                <Input
                    ref={diagRef}
                    value={data.diagnosis}
                    onChange={e => {
                        const val = e.target.value;
                        const cursor = e.target.selectionStart;
                        const result = processFieldChange(val, cursor || val.length, { enableDurationShortcuts: true, language: 'en', variant: 'default' });
                        setData({ ...data, diagnosis: result ? result.newValue : val });
                        if (result) {
                            setTimeout(() => {
                                diagRef.current?.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                            }, 0);
                        }
                    }}
                />
            </div>
            <div className="space-y-2 col-span-1 lg:col-span-2">
                <Label>Procedure</Label>
                <Textarea
                    ref={procRef}
                    value={data.procedure}
                    onChange={e => {
                        const val = e.target.value;
                        const cursor = e.target.selectionStart;
                        const result = processFieldChange(val, cursor || val.length, { enableDurationShortcuts: true, language: 'en', variant: 'default' });
                        setData({ ...data, procedure: result ? result.newValue : val });
                        if (result) {
                            setTimeout(() => {
                                procRef.current?.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                            }, 0);
                        }
                    }}
                />
            </div>
            <div className="space-y-2">
                <Label>Procedure Date</Label>
                <Popover open={isProcedureOpen} onOpenChange={setIsProcedureOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !data.procedure_date && "text-muted-foreground"
                            )}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            {data.procedure_date ? format(new Date(data.procedure_date), "dd MMM yyyy") : <span>Pick date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                            mode="single"
                            selected={data.procedure_date ? new Date(data.procedure_date) : undefined}
                            onSelect={(date) => {
                                setData({ ...data, procedure_date: date ? format(date, "yyyy-MM-dd") : "" });
                                setIsProcedureOpen(false);
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select
                        value={data.payment_mode || 'Cash'}
                        onValueChange={(value) => setData({ ...data, payment_mode: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                            <SelectItem value="Govt Insurance">Govt Insurance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Hospital Location</Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                                toggleGps();
                                if (!isGpsEnabled) {
                                    setHasToggledGps(true);
                                }
                            }}
                            title={isGpsEnabled ? "GPS Auto-detect ON" : "GPS Auto-detect OFF"}
                        >
                            <MapPin className={cn("h-3.5 w-3.5", isGpsEnabled ? "text-blue-500 fill-blue-200" : "text-muted-foreground")} />
                        </Button>
                    </div>
                    <Select
                        value={data.location || 'OrthoLife'}
                        onValueChange={(value) => {
                            handleManualLocationChange(value);
                            setData({ ...data, location: value });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                            {hospitals.map(h => (
                                <SelectItem key={h.name} value={h.name}>{h.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Total Bill (₹)</Label>
                    <Input type="number" value={data.total_bill} onChange={e => setData({ ...data, total_bill: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Consultant Cut (₹)</Label>
                    <Input type="number" value={data.consultant_cut} onChange={e => setData({ ...data, consultant_cut: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Referred By</Label>
                    <Input value={data.referred_by || ''} onChange={e => setData({ ...data, referred_by: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Referral Amount (₹)</Label>
                    <Input type="number" value={data.referral_amount} onChange={e => setData({ ...data, referral_amount: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-1 lg:col-span-2">
                    <Label>Emergency Contact</Label>
                    <Input value={data.emergency_contact || ''} onChange={e => setData({ ...data, emergency_contact: e.target.value })} />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onSubmit(data)} disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
};

// --- Discharge Form with Medication Manager ---
const DischargeForm = forwardRef<{ print: () => void }, {
    patient: InPatient | null,
    onSubmit: (d: DischargeSummary, date: string, isDraft?: boolean) => void,
    isSaving: boolean,
    onPrint?: (d: DischargeSummary, date: string) => void,
    currentLanguage: string,
    consultant: any,
    selectedHospital: any,
    processFieldChange: any,
    autofillKeywords: any[],
    savedMedications: Medication[],
    fetchSavedMedications: () => void
}>(({ patient, onSubmit, isSaving, onPrint, currentLanguage, consultant, selectedHospital, processFieldChange, autofillKeywords, savedMedications, fetchSavedMedications }, ref) => {
    const [activeTab, setActiveTab] = useState("demographics");
    const [dischargeDate, setDischargeDate] = useState<string>('');

    // Field Refs for Cursor Management
    const diagnosisRef = useRef<HTMLInputElement>(null);
    const procedureRef = useRef<HTMLTextAreaElement>(null);
    const operationNotesRef = useRef<HTMLTextAreaElement>(null);
    const clinicalNotesRef = useRef<HTMLTextAreaElement>(null);
    const postOpCareRef = useRef<HTMLTextAreaElement>(null);
    const woundCareRef = useRef<HTMLTextAreaElement>(null);
    const activityRef = useRef<HTMLTextAreaElement>(null);
    const redFlagsRef = useRef<HTMLTextAreaElement>(null);
    const followupRef = useRef<HTMLTextAreaElement>(null);

    const { data: otTemplates } = useQuery({
        queryKey: ['ot-notes-templates-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ot_notes_templates')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        }
    });
    const [otSearch, setOtSearch] = useState('');
    const [otFocusIndex, setOtFocusIndex] = useState(0);
    const [isOtPopoverOpen, setIsOtPopoverOpen] = useState(false);

    const filteredOtTemplates = useMemo(() => {
        const searchWords = otSearch.toLowerCase().split(/\s+/).filter(Boolean);
        return (otTemplates || []).filter(t => {
            const name = t.name.toLowerCase();
            return searchWords.every(word => name.includes(word));
        });
    }, [otSearch, otTemplates]);

    useEffect(() => {
        setOtFocusIndex(0);
    }, [otSearch]);


    // -- Data State --
    const [snapshot, setSnapshot] = useState({
        id: '',
        name: '',
        dob: '',
        sex: '',
        phone: '',
        age: '' as number | '',
        location: 'OrthoLife',
    });

    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAge = e.target.value === '' ? '' : parseInt(e.target.value, 10);
        setSnapshot(prev => ({ ...prev, age: newAge }));

        if (newAge !== '' && !isNaN(newAge)) {
            const today = new Date();
            const birthYear = today.getFullYear() - newAge;
            // Default to Jan 1st if no existing DOB, else keep month/day
            const currentDob = snapshot.dob ? new Date(snapshot.dob) : new Date(birthYear, 0, 1);
            const newDob = new Date(birthYear, currentDob.getMonth(), currentDob.getDate());
            setSnapshot(prev => ({ ...prev, dob: format(newDob, 'yyyy-MM-dd') }));
        }
    };

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDob = e.target.value;
        setSnapshot(prev => ({ ...prev, dob: newDob, age: calculateAge(new Date(newDob)) }));
    };

    const [course, setCourse] = useState({
        admission_date: '',
        procedure: '',
        procedure_date: '',
        diagnosis: '',
        operation_notes: ''
    });

    const [discharge, setDischarge] = useState<DischargeData>({
        medications: [],
        post_op_care: '',
        review_date: '',
        clinical_notes: '',
        red_flags: '',
        wound_care: '',
        activity: '',
        dama_clause: false,
        dama_description: '',
        affordabilityPreference: 'none'
    });

    const applyTemplate = useCallback((t: any) => {
        let content = t.content || '';
        const stepsMarker = "Surgical Steps:</h3>";
        const hrMarker = "<hr>";

        if (content.includes(stepsMarker)) {
            content = content.split(stepsMarker)[1];
        } else if (content.includes(hrMarker)) {
            const parts = content.split(hrMarker);
            content = parts[parts.length - 1];
        }

        // Auto-extract side (Left/Right/Bilateral) from diagnosis/procedure
        let sideTerm = '';
        let sidePrefix = '';
        const diagProcText = `${course.diagnosis} ${course.procedure}`.toLowerCase();
        if (diagProcText.includes('bilateral')) {
            sidePrefix = '(Bilateral) ';
            sideTerm = 'Bilateral';
        } else if (diagProcText.includes('left')) {
            sidePrefix = '(Left) ';
            sideTerm = 'Left';
        } else if (diagProcText.includes('right')) {
            sidePrefix = '(Right) ';
            sideTerm = 'Right';
        }

        let cleanText = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        // Process Placeholders
        let hasLimbSidePlaceholder = /\{\{LimbSide\}\}/gi.test(content);

        if (sideTerm) {
            cleanText = cleanText.replace(/\{\{LimbSide\}\}/gi, sideTerm.toLowerCase());
        } else {
            cleanText = cleanText.replace(/\{\{LimbSide\}\}/gi, '');
        }

        cleanText = cleanText.replace(/\{\{PatientName\}\}/gi, snapshot.name || '');
        // Do NOT replace or purge other placeholders as per user request (ImplantMaterial, etc.)

        // Only add prefix if the placeholder wasn't used in the text
        const finalPrefix = hasLimbSidePlaceholder ? '' : sidePrefix;
        setCourse(prev => ({ ...prev, operation_notes: (finalPrefix + cleanText).trim() }));
        setOtSearch('');
        setIsOtPopoverOpen(false);
    }, [course.diagnosis, course.procedure, snapshot.name]);

    // Auto-match and pre-fill template based on procedure
    useEffect(() => {
        if (otTemplates && course.procedure && (!course.operation_notes || course.operation_notes.trim() === '')) {
            const sideWords = ['left', 'right', 'bilateral'];
            const procSignificantWords = course.procedure.toLowerCase().split(/\W+/).filter(word =>
                word.length >= 3 && !sideWords.includes(word)
            );

            if (procSignificantWords.length === 0) return;

            // Find a template whose name contains all the significant words of the procedure
            const matchedTemplate = otTemplates.find(t => {
                const templateName = t.name.toLowerCase();
                return procSignificantWords.every(pw => templateName.includes(pw));
            });

            if (matchedTemplate) {
                applyTemplate(matchedTemplate);
            }
        }
    }, [course.procedure, otTemplates, applyTemplate, course.operation_notes]);

    const handleOtKeyDown = (e: React.KeyboardEvent) => {
        if (filteredOtTemplates.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOtFocusIndex(prev => Math.min(prev + 1, filteredOtTemplates.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOtFocusIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (otFocusIndex >= 0 && otFocusIndex < filteredOtTemplates.length) {
                applyTemplate(filteredOtTemplates[otFocusIndex]);
            }
        }
    };

    // State for Suture Removal Date
    const [sutureDate, setSutureDate] = useState<Date | undefined>();
    const [isSutureDatePickerOpen, setIsSutureDatePickerOpen] = useState(false);
    const [isDischargeDatePickerOpen, setIsDischargeDatePickerOpen] = useState(false);
    const [isReviewDatePickerOpen, setIsReviewDatePickerOpen] = useState(false);
    const [isDobPickerOpen, setIsDobPickerOpen] = useState(false);
    const [isAdmissionDatePickerOpen, setIsAdmissionDatePickerOpen] = useState(false);
    const [isProcedureDatePickerOpen, setIsProcedureDatePickerOpen] = useState(false);


    // -- Medication Manager Refs --
    const medicationNameInputRef = useRef<HTMLInputElement>(null);
    const medFrequencyRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
    const medDurationRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const medInstructionsRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const medNotesRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );




    // -- Autofill on mount --
    React.useEffect(() => {
        if (patient) {
            // Check if there is an existing discharge summary to load
            if (patient.discharge_summary) {
                const s = patient.discharge_summary;
                const calculatedAge = s.patient_snapshot.dob ? calculateAge(new Date(s.patient_snapshot.dob)) : '';
                setSnapshot({
                    ...s.patient_snapshot,
                    age: (s.patient_snapshot as any).age || calculatedAge || '',
                    location: s.patient_snapshot.location || patient.location || 'OrthoLife'
                });
                // Initialize discharge date from patient record if exists, otherwise existing summary logic? 
                // Wait, patient record holds the official date.
                setDischargeDate(patient.discharge_date ? patient.discharge_date.split('T')[0] : new Date().toISOString().split('T')[0]);

                setCourse({
                    admission_date: s.course_details.admission_date,
                    procedure: s.course_details.procedure,
                    procedure_date: s.course_details.procedure_date || '',
                    diagnosis: s.course_details.diagnosis,
                    operation_notes: s.course_details.operation_notes || ''
                });
                setDischarge({
                    medications: (s.discharge_data.medications || []).map(m => ({
                        ...m,
                        composition: m.composition || (m as any).name || '',
                        dose: m.dose || '',
                        frequency: m.frequency || '',
                        duration: m.duration || '',
                        instructions: m.instructions || '',
                        notes: m.notes || '',
                        freqMorning: m.freqMorning ?? false,
                        freqNoon: m.freqNoon ?? false,
                        freqNight: m.freqNight ?? false
                    })),
                    post_op_care: s.discharge_data.post_op_care || '',
                    review_date: s.discharge_data.review_date || '',
                    clinical_notes: s.discharge_data.clinical_notes || '',
                    red_flags: s.discharge_data.red_flags || '',
                    wound_care: s.discharge_data.wound_care || '',
                    activity: s.discharge_data.activity || '',
                    dama_clause: s.discharge_data.dama_clause || false,
                    dama_description: s.discharge_data.dama_description || '',
                    affordabilityPreference: s.discharge_data.affordabilityPreference || 'none'
                });
            } else {
                // Initialize from Admission Record
                const calculatedAge = patient.patient.dob ? calculateAge(new Date(patient.patient.dob)) : '';
                // Default to Today for new discharge
                setDischargeDate(new Date().toISOString().split('T')[0]);

                setSnapshot({
                    id: patient.id,
                    name: patient.patient.name,
                    dob: patient.patient.dob || '',
                    sex: patient.patient.sex || '',
                    phone: patient.patient.phone,
                    age: calculatedAge,
                    location: patient.location || 'OrthoLife',
                });
                setCourse({
                    admission_date: patient.admission_date ? patient.admission_date.split('T')[0] : '',
                    procedure: patient.procedure,
                    procedure_date: patient.procedure_date ? patient.procedure_date.split('T')[0] : '',
                    diagnosis: patient.diagnosis,
                    operation_notes: ''
                });
                setDischarge({
                    medications: [],
                    post_op_care: '',
                    review_date: '',
                    clinical_notes: '',
                    red_flags: '',
                    wound_care: '',
                    activity: '',
                    dama_clause: false,
                    dama_description: ''
                });
            }
        }
    }, [patient]);


    // -- Medication Manager Logic --
    const {
        addMedication,
        removeMedication,
        handleMedChange: originalHandleMedChange,
        handleDragEnd,
        handleMedicationSuggestionClick: originalHandleMedicationSuggestionClick
    } = useMedicationManager({
        medications: discharge.medications,
        onMedicationsChange: (meds) => {
            if (typeof meds === 'function') {
                setDischarge(prev => ({ ...prev, medications: meds(prev.medications) }));
            } else {
                setDischarge(prev => ({ ...prev, medications: meds }));
            }
        }
    });

    const handleMedicationSuggestionClick = (med: Medication) => {
        originalHandleMedicationSuggestionClick(med, currentLanguage);
    };

    const handleMedChange = (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => {
        // 1. First process with shortcut logic if it's a string field
        if (typeof value === 'string' && (field === 'composition' || field === 'dose' || field === 'frequency' || field === 'duration' || field === 'instructions' || field === 'notes')) {
            const result = processFieldChange(value, cursorPosition || value.length, { enableDurationShortcuts: true, language: 'en', variant: 'default' });
            if (result) {
                originalHandleMedChange(index, field, result.newValue);
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
                        (ref as any).setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                    }
                }, 0);
                return;
            }
        }

        // 2. Otherwise fall back to standard handler
        originalHandleMedChange(index, field, value);
    };

    // -- Generic Shortcut Handler for TextAreas --
    const handleTextChange = (field: 'diagnosis' | 'procedure' | 'operation_notes' | 'post_op_care' | 'clinical_notes' | 'activity' | 'red_flags' | 'wound_care' | 'followup', value: string, cursorPosition?: number) => {
        const isCourseField = ['diagnosis', 'procedure', 'operation_notes'].includes(field);

        const result = processFieldChange(value, cursorPosition || value.length, {
            enableDurationShortcuts: true,
            language: 'en',
            variant: field === 'followup' ? 'followup' : 'default'
        });

        const newValue = result ? result.newValue : value;

        if (isCourseField) {
            setCourse(prev => ({ ...prev, [field]: newValue }));
        } else {
            setDischarge(prev => ({ ...prev, [field]: newValue }));
        }

        if (result) {
            setTimeout(() => {
                const refs: any = {
                    diagnosis: diagnosisRef,
                    procedure: procedureRef,
                    operation_notes: operationNotesRef,
                    clinical_notes: clinicalNotesRef,
                    post_op_care: postOpCareRef,
                    wound_care: woundCareRef,
                    activity: activityRef,
                    red_flags: redFlagsRef,
                    followup: followupRef
                };
                const targetRef = refs[field];
                if (targetRef && targetRef.current) {
                    targetRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                }
            }, 0);
        }
    };


    // -- Autofill Logic --
    const { suggestedMedications } = useMemo(() => {
        if (!course.diagnosis && !course.procedure) return { suggestedMedications: [] };

        const inputText = `${course.diagnosis || ''} ${course.procedure || ''}`.toLowerCase();
        const suggestions = new Set<string>();
        const medicationIds = new Set<number>();

        autofillKeywords.forEach(protocol => {
            const match = (protocol.keywords || []).some(k => inputText.includes(k.toLowerCase()));
            if (match && protocol.medication_ids) {
                protocol.medication_ids.forEach(id => medicationIds.add(id));
            }
        });

        const meds = savedMedications.filter(m => {
            // Handle potentially different ID types (string in state, number in DB protocol)
            return medicationIds.has(Number(m.id)) || medicationIds.has(String(m.id) as any);
        });

        // Filter out already added
        const currentNames = new Set(discharge.medications.map(m => ((m as any).composition || (m as any).name || '').toLowerCase()));

        return {
            suggestedMedications: meds.filter(m => !currentNames.has(((m as any).composition || (m as any).name || '').toLowerCase()))
                .map(med => {
                    const affordabilityPreference = discharge.affordabilityPreference || 'none';
                    let bestBrand: string | undefined = undefined;

                    if (med.brand_metadata && med.brand_metadata.length > 0) {
                        let validBrands = [...med.brand_metadata];
                        // If no preference, we still want to show A brand name for the badge
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
    }, [course.diagnosis, course.procedure, autofillKeywords, savedMedications, discharge.medications, discharge.affordabilityPreference]);


    const isTelugu = currentLanguage === 'te';

    // Dynamic template swapping when language changes
    const prevLanguageRef = useRef<string | null>(null);
    useEffect(() => {
        const newLang = currentLanguage as keyof typeof DISCHARGE_INSTRUCTIONS;
        const prevLang = prevLanguageRef.current as keyof typeof DISCHARGE_INSTRUCTIONS | null;

        setDischarge(prev => {
            const updated = { ...prev };
            const fieldsToSwap: ('red_flags' | 'wound_care' | 'activity')[] = ['red_flags', 'wound_care', 'activity'];

            let changed = false;
            fieldsToSwap.forEach(f => {
                const prevDefault = prevLang ? DISCHARGE_INSTRUCTIONS[prevLang][f].trim() : null;
                const currentVal = (prev[f] || '').trim();

                // If it's the first run and the field is empty, OR
                // if it matches the previous default, swap to the current default
                if (!currentVal || (prevDefault && currentVal === prevDefault)) {
                    if (prev[f] !== DISCHARGE_INSTRUCTIONS[newLang][f]) {
                        updated[f] = DISCHARGE_INSTRUCTIONS[newLang][f];
                        changed = true;
                    }
                }
            });

            return changed ? updated : prev;
        });

        prevLanguageRef.current = currentLanguage;
    }, [currentLanguage]);

    const buildSummary = (): DischargeSummary => ({
        patient_snapshot: {
            id: snapshot.id,
            name: snapshot.name,
            dob: snapshot.dob,
            sex: snapshot.sex,
            phone: snapshot.phone
        },
        course_details: {
            admission_date: course.admission_date,
            procedure: course.procedure,
            procedure_date: course.procedure_date || null,
            diagnosis: course.diagnosis,
            operation_notes: course.operation_notes
        },
        discharge_data: discharge,
        language: currentLanguage
    });

    useImperativeHandle(ref, () => ({
        print: () => {
            if (onPrint) onPrint(buildSummary(), dischargeDate);
        }
    }));

    const handleSubmit = () => {
        onSubmit(buildSummary(), dischargeDate, false);
    };

    const handleSaveDraft = () => {
        onSubmit(buildSummary(), dischargeDate, true);
    };

    if (!patient) return null;

    return (
        <div className="flex flex-col h-full gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
                    <TabsTrigger value="demographics">1. Demographics</TabsTrigger>
                    <TabsTrigger value="course">2. Course Details</TabsTrigger>
                    <TabsTrigger value="discharge">3. Plan & Medications</TabsTrigger>
                </TabsList>

                <div className="flex-grow mt-4 min-h-0">
                    {/* Tab 1: Demographics */}
                    <TabsContent value="demographics" className="space-y-4 h-full overflow-y-auto px-1">
                        <div className="p-4 bg-muted/20 rounded-lg border border-primary/20">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                                <User className="w-4 h-4" /> Patient Snapshot
                            </h3>
                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Patient Name</Label>
                                    <Input value={snapshot.name} onChange={e => setSnapshot({ ...snapshot, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={snapshot.phone} onChange={e => setSnapshot({ ...snapshot, phone: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>DOB / Age</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Age"
                                            type="number"
                                            className="w-24"
                                            value={snapshot.age}
                                            onChange={handleAgeChange}
                                        />
                                        <Popover open={isDobPickerOpen} onOpenChange={setIsDobPickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "flex-1 justify-start text-left font-normal",
                                                        !snapshot.dob && "text-muted-foreground"
                                                    )}
                                                >
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    {snapshot.dob ? format(new Date(snapshot.dob), "dd MMM yyyy") : <span>Pick DOB</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarUI
                                                    mode="single"
                                                    selected={snapshot.dob ? new Date(snapshot.dob) : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const formatted = format(date, "yyyy-MM-dd");
                                                            setSnapshot(prev => ({ ...prev, dob: formatted, age: calculateAge(date) }));
                                                        }
                                                        setIsDobPickerOpen(false);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Sex</Label>
                                    <Input value={snapshot.sex} onChange={e => setSnapshot({ ...snapshot, sex: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <Button onClick={() => setActiveTab("course")}>Next: Course Details</Button>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Course Details */}
                    <TabsContent value="course" className="space-y-4 h-full overflow-y-auto px-1">
                        <div className="p-4 bg-muted/20 rounded-lg border border-primary/20">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                                <ClipboardList className="w-4 h-4" /> Hospital Course
                            </h3>
                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-1 lg:col-span-2">
                                    <Label>Diagnosis</Label>
                                    <Input ref={diagnosisRef} value={course.diagnosis} onChange={e => handleTextChange('diagnosis', e.target.value, e.target.selectionStart)} />
                                </div>
                                <div className="space-y-2 col-span-1 lg:col-span-2">
                                    <Label>Procedure Performed</Label>
                                    <Textarea ref={procedureRef} value={course.procedure} onChange={e => handleTextChange('procedure', e.target.value, e.target.selectionStart)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Admission Date</Label>
                                    <Popover open={isAdmissionDatePickerOpen} onOpenChange={setIsAdmissionDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !course.admission_date && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {course.admission_date ? format(new Date(course.admission_date), "dd MMM yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarUI
                                                mode="single"
                                                selected={course.admission_date ? new Date(course.admission_date) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setCourse({ ...course, admission_date: format(date, "yyyy-MM-dd") });
                                                    }
                                                    setIsAdmissionDatePickerOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Procedure Date</Label>
                                    <Popover open={isProcedureDatePickerOpen} onOpenChange={setIsProcedureDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !course.procedure_date && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {course.procedure_date ? format(new Date(course.procedure_date), "dd MMM yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarUI
                                                mode="single"
                                                selected={course.procedure_date ? new Date(course.procedure_date) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setCourse({ ...course, procedure_date: format(date, "yyyy-MM-dd") });
                                                    }
                                                    setIsProcedureDatePickerOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2 col-span-1 lg:col-span-2">
                                    <div className="flex justify-between items-center bg-muted/40 p-2 rounded-t-lg border-x border-t">
                                        <Label className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                            Operation Notes / Intro
                                        </Label>
                                        <Popover open={isOtPopoverOpen} onOpenChange={setIsOtPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-primary/20 hover:border-primary/50">
                                                    <ClipboardPen className="w-3 h-3" />
                                                    TEMPLATES
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="end">
                                                <div className="p-2 border-b">
                                                    <Input
                                                        placeholder="Search templates..."
                                                        className="h-8 text-xs"
                                                        value={otSearch}
                                                        onChange={(e) => setOtSearch(e.target.value)}
                                                        onKeyDown={handleOtKeyDown}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-[250px] overflow-y-auto">
                                                    {filteredOtTemplates.map((t, idx) => (
                                                        <button
                                                            key={t.id}
                                                            className={cn(
                                                                "w-full text-left p-2.5 text-xs hover:bg-muted transition-colors border-b last:border-0",
                                                                idx === otFocusIndex && "bg-primary/5 border-l-2 border-l-primary"
                                                            )}
                                                            onClick={() => applyTemplate(t)}
                                                            onMouseEnter={() => setOtFocusIndex(idx)}
                                                        >
                                                            <div className="font-bold">{t.name}</div>
                                                            <div className="text-[10px] text-muted-foreground truncate">{cleanText(t.content || '')}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Textarea
                                        ref={operationNotesRef}
                                        placeholder="Tourniquet time, findings, implants used..."
                                        value={course.operation_notes}
                                        onChange={e => handleTextChange('operation_notes', e.target.value, e.target.selectionStart)}
                                        className="rounded-t-none min-h-[120px]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-4">
                            <Button variant="outline" onClick={() => setActiveTab("demographics")}>Back</Button>
                            <Button onClick={() => setActiveTab("discharge")}>Next: Discharge Plan</Button>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Discharge Plan & Meds */}
                    <TabsContent value="discharge" className="space-y-4 h-full flex flex-col">
                        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Discharge Date</Label>
                                    <Popover open={isDischargeDatePickerOpen} onOpenChange={setIsDischargeDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !dischargeDate && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {dischargeDate ? format(new Date(dischargeDate), "dd MMM yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarUI
                                                mode="single"
                                                selected={dischargeDate ? new Date(dischargeDate) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setDischargeDate(format(date, "yyyy-MM-dd"));
                                                    }
                                                    setIsDischargeDatePickerOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Additional Clinical Notes / Summary</Label>
                                <Textarea
                                    ref={clinicalNotesRef}
                                    placeholder="Summary of hospital stay..."
                                    value={discharge.clinical_notes}
                                    onChange={e => handleTextChange('clinical_notes', e.target.value, e.target.selectionStart)}
                                />
                            </div>

                            {/* Medication Manager */}
                            <div className="bg-muted/10 p-4 border rounded-lg">
                                <MedicationManager
                                    medications={discharge.medications}
                                    sensors={sensors}
                                    handleDragEnd={handleDragEnd}
                                    handleMedChange={handleMedChange}
                                    removeMedication={removeMedication}
                                    addMedication={addMedication}
                                    savedMedications={savedMedications}
                                    setExtraData={setDischarge as any}
                                    medicationNameInputRef={medicationNameInputRef}
                                    fetchSavedMedications={fetchSavedMedications}
                                    language={currentLanguage}
                                    medFrequencyRefs={medFrequencyRefs}
                                    medDurationRefs={medDurationRefs}
                                    medInstructionsRefs={medInstructionsRefs}
                                    medNotesRefs={medNotesRefs}
                                    suggestedMedications={suggestedMedications} // Pass parsed suggestions
                                    handleMedicationSuggestionClick={handleMedicationSuggestionClick}

                                    affordabilityPreference={discharge.affordabilityPreference || 'none'}
                                    onAffordabilityChange={(val) => setDischarge(prev => ({ ...prev, affordabilityPreference: val }))}
                                />

                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Post-Op Care / Advice</Label>
                                <Textarea
                                    ref={postOpCareRef}
                                    placeholder="Care instructions..."
                                    value={discharge.post_op_care}
                                    onChange={e => handleTextChange('post_op_care', e.target.value, e.target.selectionStart)}
                                />
                            </div>




                            {/* New Sections (Moved to Bottom) */}
                            <div className="grid grid-cols-1 gap-4 pt-4 border-t">


                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Wound Care Instructions</Label>
                                        <Popover open={isSutureDatePickerOpen} onOpenChange={setIsSutureDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 text-xs font-normal",
                                                        !sutureDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <Calendar className="mr-2 h-3 w-3" />
                                                    {sutureDate ? format(sutureDate, "dd MMM") : <span>Set Suture Date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <CalendarUI
                                                    mode="single"
                                                    selected={sutureDate}
                                                    onSelect={(date) => {
                                                        setSutureDate(date);
                                                        setIsSutureDatePickerOpen(false);
                                                        if (date) {
                                                            const formattedDate = format(date, 'dd MMM yyyy');
                                                            const prefix = isTelugu ? '- కుట్లు తీసే తేదీ: ' : '- Suture Removal: ';
                                                            const newLine = `${prefix}${formattedDate}`;
                                                            let currentText = discharge.wound_care || '';

                                                            // Check if the line already exists
                                                            if (currentText.includes(prefix)) {
                                                                // Replace existing line (regex to match line)
                                                                // Escape regex special chars in prefix if any (none in this case)
                                                                const regex = new RegExp(`${prefix}.*`);
                                                                setDischarge(prev => ({ ...prev, wound_care: currentText.replace(regex, newLine) }));
                                                            } else {
                                                                // Append new line
                                                                // Ensure newline before if text exists
                                                                const separator = currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '';
                                                                setDischarge(prev => ({ ...prev, wound_care: `${currentText}${separator}${newLine}` }));
                                                            }
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Textarea
                                        ref={woundCareRef}
                                        value={discharge.wound_care || ''}
                                        onChange={e => handleTextChange('wound_care', e.target.value, e.target.selectionStart)}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Activity className="w-4 h-4" /> Activity / Physio Instructions</Label>
                                    <Textarea
                                        ref={activityRef}
                                        value={discharge.activity || ''}
                                        onChange={e => handleTextChange('activity', e.target.value, e.target.selectionStart)}
                                        rows={6}
                                    />
                                </div>

                                <Alert className="bg-red-50 border-red-200">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-700">Medical Warning</AlertTitle>
                                    <AlertDescription>
                                        <div className="space-y-2 mt-2">
                                            <Label className="text-red-700 font-semibold">Red Flags / Emergency Instructions</Label>
                                            <Textarea
                                                ref={redFlagsRef}
                                                value={discharge.red_flags || ''}
                                                onChange={e => handleTextChange('red_flags', e.target.value, e.target.selectionStart)}
                                                className="bg-white border-red-200"
                                                rows={5}
                                            />
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Review Date</Label>
                                    <Popover open={isReviewDatePickerOpen} onOpenChange={setIsReviewDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !discharge.review_date && "text-muted-foreground"
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {discharge.review_date ? format(new Date(discharge.review_date), "dd MMM yyyy") : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarUI
                                                mode="single"
                                                selected={discharge.review_date ? new Date(discharge.review_date) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        setDischarge({ ...discharge, review_date: format(date, "yyyy-MM-dd") });
                                                    }
                                                    setIsReviewDatePickerOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-4 border p-4 rounded-md bg-yellow-50 border-yellow-200">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="dama_clause"
                                            checked={discharge.dama_clause}
                                            onCheckedChange={(checked) => {
                                                const isChecked = checked === true;
                                                setDischarge({
                                                    ...discharge,
                                                    dama_clause: isChecked,
                                                    // Auto-fill DAMA text if checking box and text is empty
                                                    dama_description: (isChecked && !discharge.dama_description)
                                                        ? (isTelugu ? DAMA_TEXT.te : DAMA_TEXT.en)
                                                        : discharge.dama_description
                                                });
                                            }}
                                        />
                                        <Label htmlFor="dama_clause" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                            Patient Discharged Against Medical Advice (DAMA)
                                        </Label>
                                    </div>

                                    {discharge.dama_clause && (
                                        <div className="ml-6 space-y-2">
                                            <Label className="text-xs text-muted-foreground">Legal Clause (Editable):</Label>
                                            <Textarea
                                                value={discharge.dama_description || ''}
                                                onChange={e => setDischarge({ ...discharge, dama_description: e.target.value })}
                                                className="bg-white text-xs"
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-4 pt-4 border-t sticky bottom-0 bg-background">
                            <Button variant="outline" onClick={() => setActiveTab("course")}>Back</Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={handleSaveDraft}
                                    disabled={isSaving}
                                    className="bg-muted hover:bg-muted/80"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <ClipboardList className="w-4 h-4 mr-2" />
                                    Save Draft
                                </Button>
                                <Button onClick={handleSubmit} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Finalize Discharge
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs >
        </div >
    );
});
DischargeForm.displayName = "DischargeForm";

const InPatientCard = ({ patient, onSendWhatsApp, onEdit, onDischarge, onPrint, onViewSummary, onConsents, onDelete }: {
    patient: InPatient;
    onSendWhatsApp: (p: InPatient, type: 'pre-op' | 'post-op' | 'rehab' | 'general') => void;
    onEdit?: () => void;
    onDischarge?: () => void;
    onPrint?: () => void;
    onViewSummary?: () => void;
    onConsents?: () => void;
    onDelete?: () => void;
}) => {
    const { data: otTemplates } = useQuery({
        queryKey: ['ot-notes-templates-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ot_notes_templates')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    const [otSearch, setOtSearch] = useState('');
    const [otFocusIndex, setOtFocusIndex] = useState(0);
    const [isOtPopoverOpen, setIsOtPopoverOpen] = useState(false);

    const filteredOtTemplates = useMemo(() => {
        if (!otSearch) return otTemplates || [];
        const lowerSearch = otSearch.toLowerCase();
        const searchWords = lowerSearch.split(/\s+/).filter(Boolean);
        return (otTemplates || []).filter(t => {
            const name = t.name.toLowerCase();
            return searchWords.every(word => name.includes(word));
        });
    }, [otTemplates, otSearch]);

    useEffect(() => {
        setOtFocusIndex(0);
    }, [otSearch]);

    const handleOtKeyDown = (e: React.KeyboardEvent) => {
        if (filteredOtTemplates.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOtFocusIndex(prev => Math.min(prev + 1, filteredOtTemplates.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOtFocusIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (otFocusIndex >= 0 && otFocusIndex < filteredOtTemplates.length) {
                const t = filteredOtTemplates[otFocusIndex];
                setIsOtPopoverOpen(false);
                window.location.href = `/ot-notes?patient_id=${patient.id}&template_id=${t.id}`;
            }
        }
    };

    const calculateDays = (startDate: string | null) => {
        if (!startDate) return null;
        const start = startOfDay(new Date(startDate));
        const today = startOfDay(new Date());
        return differenceInDays(today, start);
    };

    const adDay = calculateDays(patient.admission_date);
    const pod = calculateDays(patient.procedure_date);
    const isDischarged = patient.status === 'discharged';
    const summary = patient.discharge_summary;

    const patientName = isDischarged && summary ? summary.patient_snapshot.name : patient.patient.name;
    const diagnosis = isDischarged && summary ? summary.course_details.diagnosis : patient.diagnosis;
    const procedure = isDischarged && summary ? summary.course_details.procedure : patient.procedure;

    return (
        <Card className={cn(
            "overflow-hidden hover:shadow-xl transition-all duration-300 border-t-4 flex flex-col h-full",
            isDischarged ? "border-t-muted-foreground opacity-90" : "border-t-primary"
        )}>
            <CardHeader className="pb-3 relative">
                {(onEdit || onViewSummary || onPrint || onDelete) && (
                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {onViewSummary && (
                                    <DropdownMenuItem onClick={onViewSummary}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        View Discharge Summary
                                    </DropdownMenuItem>
                                )}
                                {onPrint && (
                                    <DropdownMenuItem onClick={onPrint}>
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print Summary
                                    </DropdownMenuItem>
                                )}
                                {onEdit && (
                                    <DropdownMenuItem onClick={onEdit}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Edit Record
                                    </DropdownMenuItem>
                                )}
                                {!isDischarged && onDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Record
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                <div className="flex justify-between items-start pr-8">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                            {patientName}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {patient.patient.dob ? calculateAge(patient.patient.dob) : '-'} / {patient.patient.sex || '-'}
                            </Badge>
                            <span>•</span>
                            <span className="text-xs font-mono">{patient.patient.phone}</span>
                            {patient.emergency_contact && (
                                <>
                                    <span>•</span>
                                    <span className="text-xs font-mono text-red-600 flex items-center gap-1">
                                        {patient.emergency_contact}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                    {!isDischarged && adDay !== null && <Badge className="bg-blue-100 text-blue-700 pointer-events-none hover:bg-blue-100 border-blue-200">AD {adDay + 1}</Badge>}
                    {!isDischarged && pod !== null && <Badge className="bg-emerald-100 text-emerald-700 pointer-events-none hover:bg-emerald-100 border-emerald-200">POD {pod}</Badge>}
                    {patient.room_number && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <BedDouble className="w-3 h-3" /> {patient.room_number}
                        </Badge>
                    )}
                    {patient.payment_mode && (
                        <Badge variant="outline" className={cn(
                            "flex items-center gap-1",
                            patient.payment_mode === 'Cash' ? "bg-green-50 text-green-700 border-green-200" :
                                patient.payment_mode === 'Health Insurance' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    "bg-orange-50 text-orange-700 border-orange-200"
                        )}>
                            <span className="text-[10px]">{patient.payment_mode}</span>
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4 flex-grow">
                {isDischarged && summary && (
                    <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
                        {summary.discharge_data.review_date && (
                            <div className="flex items-center gap-2 text-primary font-medium">
                                <CalendarDays className="w-4 h-4" />
                                Review: {format(new Date(summary.discharge_data.review_date), 'dd MMM yyyy')}
                            </div>
                        )}

                        {summary.discharge_data.medications && summary.discharge_data.medications.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                                <span className="font-bold uppercase block mb-1">Meds ({summary.discharge_data.medications.length})</span>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    {summary.discharge_data.medications.slice(0, 3).map((m, i) => (
                                        <li key={i}>{m.brandName || m.composition || (m as any).name || ''} - {m.frequency} x {m.duration}</li>
                                    ))}
                                    {summary.discharge_data.medications.length > 3 && <li>...</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 rounded bg-muted/40 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3" />
                            <span className="font-semibold text-[10px] uppercase tracking-wider">Admission</span>
                        </div>
                        <p className="font-medium">{format(new Date(patient.admission_date), 'dd MMM')}</p>
                    </div>

                    <div className="p-2 rounded bg-muted/40 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3" />
                            <span className="font-semibold text-[10px] uppercase tracking-wider">
                                {isDischarged ? 'Discharge' : 'Surgery'}
                            </span>
                        </div>
                        <p className="font-medium">
                            {isDischarged
                                ? (patient.discharge_date ? format(new Date(patient.discharge_date), 'dd MMM') : '-')
                                : (patient.procedure_date ? format(new Date(patient.procedure_date), 'dd MMM') : '-')
                            }
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex gap-2 items-start">
                        <Stethoscope className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Diagnosis</p>
                            <p className="text-sm font-medium leading-tight">{diagnosis || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-start">
                        <ClipboardList className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Procedure</p>
                            <p className="text-sm font-medium leading-tight">{procedure || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-3 flex flex-col gap-3 mt-auto">
                    {!isDischarged && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" className="h-9 sm:h-8 text-[11px] sm:text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'pre-op')}>
                                Pre-Op
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 sm:h-8 text-[11px] sm:text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'post-op')}>
                                Post-Op
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 sm:h-8 text-[11px] sm:text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'rehab')}>
                                Rehab
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 sm:h-8 text-[11px] sm:text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'general')}>
                                General
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            {onConsents && (
                                <Button variant="secondary" size="sm" className={cn("w-full text-xs h-9 px-1", !isDischarged === false && "col-span-2")} onClick={onConsents}>
                                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                                    Consents
                                </Button>
                            )}
                            {!isDischarged && (
                                <div className={cn("grid grid-cols-[1fr,auto] gap-px rounded-md overflow-hidden border", !onConsents && "col-span-2")}>
                                    <Button variant="outline" size="sm" asChild className="w-full text-xs h-9 border-0 rounded-none hover:bg-primary/5">
                                        <Link to="/ot-notes" state={{ initialPatient: patient }}>
                                            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                            OT Note
                                        </Link>
                                    </Button>
                                    <Popover open={isOtPopoverOpen} onOpenChange={setIsOtPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-9 w-8 border-0 border-l rounded-none hover:bg-primary/5">
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0" align="end">
                                            <div className="p-2 border-b bg-muted/20">
                                                <div className="flex items-center gap-2">
                                                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search procedures..."
                                                        className="h-8 text-xs border-none focus-visible:ring-0 px-0"
                                                        value={otSearch}
                                                        onChange={(e) => setOtSearch(e.target.value)}
                                                        onKeyDown={handleOtKeyDown}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <ScrollArea className="h-full max-h-[300px]">
                                                {filteredOtTemplates.map((t, idx) => (
                                                    <button
                                                        key={t.id}
                                                        className={cn(
                                                            "w-full text-left p-3 text-xs hover:bg-primary/5 transition-colors border-b last:border-0 group",
                                                            idx === otFocusIndex && "bg-primary/5 border-l-2 border-l-primary"
                                                        )}
                                                        onClick={() => {
                                                            setIsOtPopoverOpen(false);
                                                            window.location.href = `/ot-notes?patient_id=${patient.id}&template_id=${t.id}`;
                                                        }}
                                                        onMouseEnter={() => setOtFocusIndex(idx)}
                                                    >
                                                        <div className="font-bold flex items-center justify-between">
                                                            {t.name}
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{cleanText(t.content || '')}</div>
                                                    </button>
                                                ))}
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                        </div>
                        {onDischarge && (
                            <Button variant="destructive" size="sm" className="w-full text-xs h-9 px-1" onClick={onDischarge}>
                                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                                Discharge
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default InPatientManagement;
