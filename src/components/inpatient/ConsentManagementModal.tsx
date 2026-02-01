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
import { Plus, FileText, CheckCircle2, Clock, Eye, Printer } from 'lucide-react';
import { InPatient, SurgicalConsent } from '@/types/inPatients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SurgicalConsentForm } from './SurgicalConsentForm';
import { toast } from 'sonner';

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
            const { data: saved, error } = await supabase
                .from('surgical_consents')
                .upsert([data])
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

    const handleView = (consent: SurgicalConsent) => {
        setSelectedConsent(consent);
        setViewMode('view');
    };

    const handlePrint = (consent: SurgicalConsent) => {
        // Basic print for now - we might want a dedicated print component later
        // For MVP, open a new window or use a print component in 'view' mode.
        // Let's just toast for now or maybe rely on the view mode's potential print button if added.
        // Actually, let's open the view mode and maybe user can print from browser for now.
        handleView(consent);
        setTimeout(() => window.print(), 500);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-8">
                        <div>
                            <DialogTitle>Surgical Consents</DialogTitle>
                            <DialogDescription>
                                Manage consents for {patient?.patient.name}
                            </DialogDescription>
                        </div>
                        {viewMode === 'list' && (
                            <Button size="sm" onClick={() => setViewMode('create')}>
                                <Plus className="mr-2 h-4 w-4" /> New Consent
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
                    {viewMode === 'list' ? (
                        <ScrollArea className="h-full pr-4">
                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading...</div>
                            ) : consents?.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                                    <h3 className="font-medium text-lg">No consents found</h3>
                                    <p className="text-muted-foreground mb-4">Create a new surgical consent for this patient.</p>
                                    <Button onClick={() => setViewMode('create')}>Create Consent</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {consents?.map(consent => (
                                        <div key={consent.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-full ${consent.consent_status === 'signed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {consent.consent_status === 'signed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{consent.procedure_name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Date: {new Date(consent.surgery_date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Created: {new Date(consent.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {consent.consent_status === 'pending' ? (
                                                    <Button variant="default" size="sm" onClick={() => {
                                                        setSelectedConsent(consent);
                                                        setViewMode('create'); // Reuse create mode for editing
                                                    }}>
                                                        <FileText className="w-4 h-4 mr-2" /> Resume
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" onClick={() => handleView(consent)}>
                                                        <Eye className="w-4 h-4 mr-2" /> View
                                                    </Button>
                                                )}

                                                {consent.consent_status === 'signed' && (
                                                    <Button variant="outline" size="sm" onClick={() => handlePrint(consent)}>
                                                        <Printer className="w-4 h-4 mr-2" /> Print
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
