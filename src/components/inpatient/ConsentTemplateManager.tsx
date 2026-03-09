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
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SurgicalConsentTemplate } from '@/types/inPatients';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import RichTextEditor from '@/components/RichTextEditor';
import { CONSENT_RISKS } from '@/utils/consentConstants';

interface ConsentTemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ConsentTemplateManager: React.FC<ConsentTemplateManagerProps> = ({
    isOpen,
    onClose
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [editingTemplate, setEditingTemplate] = useState<Partial<SurgicalConsentTemplate> | null>(null);
    const queryClient = useQueryClient();

    const { data: templates, isLoading } = useQuery({
        queryKey: ['surgical-consent-templates-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('surgical_consent_templates')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as SurgicalConsentTemplate[];
        },
        enabled: isOpen
    });

    const createMutation = useMutation({
        mutationFn: async (template: Partial<SurgicalConsentTemplate>) => {
            const payload = { ...template };
            if (!payload.id) {
                delete payload.id;
            }

            const { data, error } = await supabase
                .from('surgical_consent_templates')
                .upsert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surgical-consent-templates-all'] });
            toast.success("Template saved successfully");
            setViewMode('list');
            setEditingTemplate(null);
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('surgical_consent_templates')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surgical-consent-templates-all'] });
            toast.success("Template deleted successfully");
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleSave = () => {
        if (!editingTemplate?.name?.trim()) {
            toast.error("Template name is required");
            return;
        }
        createMutation.mutate(editingTemplate);
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete template "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-4 md:p-6">
                <DialogHeader className="flex-row items-center justify-between pr-8">
                    <div className="flex items-center gap-4">
                        <div>
                            <DialogTitle>Manage Consent Templates</DialogTitle>
                            <DialogDescription>
                                Create and edit standard dual-language risk templates for procedures.
                            </DialogDescription>
                        </div>
                    </div>
                    {viewMode === 'list' && (
                        <Button size="icon" variant="ghost" onClick={() => {
                            setEditingTemplate({
                                name: '',
                                risks_procedure_en: CONSENT_RISKS.en.procedure_placeholder,
                                risks_procedure_te: CONSENT_RISKS.te.procedure_placeholder
                            });
                            setViewMode('edit');
                        }} title="New Template">
                            <Plus className="h-5 w-5 text-primary" />
                        </Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
                    {viewMode === 'list' ? (
                        <ScrollArea className="h-full pr-4">
                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
                            ) : templates?.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <h3 className="font-medium text-lg mb-2">No templates found</h3>
                                    <Button onClick={() => {
                                        setEditingTemplate({
                                            name: '',
                                            risks_procedure_en: CONSENT_RISKS.en.procedure_placeholder,
                                            risks_procedure_te: CONSENT_RISKS.te.procedure_placeholder
                                        });
                                        setViewMode('edit');
                                    }}>Create First Template</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates?.map(template => (
                                        <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                            <div>
                                                <h4 className="font-semibold">{template.name}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Created: {new Date(template.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    setEditingTemplate(template);
                                                    setViewMode('edit');
                                                }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template.id, template.name)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto space-y-6 px-1 pb-4">
                                <div className="space-y-2">
                                    <Label>Procedure Name (Template Name)</Label>
                                    <Input
                                        value={editingTemplate?.name || ''}
                                        onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value })}
                                        placeholder="e.g. ACL Reconstruction"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Procedure Specific Risks (English)</Label>
                                    <RichTextEditor
                                        content={editingTemplate?.risks_procedure_en || ''}
                                        onChange={content => setEditingTemplate(prev => prev ? { ...prev, risks_procedure_en: content } : { risks_procedure_en: content })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Procedure Specific Risks (Telugu)</Label>
                                    <RichTextEditor
                                        content={editingTemplate?.risks_procedure_te || ''}
                                        onChange={content => setEditingTemplate(prev => prev ? { ...prev, risks_procedure_te: content } : { risks_procedure_te: content })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t flex justify-between">
                                <Button variant="outline" onClick={() => {
                                    setViewMode('list');
                                    setEditingTemplate(null);
                                }}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button onClick={handleSave} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Saving...' : 'Save Template'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
