import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, CheckCircle2, Clock, Eye, Printer, Trash2, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { InPatient, SurgicalConsent } from '@/types/inPatients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SurgicalConsentForm } from './SurgicalConsentForm';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface ConsentManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: InPatient | null;
}

export const ConsentManagementModal: React.FC<ConsentManagementModalProps> = ({
    isOpen,
    onClose,
    patient
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
    const [selectedConsent, setSelectedConsent] = useState<SurgicalConsent | null>(null);
    const queryClient = useQueryClient();

    // Reset state when modal closes to prevent stale data when switching patients
    React.useEffect(() => {
        if (!isOpen) {
            setViewMode('list');
            setSelectedConsent(null);
        }
    }, [isOpen]);

    const { data: consents, isLoading } = useQuery({
        queryKey: ['surgical-consents', patient?.id],
        queryFn: async () => {
            if (!patient) return [];
            const { data, error } = await supabase
                .from('surgical_consents')
                .select('*')
                .eq('in_patient_id', patient.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as SurgicalConsent[];
        },
        enabled: !!patient && isOpen
    });

    const createMutation = useMutation({
        mutationFn: async ({ data, shouldClose = true }: { data: Partial<SurgicalConsent>, shouldClose?: boolean }) => {
            // Sanitize payload: remove id if it is null/undefined so DB generates it
            const payload = { ...data };
            if (!payload.id) {
                delete payload.id;
            }

            const { data: saved, error } = await supabase
                .from('surgical_consents')
                .upsert([payload])
                .select()
                .single();

            if (error) throw error;
            return { shouldClose, saved };
        },
        onSuccess: ({ shouldClose, saved }) => {
            queryClient.invalidateQueries({ queryKey: ['surgical-consents'] });
            if (shouldClose) {
                toast.success("Consent saved successfully");
                setViewMode('list');
            } else {
                if (saved) setSelectedConsent(saved); // Update selected consent so form has ID
            }
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleCreate = async (data: Partial<SurgicalConsent>, shouldClose: boolean = true) => {
        return createMutation.mutateAsync({ data, shouldClose });
    };

    const deleteMutation = useMutation({
        mutationFn: async (consentId: string) => {
            const { error } = await supabase
                .from('surgical_consents')
                .delete()
                .eq('id', consentId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surgical-consents'] });
            toast.success("Consent deleted successfully");
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleDelete = (consent: SurgicalConsent) => {
        if (window.confirm(`Are you sure you want to delete the consent for "${consent.procedure_name}"?`)) {
            deleteMutation.mutate(consent.id);
        }
    };

    const handleView = (consent: SurgicalConsent) => {
        setSelectedConsent(consent);
        setViewMode('view');
    };

    const handlePrint = (consent: SurgicalConsent) => {
        // Open the public verification page in a new tab for printing
        // This ensures a clean, standalone document view
        const url = `${window.location.origin}/consent-verify/${consent.id}`;
        window.open(url, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
                <DialogHeader className="flex-row items-center justify-between p-4 md:p-6 pb-0 md:pb-0 border-b">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg hidden sm:block">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Surgical Consents</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm">
                                Manage consents for {patient?.patient.name}
                            </DialogDescription>
                        </div>
                    </div>
                    {viewMode === 'list' && (
                        <Button size="icon" variant="ghost" onClick={() => setViewMode('create')} title="New Consent">
                            <Plus className="h-5 w-5 text-primary" />
                        </Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-4 md:p-6">
                    {viewMode === 'list' ? (
                        <ScrollArea className="h-full pr-0 sm:pr-4">
                            {isLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                                    Loading consents...
                                </div>
                            ) : consents?.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                                    <h3 className="font-semibold text-lg">No consents found</h3>
                                    <p className="text-muted-foreground mb-6 text-sm max-w-[250px] mx-auto">Create a standard surgical consent for this patient to sign digitally.</p>
                                    <Button onClick={() => setViewMode('create')} className="rounded-full px-8">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create First Consent
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {consents?.map(consent => (
                                        <div key={consent.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all gap-4 bg-card shadow-sm">
                                            <div className="flex items-start gap-4 w-full sm:w-auto">
                                                <div className={cn(
                                                    "p-3 rounded-full flex-shrink-0",
                                                    consent.consent_status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                                )}>
                                                    {consent.consent_status === 'signed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-base line-clamp-1">{consent.procedure_name}</h4>
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                            <Calendar className="w-3 h-3" />
                                                            Surgery: {new Date(consent.surgery_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                                                            Created {new Date(consent.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                {consent.consent_status === 'pending' ? (
                                                    <Button variant="default" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={() => {
                                                        setSelectedConsent(consent);
                                                        setViewMode('create');
                                                    }}>
                                                        <FileText className="w-4 h-4 mr-2" /> Resume
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9 border" onClick={() => handleView(consent)}>
                                                        <Eye className="w-4 h-4 mr-2" /> View
                                                    </Button>
                                                )}

                                                {consent.consent_status === 'signed' && (
                                                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={() => handlePrint(consent)}>
                                                        <Printer className="w-4 h-4 mr-2" /> Print
                                                    </Button>
                                                )}

                                                {consent.consent_status === 'pending' && (
                                                    <Button variant="outline" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 text-destructive hover:bg-destructive hover:text-white border-destructive/20" onClick={() => handleDelete(consent)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    ) : (
                        <SurgicalConsentForm
                            key={viewMode}
                            patient={patient!}
                            onSave={handleCreate}
                            onCancel={() => {
                                setViewMode('list');
                                setSelectedConsent(null);
                            }}
                            initialData={selectedConsent || undefined}
                            isReadOnly={viewMode === 'view'}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
