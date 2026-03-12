import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, ArrowLeft, BookOpen, Loader2, Printer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SurgicalConsentTemplate } from '@/types/inPatients';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import RichTextEditor from '@/components/RichTextEditor';
import { CONSENT_RISKS } from '@/utils/consentConstants';
import { useReactToPrint } from 'react-to-print';
import { ConsentTemplatePrint } from './ConsentTemplatePrint';
import { useRef } from 'react';

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
    const [printingTemplate, setPrintingTemplate] = useState<SurgicalConsentTemplate | null>(null);
    const queryClient = useQueryClient();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrintLaunch = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Consent_${printingTemplate?.name || 'Template'}`,
    });

    const handlePrint = (template: SurgicalConsentTemplate) => {
        setPrintingTemplate(template);
        // Small timeout to ensure the print component has rendered with new data
        setTimeout(() => {
            handlePrintLaunch();
        }, 150);
    };

    useEffect(() => {
        if (!isOpen) {
            setViewMode('list');
            setEditingTemplate(null);
        }
    }, [isOpen]);

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
            <DialogContent className="w-[95vw] sm:w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
                <DialogHeader className="flex-row items-center justify-between p-4 md:p-6 pb-0 md:pb-0 border-b">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg hidden sm:block">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Consent Templates</DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm">
                                Standard Procedure Risk Templates
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

                <div className="flex-1 overflow-hidden p-4 md:p-6">
                    {viewMode === 'list' ? (
                        <ScrollArea className="h-full pr-0 sm:pr-4">
                            {isLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                                    Loading templates...
                                </div>
                            ) : templates?.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                                    <h3 className="font-semibold text-lg mb-2">No templates found</h3>
                                    <Button onClick={() => {
                                        setEditingTemplate({
                                            name: '',
                                            risks_procedure_en: CONSENT_RISKS.en.procedure_placeholder,
                                            risks_procedure_te: CONSENT_RISKS.te.procedure_placeholder
                                        });
                                        setViewMode('edit');
                                    }} className="rounded-full px-8">Create First Template</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {templates?.map(template => (
                                        <div key={template.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all gap-4 bg-card shadow-sm">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-base">{template.name}</h4>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                                                    Saved {new Date(template.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 border" onClick={() => handlePrint(template)} title="Print Offline Consent">
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 border" onClick={() => {
                                                    setEditingTemplate(template);
                                                    setViewMode('edit');
                                                }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 text-destructive hover:bg-destructive hover:text-white border-destructive/20" onClick={() => handleDelete(template.id, template.name)}>
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

            {/* Hidden Print Content */}
            <div className="hidden">
                {printingTemplate && (
                    <ConsentTemplatePrint 
                        ref={printRef}
                        template={printingTemplate} 
                    />
                )}
            </div>
        </Dialog>
    );
};
