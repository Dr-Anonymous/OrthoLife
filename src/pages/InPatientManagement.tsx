import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, startOfDay } from 'date-fns';
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
    User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReactToPrint } from 'react-to-print';
import { DischargeSummaryPrint } from '@/components/inpatient/DischargeSummaryPrint';
import { Globe, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { calculateAge } from "@/lib/age";
import { MedicationManager } from '@/components/consultation/MedicationManager';
import { Medication } from '@/types/consultation';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { processTextShortcuts } from '@/lib/textShortcuts';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// --- Types ---

import { InPatient, DischargeSummary } from '@/types/inPatients';


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

const InPatientManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const { i18n } = useTranslation();

    // Refs
    const dischargeFormRef = useRef<{ print: () => void }>(null);

    // Printing
    const [printData, setPrintData] = useState<DischargeSummary | null>(null);
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setIsReadyToPrint(false)
    });

    React.useEffect(() => {
        if (isReadyToPrint && printRef.current) {
            handlePrint();
        }
    }, [isReadyToPrint]);

    const triggerPrint = (summary: DischargeSummary) => {
        setPrintData(summary);
        setIsReadyToPrint(true);
    };


    // Modal States
    const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);

    // Selection States
    const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<InPatient | null>(null);
    const [selectedPatientForWhatsApp, setSelectedPatientForWhatsApp] = useState<InPatient | null>(null);
    const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<InPatient | null>(null);
    const [, setWhatsAppType] = useState<'pre-op' | 'post-op' | 'rehab' | null>(null);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');

    // Admission Form State
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientSearch, setPatientSearch] = useState('');
    const [admissionData, setAdmissionData] = useState({
        diagnosis: '',
        procedure: '',
        admission_date: format(new Date(), 'yyyy-MM-dd'),
        procedure_date: '',
        room_number: '',
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // --- Queries ---
    const { data: searchPatients } = useQuery({
        queryKey: ['patients-search', patientSearch],
        queryFn: async () => {
            if (patientSearch.length < 3) return [];
            const { data, error } = await supabase
                .rpc('search_patients_normalized', { search_term: patientSearch })
                .select('id, name, phone')
                .limit(5);
            if (error) throw error;
            return data;
        },
        enabled: patientSearch.length >= 3
    });

    const { data: inPatients, isLoading } = useQuery({
        queryKey: ['in-patients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('in_patients')
                .select(`
          *,
          patient:patients(name, phone, dob, sex, drive_id)
        `)
                .order('admission_date', { ascending: false });

            if (error) throw error;
            return data as InPatient[];
        }
    });

    // --- Mutations ---

    const admitMutation = useMutation({
        mutationFn: async (vars: any) => {
            const { error } = await supabase.from('in_patients').insert([{
                patient_id: vars.patient_id,
                diagnosis: vars.diagnosis,
                procedure: vars.procedure,
                admission_date: new Date(vars.admission_date).toISOString(),
                procedure_date: vars.procedure_date ? new Date(vars.procedure_date).toISOString() : null,
                room_number: vars.room_number || null,
                status: 'admitted'
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
            const { error } = await supabase.from('in_patients').update({
                diagnosis: vars.diagnosis,
                procedure: vars.procedure,
                admission_date: new Date(vars.admission_date).toISOString(),
                procedure_date: vars.procedure_date ? new Date(vars.procedure_date).toISOString() : null,
                room_number: vars.room_number || null,
            }).eq('id', vars.id);
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
        mutationFn: async ({ id, summary, language }: { id: string, summary: DischargeSummary, language: string }) => {
            const { error } = await supabase
                .from('in_patients')
                .update({
                    status: 'discharged',
                    discharge_date: new Date().toISOString(),
                    discharge_summary: summary,
                    language: language
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['in-patients'] });
            setIsDischargeModalOpen(false);
            toast({ title: "Discharged", description: "Patient discharged successfully." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const sendWhatsAppMutation = useMutation({
        mutationFn: async ({ phone, message }: { phone: string, message: string }) => {
            const { error } = await supabase.functions.invoke('send-whatsapp', {
                body: { number: phone, message },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setIsWhatsAppModalOpen(false);
            toast({ title: "Sent", description: "WhatsApp message sent." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
        }
    });

    // --- Helpers ---

    const resetAdmitForm = () => {
        setSelectedPatientId(null);
        setPatientSearch('');
        setAdmissionData({
            diagnosis: '',
            procedure: '',
            admission_date: format(new Date(), 'yyyy-MM-dd'),
            procedure_date: '',
            room_number: '',
        });
    };

    const initWhatsApp = (patient: InPatient, type: 'pre-op' | 'post-op' | 'rehab') => {
        setSelectedPatientForWhatsApp(patient);
        setWhatsAppType(type);

        const patientName = patient.patient.name;
        let message = '';

        if (type === 'pre-op') {
            message = `Hello ${patientName}, this is an update regarding your scheduled procedure: ${patient.procedure}. Please ensure you are fasting from midnight. \nHere is an article outlining common before-surgery concerns: https://www.ortho.life/guides/15  \nBest regards, Dr Samuel Manoj Ch.`;
        } else if (type === 'post-op') {
            message = `Hello ${patientName}, hope you are recovering well after your procedure. If you have any concers, you can contact this number directly. \nHere is an article outlining common after-surgery concerns: https://www.ortho.life/guides/10 \nBest regards, Dr Samuel Manoj Ch.`;
        } else if (type === 'rehab') {
            message = `Hello ${patientName}, hope you are recovering well after your procedure. Here is a customised guide for your rehabilitation journey: https://www.ortho.life/guides/11 \nBest regards, Dr Samuel Manoj Ch.`;
        } else {
            message = `Update for ${patientName}: Your current clinical status is stable. \nDiagnosis: ${patient.diagnosis}. \nWe will keep you updated on the further plan. \nBest regards, Dr Samuel Manoj Ch.`;
        }
        setWhatsAppMessage(message);
        setIsWhatsAppModalOpen(true);
    };

    const openEditModal = (patient: InPatient) => {
        if (patient.status === 'discharged') {
            openDischargeModal(patient);
        } else {
            setSelectedPatientForEdit(patient);
            setIsEditModalOpen(true);
        }
    };

    const openDischargeModal = (patient: InPatient) => {
        if (patient.language) {
            i18n.changeLanguage(patient.language);
        } else {
            i18n.changeLanguage('en');
        }
        setSelectedPatientForDischarge(patient);
        setIsDischargeModalOpen(true);
    };

    const filteredPatients = useMemo(() => {
        if (!inPatients) return [];
        return inPatients.filter(p =>
            p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.patient.phone.includes(searchTerm) ||
            (p.diagnosis && p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [inPatients, searchTerm]);

    const admittedPatients = filteredPatients.filter(p => p.status === 'admitted');
    const dischargedPatients = filteredPatients.filter(p => p.status === 'discharged');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium">Loading patient records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                        <Users className="w-8 h-8" />
                        IP Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage admissions, procedures, and patient updates.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button onClick={() => setIsAdmitModalOpen(true)} className="bg-primary hover:bg-primary/90">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Admit Patient
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="admitted" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                    <TabsTrigger value="admitted" className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Admitted ({admittedPatients.length})
                    </TabsTrigger>
                    <TabsTrigger value="discharged" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Discharged ({dischargedPatients.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="admitted">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {admittedPatients.length > 0 ? admittedPatients.map(p => (
                            <InPatientCard
                                key={p.id}
                                patient={p}
                                onSendWhatsApp={initWhatsApp}
                                onEdit={() => openEditModal(p)}
                                onDischarge={() => openDischargeModal(p)}
                            />
                        )) : (
                            <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-medium text-muted-foreground">No patients currently admitted</h3>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="discharged">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dischargedPatients.length > 0 ? dischargedPatients.map(p => (
                            <InPatientCard
                                key={p.id}
                                patient={p}
                                onSendWhatsApp={initWhatsApp}
                                onEdit={() => openEditModal(p)}
                                onPrint={() => p.discharge_summary && triggerPrint(p.discharge_summary)}
                            />
                        )) : (
                            <EmptyState icon={History} message="No discharge history found" />
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- MODALS --- */}

            {/* 1. Admission Modal */}
            <Dialog open={isAdmitModalOpen} onOpenChange={setIsAdmitModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>New Patient Admission</DialogTitle>
                        <DialogDescription>Search for a patient and enter admission details.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Search Patient (Name/Phone)</Label>
                            <Input
                                placeholder="Type at least 3 chars..."
                                value={patientSearch}
                                onChange={(e) => {
                                    setPatientSearch(e.target.value);
                                    setSelectedPatientId(null);
                                }}
                            />
                            {searchPatients && searchPatients.length > 0 && !selectedPatientId && (
                                <div className="border rounded-md mt-1 divide-y max-h-32 overflow-y-auto">
                                    {searchPatients.map(p => (
                                        <div
                                            key={p.id}
                                            className={cn(
                                                "p-2 cursor-pointer hover:bg-muted transition-colors flex justify-between items-center",
                                                selectedPatientId === p.id && "bg-primary/10 border-l-4 border-primary"
                                            )}
                                            onClick={() => {
                                                setSelectedPatientId(p.id);
                                                setPatientSearch(p.name);
                                            }}
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
                            <Input
                                type="date"
                                value={admissionData.admission_date}
                                onChange={(e) => setAdmissionData({ ...admissionData, admission_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Room / Bed Number (Optional)</Label>
                            <Input
                                placeholder="e.g. 101-A"
                                value={admissionData.room_number}
                                onChange={(e) => setAdmissionData({ ...admissionData, room_number: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Diagnosis</Label>
                            <Input
                                placeholder="Clinical diagnosis..."
                                value={admissionData.diagnosis}
                                onChange={(e) => setAdmissionData({ ...admissionData, diagnosis: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Procedure Plan</Label>
                            <Textarea
                                placeholder="Procedure details..."
                                value={admissionData.procedure}
                                onChange={(e) => setAdmissionData({ ...admissionData, procedure: e.target.value })}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Procedure Date (Optional)</Label>
                            <Input
                                type="date"
                                value={admissionData.procedure_date}
                                onChange={(e) => setAdmissionData({ ...admissionData, procedure_date: e.target.value })}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Patient Details</DialogTitle>
                    </DialogHeader>
                    <EditPatientForm
                        patient={selectedPatientForEdit}
                        onSubmit={(data: any) => editMutation.mutate({ ...data, id: selectedPatientForEdit?.id })}
                        isSaving={editMutation.isPending}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* 3. Discharge Modal */}
            <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
                    <div className="flex justify-between items-center px-6 py-4 border-b">
                        <div className="space-y-1">
                            <DialogTitle>Discharge Process</DialogTitle>
                            <DialogDescription>Review and complete discharge summary.</DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 mr-10">
                            <LanguageSwitcher />
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
                            onSubmit={(summary) => dischargeMutation.mutate({
                                id: selectedPatientForDischarge.id,
                                summary,
                                language: i18n.language // Pass current language
                            })}
                            isSaving={dischargeMutation.isPending}
                            onPrint={(summary: DischargeSummary) => {
                                setPrintData(summary);
                                setIsReadyToPrint(true);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Hidden Print Component */}
            <div style={{ display: 'none' }}>
                {printData && (
                    <DischargeSummaryPrint
                        ref={printRef}
                        patientSnapshot={printData.patient_snapshot}
                        courseDetails={printData.course_details}
                        dischargeData={printData.discharge_data}
                        language={i18n.language}
                        logoUrl="/images/logos/logo.png"
                    />
                )}
            </div>

            {/* 4. WhatsApp Modal */}
            <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send WhatsApp Message</DialogTitle>
                        <DialogDescription>Review and edit the message before sending.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2 block">Message Preview</Label>
                        <Textarea
                            value={whatsAppMessage}
                            onChange={(e) => setWhatsAppMessage(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (selectedPatientForWhatsApp) {
                                    sendWhatsAppMutation.mutate({
                                        phone: selectedPatientForWhatsApp.patient.phone,
                                        message: whatsAppMessage
                                    });
                                }
                            }}
                            disabled={sendWhatsAppMutation.isPending}
                        >
                            {sendWhatsAppMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Send className="w-4 h-4 mr-2" />
                            Send Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

const EditPatientForm = ({ patient, onSubmit, isSaving, onCancel }: any) => {
    const [data, setData] = useState({
        diagnosis: patient?.diagnosis || '',
        procedure: patient?.procedure || '',
        admission_date: patient?.admission_date ? patient.admission_date.split('T')[0] : '',
        procedure_date: patient?.procedure_date ? patient.procedure_date.split('T')[0] : '',
        room_number: patient?.room_number || '',
    });

    if (!patient) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Admission Date</Label>
                    <Input type="date" value={data.admission_date} onChange={e => setData({ ...data, admission_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Room / Bed</Label>
                    <Input value={data.room_number || ''} onChange={e => setData({ ...data, room_number: e.target.value })} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Diagnosis</Label>
                <Input value={data.diagnosis} onChange={e => setData({ ...data, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Procedure</Label>
                <Textarea value={data.procedure} onChange={e => setData({ ...data, procedure: e.target.value })} />
            </div>
            <div className="space-y-2">
                <Label>Procedure Date</Label>
                <Input type="date" value={data.procedure_date} onChange={e => setData({ ...data, procedure_date: e.target.value })} />
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
// --- Discharge Form with Medication Manager ---
const DischargeForm = forwardRef<{ print: () => void }, {
    patient: InPatient | null,
    onSubmit: (d: DischargeSummary) => void,
    isSaving: boolean,
    onPrint?: (d: DischargeSummary) => void
}>(({ patient, onSubmit, isSaving, onPrint }, ref) => {
    const [activeTab, setActiveTab] = useState("demographics");
    const { i18n } = useTranslation();

    // -- Data State --
    const [snapshot, setSnapshot] = useState({
        id: '',
        name: '',
        dob: '',
        sex: '',
        phone: '',
        age: '' as number | '',
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

    const [discharge, setDischarge] = useState({
        medications: [] as Medication[],
        post_op_care: '',
        review_date: '',
        clinical_notes: '',
    });

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

    // -- Queries for Meds & Shortcuts --
    const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
    const [textShortcuts, setTextShortcuts] = useState<any[]>([]);
    const [autofillKeywords, setAutofillKeywords] = useState<AutofillProtocol[]>([]);

    const fetchSavedMedications = async () => {
        const { data } = await supabase.from('saved_medications').select('*').order('name');
        if (data) {
            const mappedData = data.map((item: any) => ({
                ...item,
                name: item.name || '',
                dose: item.dose || '',
                frequency: item.frequency || '',
                duration: item.duration || '',
                instructions: item.instructions || '',
                notes: item.notes || '',
                freqMorning: item.freq_morning || '',
                freqNoon: item.freq_noon || '',
                freqNight: item.freq_night || ''
            }));
            setSavedMedications(mappedData as Medication[]);
        }
    };
    const fetchTextShortcuts = async () => {
        const { data } = await supabase.from('text_shortcuts').select('*');
        if (data) setTextShortcuts(data);
    };
    const fetchAutofillKeywords = async () => {
        const { data } = await supabase.from('autofill_keywords').select('*');
        if (data) setAutofillKeywords(data as unknown as AutofillProtocol[]);
    };


    React.useEffect(() => {
        fetchSavedMedications();
        fetchTextShortcuts();
        fetchAutofillKeywords();
    }, []);


    // -- Autofill on mount --
    React.useEffect(() => {
        if (patient) {
            // Check if there is an existing discharge summary to load
            if (patient.discharge_summary) {
                const s = patient.discharge_summary;
                const calculatedAge = s.patient_snapshot.dob ? calculateAge(new Date(s.patient_snapshot.dob)) : '';
                setSnapshot({
                    ...s.patient_snapshot,
                    age: (s.patient_snapshot as any).age || calculatedAge || ''
                });
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
                        name: m.name || '',
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
                    clinical_notes: s.discharge_data.clinical_notes || ''
                });
            } else {
                // Initialize from Admission Record
                const calculatedAge = patient.patient.dob ? calculateAge(new Date(patient.patient.dob)) : '';
                setSnapshot({
                    id: patient.id,
                    name: patient.patient.name,
                    dob: patient.patient.dob || '',
                    sex: patient.patient.sex || '',
                    phone: patient.patient.phone,
                    age: calculatedAge,
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
                    clinical_notes: ''
                });
            }
        }
    }, [patient]);


    // -- Med Handlers --
    const handleMedChange = (index: number, field: keyof Medication, value: any, cursorPosition?: number | null) => {
        setDischarge(prev => {
            const newMeds = [...prev.medications];
            // Text shortcuts
            if (typeof value === 'string' && (field === 'name' || field === 'dose' || field === 'frequency' || field === 'duration' || field === 'instructions' || field === 'notes')) {
                const processed = processTextShortcuts(value, cursorPosition || value.length, textShortcuts);
                if (processed) {
                    newMeds[index] = { ...newMeds[index], [field]: processed.newValue };
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
    };

    const addMedication = () => {
        const newMed: Medication = {
            id: crypto.randomUUID(),
            name: '', dose: '', frequency: '', duration: '', instructions: '', notes: '',
            freqMorning: false, freqNoon: false, freqNight: false
        };
        setDischarge(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
    };

    const removeMedication = (index: number) => {
        setDischarge(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== index) }));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setDischarge((prev) => {
                const oldIndex = prev.medications.findIndex((m) => m.id === active.id);
                const newIndex = prev.medications.findIndex((m) => m.id === over?.id);
                return {
                    ...prev,
                    medications: arrayMove(prev.medications, oldIndex, newIndex),
                };
            });
        }
    };

    const handleMedicationSuggestionClick = (med: Medication) => {
        const isTelugu = i18n.language === 'te';
        const newMed: Medication = {
            id: crypto.randomUUID(),
            name: med.name || '',
            dose: med.dose || '',
            freqMorning: med.freqMorning || false,
            freqNoon: med.freqNoon || false,
            freqNight: med.freqNight || false,
            frequency: (isTelugu && med.frequency_te) ? med.frequency_te : (med.frequency || ''),
            duration: (isTelugu && med.duration_te) ? med.duration_te : (med.duration || ''),
            instructions: (isTelugu && med.instructions_te) ? med.instructions_te : (med.instructions || ''),
            notes: (isTelugu && med.notes_te) ? med.notes_te : (med.notes || '')
        };
        setDischarge(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
    };

    // -- Generic Shortcut Handler for TextAreas --
    const handleTextChange = (field: 'operation_notes' | 'post_op_care' | 'clinical_notes', value: string, cursorPosition?: number) => {
        const processed = processTextShortcuts(value, cursorPosition || value.length, textShortcuts);

        // Helper to update state based on field
        if (field === 'operation_notes') {
            if (processed) {
                setCourse(prev => ({ ...prev, operation_notes: processed.newValue }));
                // Note: managing ref cursor for textareas in tabs requires refs for each. 
                // For simplicity in this iteration, we process the update. 
                // In a full implementation we'd need refs for these textareas too to restore cursor.
            } else {
                setCourse(prev => ({ ...prev, operation_notes: value }));
            }
        } else {
            if (processed) {
                setDischarge(prev => ({ ...prev, [field]: processed.newValue }));
            } else {
                setDischarge(prev => ({ ...prev, [field]: value }));
            }
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
        const currentNames = new Set(discharge.medications.map(m => m.name.toLowerCase()));

        return {
            suggestedMedications: meds.filter(m => !currentNames.has(m.name.toLowerCase()))
        };
    }, [course.diagnosis, course.procedure, autofillKeywords, savedMedications, discharge.medications]);


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
        discharge_data: discharge
    });

    useImperativeHandle(ref, () => ({
        print: () => {
            if (onPrint) onPrint(buildSummary());
        }
    }));

    const handleSubmit = () => {
        onSubmit(buildSummary());
    };

    if (!patient) return null;

    return (
        <div className="flex flex-col h-full gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="demographics">1. Demographics</TabsTrigger>
                    <TabsTrigger value="course">2. Course Details</TabsTrigger>
                    <TabsTrigger value="discharge">3. Plan & Medications</TabsTrigger>
                </TabsList>

                <div className="flex-grow mt-4">
                    {/* Tab 1: Demographics */}
                    <TabsContent value="demographics" className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-lg border border-primary/20">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                                <User className="w-4 h-4" /> Patient Snapshot
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
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
                                        <Input type="date" value={snapshot.dob} onChange={handleDobChange} />
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
                    <TabsContent value="course" className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-lg border border-primary/20">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
                                <ClipboardList className="w-4 h-4" /> Hospital Course
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Diagnosis</Label>
                                    <Input value={course.diagnosis} onChange={e => setCourse({ ...course, diagnosis: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Procedure Performed</Label>
                                    <Textarea value={course.procedure} onChange={e => setCourse({ ...course, procedure: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Admission Date</Label>
                                    <Input type="date" value={course.admission_date} onChange={e => setCourse({ ...course, admission_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Procedure Date</Label>
                                    <Input type="date" value={course.procedure_date} onChange={e => setCourse({ ...course, procedure_date: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Operation Notes / Intro</Label>
                                    <Textarea
                                        placeholder="Tourniquet time, findings, implants used..."
                                        value={course.operation_notes}
                                        onChange={e => handleTextChange('operation_notes', e.target.value, e.target.selectionStart)}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Review Date</Label>
                                    <Input type="date" value={discharge.review_date} onChange={e => setDischarge({ ...discharge, review_date: e.target.value })} />
                                </div>
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
                                    i18n={{ language: i18n.language }}
                                    medFrequencyRefs={medFrequencyRefs}
                                    medDurationRefs={medDurationRefs}
                                    medInstructionsRefs={medInstructionsRefs}
                                    medNotesRefs={medNotesRefs}
                                    suggestedMedications={suggestedMedications} // Pass parsed suggestions
                                    handleMedicationSuggestionClick={handleMedicationSuggestionClick}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Post-Op Care / Advice</Label>
                                <Textarea
                                    placeholder="Care instructions..."
                                    value={discharge.post_op_care}
                                    onChange={e => handleTextChange('post_op_care', e.target.value, e.target.selectionStart)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Additional Clinical Notes / Summary</Label>
                                <Textarea
                                    placeholder="Summary of hospital stay..."
                                    value={discharge.clinical_notes}
                                    onChange={e => handleTextChange('clinical_notes', e.target.value, e.target.selectionStart)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between mt-4 pt-4 border-t sticky bottom-0 bg-background">
                            <Button variant="outline" onClick={() => setActiveTab("course")}>Back</Button>
                            <Button onClick={handleSubmit} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Finalize Discharge
                            </Button>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
});
DischargeForm.displayName = "DischargeForm";

const InPatientCard = ({ patient, onSendWhatsApp, onEdit, onDischarge, onPrint }: {
    patient: InPatient;
    onSendWhatsApp: (p: InPatient, type: 'pre-op' | 'post-op' | 'rehab') => void;
    onEdit?: () => void;
    onDischarge?: () => void;
    onPrint?: () => void;
}) => {

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
                {onEdit && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        {onPrint && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPrint} title="Print Summary">
                                <Printer className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} title="Edit Record">
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <div className="flex justify-between items-start pr-6">
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
                    {isDischarged && <Badge variant="secondary">Discharged</Badge>}
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
                                        <li key={i}>{m.name} - {m.frequency} x {m.duration}</li>
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
                {!isDischarged && (
                    <div className="pt-3 flex flex-col gap-2 mt-auto">
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'pre-op')}>
                                Pre-Op
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'post-op')}>
                                Post-Op
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-[10px] px-1" onClick={() => onSendWhatsApp(patient, 'rehab')}>
                                Rehab
                            </Button>
                        </div>

                        {onDischarge && (
                            <Button variant="destructive" size="sm" className="w-full" onClick={onDischarge}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Discharge Patient
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default InPatientManagement;
