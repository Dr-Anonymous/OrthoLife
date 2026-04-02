import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, ArrowLeft, Loader2, Printer, X, Calendar as CalendarIcon, Search, FileText, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OTNotesTemplate, InPatient } from '@/types/inPatients';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import RichTextEditor from '@/components/RichTextEditor';
import { useReactToPrint } from 'react-to-print';
import { OTNotesTemplatePrint } from './OTNotesTemplatePrint';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { calculateAge } from '@/lib/age';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


interface OTNotesTemplateContentProps {
    readonly?: boolean;
    initialPatient?: InPatient | null;
}

export const OTNotesTemplateContent: React.FC<OTNotesTemplateContentProps> = ({ readonly = false, initialPatient = null }) => {
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [editingTemplate, setEditingTemplate] = useState<Partial<OTNotesTemplate> | null>(null);
    const [printingTemplate, setPrintingTemplate] = useState<OTNotesTemplate | null>(null);
    const [printInfoModalOpen, setPrintInfoModalOpen] = useState(false);
    const [printInfo, setPrintInfo] = useState({
        patientName: '',
        patientAge: '',
        uhid: '',
        date: new Date().toISOString().split('T')[0],
        limbSide: 'N/A',
        implantMaterial: 'None/NA',
        fixationStatus: 'N/A'
    });
    const [isPrintDatePickerOpen, setIsPrintDatePickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [specData, setSpecData] = useState<Record<string, string>>({});
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const printRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const urlPatientId = searchParams.get('patient_id');
    const urlTemplateId = searchParams.get('template_id');

    const { data: templates, isLoading } = useQuery({
        queryKey: ['ot-notes-templates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ot_notes_templates')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as OTNotesTemplate[];
        }
    });

    const { data: remotePatient } = useQuery({
        queryKey: ['patient-by-id', urlPatientId],
        queryFn: async () => {
            if (!urlPatientId) return null;
            const { data, error } = await supabase
                .from('in_patients')
                .select('*, patient:patients(*)')
                .eq('id', urlPatientId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!urlPatientId && !initialPatient
    });

    const activePatient = initialPatient || remotePatient;

    useEffect(() => {
        if (viewMode === 'list' && !printInfoModalOpen) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, printInfoModalOpen]);

    // Deep link handler
    useEffect(() => {
        if (urlTemplateId && templates && activePatient && !printInfoModalOpen && !printingTemplate) {
            const found = templates.find(t => String(t.id) === String(urlTemplateId));
            if (found) {
                handlePrint(found, activePatient);
            }
        }
    }, [urlTemplateId, templates, activePatient]);

    useEffect(() => {
        if (focusedIndex >= 0 && filteredTemplates?.[focusedIndex]) {
            const el = document.getElementById(`template-${filteredTemplates[focusedIndex].id}`);
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusedIndex]);

    const handlePrintLaunch = useReactToPrint({
        contentRef: printRef,
        documentTitle: `OTNote_${printingTemplate?.name || 'Template'}`,
        onAfterPrint: () => {
            setPrintingTemplate(null);
        }
    });

    const handlePrint = (template: OTNotesTemplate, p: any = activePatient) => {
        const age = p?.patient?.dob ? calculateAge(new Date(p.patient.dob)).toString() : '';
        setPrintInfo({
            patientName: p?.patient?.name || '',
            patientAge: age,
            uhid: p?.patient?.uhid || '',
            date: p?.procedure_date || new Date().toISOString().split('T')[0],
            limbSide: 'N/A',
            implantMaterial: 'None/NA',
            fixationStatus: 'N/A'
        });
        setSpecData({});
        setPrintingTemplate(template);
        setPrintInfoModalOpen(true);
    };

    const confirmPrint = () => {
        setPrintInfoModalOpen(false);

        if (printingTemplate) {
            trackEvent({
                eventType: 'ot_note_template_print',
                path: window.location.pathname,
                user_phone: user?.phoneNumber,
                user_name: user?.displayName,
                details: {
                    template_id: printingTemplate.id,
                    template_name: printingTemplate.name,
                    patient_name: printInfo.patientName,
                    limb_side: printInfo.limbSide
                }
            });
        }

        setTimeout(() => {
            handlePrintLaunch();
        }, 200);
    };

    const filteredTemplates = templates?.filter(template => {
        const name = template.name.toLowerCase();
        const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        return queryWords.every(word => name.includes(word));
    });

    const getProcedureType = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('acl')) return 'ACL';
        if (lowerName.includes('tkr') || lowerName.includes('knee replacement')) return 'TKR';
        if (lowerName.includes('thr') || lowerName.includes('hip replacement')) return 'THR';
        if (lowerName.includes('spine') || lowerName.includes('acdf') || lowerName.includes('laminectomy')) return 'SPINE';
        if (lowerName.includes('plating') || lowerName.includes('orif') || lowerName.includes('fixation')) return 'TRAUMA';
        return 'GENERAL';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (viewMode !== 'list' || !filteredTemplates || filteredTemplates.length === 0 || printInfoModalOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => Math.min(prev + 1, filteredTemplates.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0) {
                handlePrint(filteredTemplates[focusedIndex]);
            }
        }
    };

    // Global listener for modal shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (printInfoModalOpen) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmPrint();
                } else if (e.key === 'Escape') {
                    setPrintInfoModalOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, [printInfoModalOpen, printInfo]);

    const createMutation = useMutation({
        mutationFn: async (template: Partial<OTNotesTemplate>) => {
            const payload = { ...template };
            if (!payload.id) {
                delete payload.id;
            }

            const { data, error } = await supabase
                .from('ot_notes_templates')
                .upsert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ot-notes-templates-all'] });
            toast.success("OT Note saved successfully");
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
                .from('ot_notes_templates')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ot-notes-templates-all'] });
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
        <div className="flex flex-col h-full overflow-hidden bg-background" onKeyDown={handleKeyDown}>
            <header className="flex items-center justify-between p-4 md:p-6 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg hidden sm:block">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">OT Notes Bank</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Operation Theater Note Templates
                        </p>
                    </div>
                </div>
                {viewMode === 'list' && !readonly && (
                    <Button size="icon" variant="ghost" onClick={() => {
                        setEditingTemplate({
                            name: '',
                            content: '<p>Diagnosis: </p><p>Procedure: </p><p>Findings: </p><p>Steps: </p>'
                        });
                        setViewMode('edit');
                    }} title="New OT Note Template">
                        <Plus className="h-5 w-5 text-primary" />
                    </Button>
                )}
            </header>

            <main className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col">
                {viewMode === 'list' ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="relative mb-6 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search OT note templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <ScrollArea className="flex-1 pr-0 sm:pr-4">
                            {isLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                                    Loading templates...
                                </div>
                            ) : filteredTemplates?.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                                    <h3 className="font-semibold text-lg mb-2">No OT notes found</h3>
                                    {!readonly && (
                                        <Button onClick={() => {
                                            setEditingTemplate({
                                                name: '',
                                                content: '<p>Diagnosis: </p><p>Procedure: </p><p>Findings: </p><p>Steps: </p>'
                                            });
                                            setViewMode('edit');
                                        }} className="rounded-full px-8">Create OT Note</Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 pb-4">
                                    {filteredTemplates?.map((template, index) => (
                                        <div
                                            key={template.id}
                                            id={`template-${template.id}`}
                                            className={cn(
                                                "flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all gap-4 bg-card shadow-sm cursor-pointer",
                                                focusedIndex === index && "ring-2 ring-primary ring-offset-2"
                                            )}
                                            onClick={() => handlePrint(template)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-base">{template.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                                                        Last Modified {template.updated_at ? format(new Date(template.updated_at), 'dd MMM yyyy') : 'Recently'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 border" onClick={() => handlePrint(template)} title="Print OT Note">
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                                {!readonly && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 border" onClick={() => {
                                                            setEditingTemplate(template);
                                                            setViewMode('edit');
                                                        }}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 border text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template.id!, template.name)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-6 pb-4">
                                <div className="space-y-2">
                                    <Label>Template Name (e.g. TKR Left)</Label>
                                    <Input
                                        value={editingTemplate?.name || ''}
                                        onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value })}
                                        placeholder="e.g. Arthroscopic ACL Reconstruction"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>OT Note Content</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Use tags like {"{{PatientName}}"}, {"{{LimbSide}}"}, {"{{ImplantMaterial}}"} for placeholders.</p>
                                    <RichTextEditor
                                        content={editingTemplate?.content || ''}
                                        onChange={content => setEditingTemplate(prev => prev ? { ...prev, content: content } : { content: content })}
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                        <div className="pt-4 border-t flex justify-between shrink-0">
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
            </main>

            {/* Hidden Print Content */}
            <div className="hidden">
                {printingTemplate && (
                    <OTNotesTemplatePrint
                        ref={printRef}
                        template={printingTemplate}
                        printInfo={printInfo}
                        specData={specData}
                    />
                )}
            </div>

            {/* Print Info Modal */}
            <Dialog open={printInfoModalOpen} onOpenChange={(open) => {
                setPrintInfoModalOpen(open);
                if (!open && urlPatientId) {
                    setSearchParams({}, { replace: true });
                }
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Fill OT Note Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="patientName" className="text-right">Name</Label>
                            <Input
                                id="patientName"
                                value={printInfo.patientName}
                                onChange={(e) => setPrintInfo({ ...printInfo, patientName: e.target.value })}
                                className="col-span-3"
                                placeholder="Patient Name"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="uhid" className="text-right">UHID</Label>
                            <Input
                                id="uhid"
                                value={printInfo.uhid}
                                onChange={(e) => setPrintInfo({ ...printInfo, uhid: e.target.value })}
                                className="col-span-3"
                                placeholder="Hospital ID"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="patientAge" className="text-right">Age</Label>
                            <Input
                                id="patientAge"
                                value={printInfo.patientAge}
                                onChange={(e) => setPrintInfo({ ...printInfo, patientAge: e.target.value })}
                                className="col-span-3"
                                placeholder="e.g. 45"
                            />
                        </div>
                        {printingTemplate && getProcedureType(printingTemplate.name) !== 'SPINE' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Limb Side</Label>
                                <div className="col-span-3">
                                    <Select value={printInfo.limbSide} onValueChange={(val) => setPrintInfo({ ...printInfo, limbSide: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Limb Side" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Left">Left</SelectItem>
                                            <SelectItem value="Right">Right</SelectItem>
                                            <SelectItem value="Bilateral">Bilateral</SelectItem>
                                            <SelectItem value="N/A">N/A</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Implant</Label>
                            <div className="col-span-3">
                                <Select value={printInfo.implantMaterial} onValueChange={(val) => setPrintInfo({ ...printInfo, implantMaterial: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Material" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Stainless Steel">Stainless Steel</SelectItem>
                                        <SelectItem value="Titanium">Titanium</SelectItem>
                                        <SelectItem value="Co-Cr (Cobalt Chrome)">Co-Cr</SelectItem>
                                        <SelectItem value="PEEK / Poly">PEEK / Poly</SelectItem>
                                        <SelectItem value="Ceramic">Ceramic</SelectItem>
                                        <SelectItem value="Bio-composite">Bio-composite (ACL)</SelectItem>
                                        <SelectItem value="PLLA / Bio-absorbable">PLLA / Bio-absorbable (ACL)</SelectItem>
                                        <SelectItem value="None/NA">None/NA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {(getProcedureType(printingTemplate?.name || '') === 'TKR' || getProcedureType(printingTemplate?.name || '') === 'THR') && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Fixation</Label>
                                <div className="col-span-3">
                                    <Select value={printInfo.fixationStatus} onValueChange={(val) => setPrintInfo({ ...printInfo, fixationStatus: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cemented">Cemented</SelectItem>
                                            <SelectItem value="Uncemented">Uncemented</SelectItem>
                                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                                            <SelectItem value="N/A">N/A</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right font-medium">Date</Label>
                            <div className="col-span-3">
                                <Popover open={isPrintDatePickerOpen} onOpenChange={setIsPrintDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !printInfo.date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {printInfo.date ? format(new Date(printInfo.date), "dd MMM yyyy") : <span>Pick date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={printInfo.date ? new Date(printInfo.date) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setPrintInfo({ ...printInfo, date: format(date, "yyyy-MM-dd") });
                                                }
                                                setIsPrintDatePickerOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Surgical Specs Card (Dynamic) */}
                        {printingTemplate && getProcedureType(printingTemplate.name) !== 'GENERAL' && (
                            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4" />
                                    Surgical Specifications ({getProcedureType(printingTemplate.name)})
                                </h4>

                                {getProcedureType(printingTemplate.name) === 'ACL' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Graft Type</Label>
                                            <Select value={specData.graftType} onValueChange={(v) => setSpecData({ ...specData, graftType: v })}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Graft" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Peroneus Longus">Peroneus Longus</SelectItem>
                                                    <SelectItem value="Hamstring">Hamstring</SelectItem>
                                                    <SelectItem value="BTB (Bone-Tendon-Bone)">BTB</SelectItem>
                                                    <SelectItem value="Quadriceps">Quadriceps</SelectItem>
                                                    <SelectItem value="LARS / Synthetic">Synthetic</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Graft Size (mm)</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                placeholder="e.g. 8.5"
                                                value={specData.graftSize || ''}
                                                onChange={(e) => setSpecData({ ...specData, graftSize: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {(getProcedureType(printingTemplate.name) === 'TKR' || getProcedureType(printingTemplate.name) === 'THR') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Femoral Size</Label>
                                            <Input className="h-8 text-xs" value={specData.femoralSize || ''} onChange={(e) => setSpecData({ ...specData, femoralSize: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Tibial/Acetabular Size</Label>
                                            <Input className="h-8 text-xs" value={specData.tibialSize || ''} onChange={(e) => setSpecData({ ...specData, tibialSize: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Insert/Poly (mm)</Label>
                                            <Input className="h-8 text-xs" value={specData.polySize || ''} onChange={(e) => setSpecData({ ...specData, polySize: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Cement</Label>
                                            <Select value={specData.cement} onValueChange={(v) => setSpecData({ ...specData, cement: v })}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cemented">Cemented</SelectItem>
                                                    <SelectItem value="Uncemented">Uncemented</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {getProcedureType(printingTemplate.name) === 'TRAUMA' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Plate Type</Label>
                                            <Input className="h-8 text-xs" placeholder="e.g. Locking Plate" value={specData.plateType || ''} onChange={(e) => setSpecData({ ...specData, plateType: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Number of Holes</Label>
                                            <Input className="h-8 text-xs" type="number" value={specData.plateHoles || ''} onChange={(e) => setSpecData({ ...specData, plateHoles: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Cortical Screws</Label>
                                            <Input className="h-8 text-xs" type="number" value={specData.corticalScrews || ''} onChange={(e) => setSpecData({ ...specData, corticalScrews: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Locking Screws</Label>
                                            <Input className="h-8 text-xs" type="number" value={specData.lockingScrews || ''} onChange={(e) => setSpecData({ ...specData, lockingScrews: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                {getProcedureType(printingTemplate.name) === 'SPINE' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Levels</Label>
                                            <Input className="h-8 text-xs" placeholder="e.g. L4-L5" value={specData.levels || ''} onChange={(e) => setSpecData({ ...specData, levels: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Rod Length (mm)</Label>
                                            <Input className="h-8 text-xs" placeholder="e.g. 40" value={specData.rodLength || ''} onChange={(e) => setSpecData({ ...specData, rodLength: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5 col-span-2">
                                            <Label className="text-xs">Pedicle Screws (count)</Label>
                                            <Input className="h-8 text-xs" type="number" value={specData.screwCount || ''} onChange={(e) => setSpecData({ ...specData, screwCount: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrintInfoModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmPrint}>Print Final Note</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
