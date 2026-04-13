
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Trash2, Plus, CheckCircle2, AlertTriangle, ChevronDown, FileUp, BrainCircuit, Loader2, X, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchedGuide, InvestigationReport } from '@/types/consultation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AutosuggestInput, { Suggestion } from '@/components/ui/AutosuggestInput';

interface ClinicalNotesFormProps {
    extraData: {
        complaints: string;
        medicalHistory: string;
        findings: string;
        investigations: string;
        diagnosis: string;
        procedure: string;
        advice: string;
        orthotics?: string;
        referred_to: string;
        referred_to_list?: string[];
        investigation_reports?: InvestigationReport[];
    };
    patientId?: string;
    onExtraChange: (field: string, value: any, cursorPosition?: number | null) => void;

    // Refs
    complaintsRef: React.RefObject<HTMLTextAreaElement>;
    medicalHistoryRef: React.RefObject<HTMLTextAreaElement>;
    findingsRef: React.RefObject<HTMLTextAreaElement>;
    investigationsRef: React.RefObject<HTMLTextAreaElement>;
    diagnosisRef: React.RefObject<HTMLTextAreaElement>;
    procedureRef: React.RefObject<HTMLTextAreaElement>;
    adviceRef: React.RefObject<HTMLTextAreaElement>;
    orthoticsRef: React.RefObject<HTMLTextAreaElement>;
    referredToRef: React.RefObject<any>; // Typings for AutosuggestInput ref might be tricky

    // Suggestions
    suggestedInvestigations: string[];
    suggestedAdvice: (string | { text: string; translatedText?: string })[];
    suggestedOrthotics: (string | { text: string; translatedText?: string })[];

    onInvestigationSuggestionClick: (val: string) => void;
    onAdviceSuggestionClick: (val: string | { text: string; translatedText?: string }) => void;
    onOrthoticsSuggestionClick: (val: string | { text: string; translatedText?: string }) => void;

    matchedGuides: MatchedGuide[];

    isProcedureExpanded: boolean;
    setIsProcedureExpanded: (val: boolean) => void;
    isReferredToExpanded: boolean;
    setIsReferredToExpanded: (val: boolean) => void;

    referralDoctors: { id: string, name: string, specialization?: string, address?: string, phone?: string }[];
    language: string;
    onLanguageChange: (lang: string) => void;
    initialData?: Partial<ClinicalNotesFormProps['extraData']>;
    isReadOnly?: boolean;
}


/**
 * ClinicalNotesForm Component
 * 
 * The core data entry form for the consultation.
 * Features:
 * - Textareas for Complaints, Findings, Diagnosis, Procedure, Advice.
 * - Integration with `AutosuggestInput` for "Referred To".
 * - Suggestion buttons (badges) for quick insertion of common text.
 * - Language switching support for Advice.
 * - Real-time guide matching display (Yellow/Green alerts).
 * - Collapsible sections for Procedure and Referred To.
 */
export const ClinicalNotesForm: React.FC<ClinicalNotesFormProps> = ({
    extraData,
    onExtraChange,
    complaintsRef,
    medicalHistoryRef,
    findingsRef,
    investigationsRef,
    diagnosisRef,
    procedureRef,
    adviceRef,
    orthoticsRef,
    referredToRef,
    suggestedInvestigations,
    suggestedAdvice,
    suggestedOrthotics,
    onInvestigationSuggestionClick,
    onAdviceSuggestionClick,
    onOrthoticsSuggestionClick,
    matchedGuides,
    isProcedureExpanded,
    setIsProcedureExpanded,
    isReferredToExpanded,
    setIsReferredToExpanded,
    referralDoctors,
    language,
    onLanguageChange,
    initialData,
    patientId,
    isReadOnly = false
}) => {
    const [uploadingReport, setUploadingReport] = React.useState<boolean>(false);
    const [generatingSummaryId, setGeneratingSummaryId] = React.useState<string | null>(null);
    const [pendingDeletions, setPendingDeletions] = React.useState<string[]>([]);
    const [labSuggestions, setLabSuggestions] = React.useState<any[]>([]);

    // Fetch lab data dynamically since it's in the public directory and can be refreshed
    React.useEffect(() => {
        const fetchLabData = async () => {
            try {
                const response = await fetch('/lab-data.json');
                if (response.ok) {
                    const data = await response.json();
                    if (data?.medicines) {
                        setLabSuggestions(data.medicines);
                    }
                }
            } catch (err) {
                console.error('Error fetching lab data suggestions:', err);
            }
        };
        fetchLabData();
    }, []);

    // We use a ref to track the last saved consultation ID to know when a "save" happened
    const lastSavedIdRef = React.useRef<string | number | null | undefined>(initialData?.investigation_reports ? 'initialized' : null);

    // Effect to handle actual deletions from Drive ONLY after a save is detected
    // We detect a "save" by checking if the current extraData.investigation_reports
    // is now the "initial" content (meaning saveChanges synced them)
    React.useEffect(() => {
        if (pendingDeletions.length === 0) return;

        // Check if the current report list in extraData matches the "initial" list
        // (meaning Consultation.tsx has completed its save/sync cycle)
        const currentReports = extraData.investigation_reports || [];
        const initialReports = initialData?.investigation_reports || [];
        
        const isSynced = JSON.stringify(currentReports) === JSON.stringify(initialReports);

        if (isSynced && lastSavedIdRef.current !== 'initialized') {
            console.log('Save detected, executing pending Drive deletions:', pendingDeletions);
            
            pendingDeletions.forEach(fileId => {
                supabase.functions.invoke('delete-file-from-drive', {
                    body: { fileId }
                }).catch(err => console.error('Delayed delete error:', err));
            });
            
            setPendingDeletions([]);
        }
        
        lastSavedIdRef.current = 'active';
    }, [extraData.investigation_reports, initialData?.investigation_reports, pendingDeletions]);

    const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !patientId) return;

        setUploadingReport(true);
        const reader = new FileReader();

        reader.onloadend = async () => {
            try {
                const fileContent = reader.result as string;
                const { data, error } = await supabase.functions.invoke('upload-file-to-drive', {
                    body: {
                        patientId,
                        fileName: file.name,
                        fileContent,
                        mimeType: file.type
                    }
                });

                if (error) throw error;

                const newReport: InvestigationReport = {
                    fileId: data.file.id,
                    fileName: file.name,
                    gist: '',
                    mimeType: file.type
                };

                const currentReports = extraData.investigation_reports || [];
                onExtraChange('investigation_reports', [...currentReports, newReport]);
                toast.success('Report uploaded successfully');
            } catch (error: any) {
                console.error('Upload error:', error);
                toast.error('Failed to upload report');
            } finally {
                setUploadingReport(false);
                // Reset input
                e.target.value = '';
            }
        };

        reader.readAsDataURL(file);
    };

    const generateAISummary = async (report: InvestigationReport, index: number) => {
        if (!report.fileId) return;

        setGeneratingSummaryId(report.fileId);
        try {
            const { data, error } = await supabase.functions.invoke('summarize-report', {
                body: {
                    fileId: report.fileId,
                    mimeType: report.mimeType
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            const newList = [...(extraData.investigation_reports || [])];
            newList[index] = { ...report, gist: data.summary };
            onExtraChange('investigation_reports', newList);
            toast.success('AI summary generated');
        } catch (error: any) {
            console.error('AI Summary error:', error);
            toast.error(error.message || 'Failed to generate summary');
        } finally {
            setGeneratingSummaryId(null);
        }
    };

    // Helper to determine if a field is autofilled (unchanged from initial) and highlighted
    const getStyle = (field: keyof ClinicalNotesFormProps['extraData'], value: any) => {
        if (!initialData) return "bg-background/50";

        const initialValue = (initialData as any)[field];
        // Check if value equals initial value AND value is not empty/falsy
        // We trim strings to be safe
        const isUnchanged = String(value).trim() === String(initialValue || '').trim();
        const hasContent = value && String(value).trim().length > 0;

        if (isUnchanged && hasContent) {
            return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
        }
        return "bg-background/50"; // Default style
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mt-4 mb-4 pb-2 border-b border-primary/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Clinical Notes</h3>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="complaints" className="text-sm font-medium">Complaints</Label>
                    <Textarea
                        ref={complaintsRef}
                        id="complaints"
                        value={extraData.complaints}
                        onChange={e => onExtraChange('complaints', e.target.value, e.target.selectionStart)}
                        placeholder="Patient complaints..."
                        className={cn("min-h-[100px]", getStyle('complaints', extraData.complaints))}
                        disabled={isReadOnly}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="medicalHistory" className="text-sm font-medium">Past History</Label>
                    <Textarea
                        ref={medicalHistoryRef}
                        id="medicalHistory"
                        value={extraData.medicalHistory}
                        onChange={e => onExtraChange('medicalHistory', e.target.value, e.target.selectionStart)}
                        placeholder="Previous history, chronic conditions..."
                        className={cn("min-h-[100px]", getStyle('medicalHistory', extraData.medicalHistory))}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                    <Textarea
                        ref={findingsRef}
                        id="findings"
                        value={extraData.findings}
                        onChange={e => onExtraChange('findings', e.target.value, e.target.selectionStart)}
                        placeholder="Clinical findings..."
                        className={cn("min-h-[100px]", getStyle('findings', extraData.findings))}
                        disabled={isReadOnly}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                    <Textarea
                        ref={diagnosisRef}
                        id="diagnosis"
                        value={extraData.diagnosis}
                        onChange={e => onExtraChange('diagnosis', e.target.value, e.target.selectionStart)}
                        placeholder="Clinical diagnosis..."
                        className={cn("min-h-[100px]", getStyle('diagnosis', extraData.diagnosis))}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                        {!isReadOnly && (!extraData.investigation_reports || extraData.investigation_reports.length === 0) && (
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 py-0 text-xs text-primary hover:bg-primary/10 flex items-center gap-1.5"
                                    disabled={uploadingReport}
                                    onClick={() => document.getElementById('report-upload')?.click()}
                                >
                                    {uploadingReport ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FileUp className="w-3.5 h-3.5 text-primary" />
                                    )}
                                    Attach Report
                                </Button>
                            </div>
                        )}
                        {suggestedInvestigations.map((investigation) => (
                            <Button key={investigation} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => onInvestigationSuggestionClick(investigation)} disabled={isReadOnly}>
                                {investigation}
                            </Button>
                        ))}
                    </div>
                    <div className="relative w-full">
                        <AutosuggestInput
                            ref={investigationsRef as any}
                            multiline
                            value={extraData.investigations}
                            onChange={(value, cursor) => onExtraChange('investigations', value, cursor)}
                            onSuggestionSelected={suggestion => {
                                const current = extraData.investigations;
                                const lines = current.split('\n');
                                
                                // Replace the LAST line (the one currently being typed) with the suggestion
                                // And add a newline to prepare for the NEXT entry
                                lines[lines.length - 1] = suggestion.name;
                                
                                onExtraChange('investigations', lines.join('\n') + '\n');
                            }}
                            suggestions={labSuggestions.map(m => ({
                                id: m.id,
                                name: m.name,
                                label: m.name,
                                searchTerms: m.category + ' ' + m.description
                            }))}
                            placeholder="Investigations required..."
                            inputProps={{
                                className: cn("min-h-[100px] w-full", getStyle('investigations', extraData.investigations))
                            }}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* Hidden File Input (Always present) */}
                {!isReadOnly && (
                    <input
                        id="report-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={handleReportUpload}
                        disabled={uploadingReport}
                    />
                )}

                {/* Investigation Reports Section (Only visible if reports present) */}
                {extraData.investigation_reports && extraData.investigation_reports.length > 0 && (
                    <div className="space-y-3 mt-4 p-4 border rounded-lg bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileUp className="w-5 h-5 text-primary" />
                                <h3 className="text-sm font-semibold">Attached Investigation Reports</h3>
                            </div>
                            {!isReadOnly && (
                                <div className="relative">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-2 bg-white"
                                        disabled={uploadingReport}
                                        onClick={() => document.getElementById('report-upload')?.click()}
                                    >
                                        {uploadingReport ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        Attach Report
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {extraData.investigation_reports.map((report, idx) => (
                                <div key={report.fileId || idx} className="bg-white p-3 rounded-md border shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="text-sm font-medium truncate max-w-[200px]">{report.fileName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                                                onClick={() => window.open(`https://drive.google.com/file/d/${report.fileId}/view`, '_blank')}
                                            >
                                                <Download className="w-3 h-3 mr-1" /> View
                                            </Button>
                                            {!isReadOnly && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive"
                                                    onClick={() => {
                                                        const confirmDelete = window.confirm(`Remove ${report.fileName} from this consultation?`);
                                                        if (!confirmDelete) return;

                                                        // Add to pending deletions for actual cleanup after save
                                                        if (report.fileId) {
                                                            setPendingDeletions(prev => [...prev, report.fileId]);
                                                        }

                                                        const newList = [...(extraData.investigation_reports || [])];
                                                        newList.splice(idx, 1);
                                                        onExtraChange('investigation_reports', newList);
                                                        
                                                        toast.info('Report removed from list. Changes will be permanent after saving.');
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Textarea
                                            value={report.gist}
                                            onChange={(e) => {
                                                const newList = [...(extraData.investigation_reports || [])];
                                                newList[idx] = { ...report, gist: e.target.value };
                                                onExtraChange('investigation_reports', newList);
                                            }}
                                            placeholder="Gist of report (e.g. Normal MRI, Fracture noted...)"
                                            className="text-xs min-h-[60px] pr-10"
                                            disabled={isReadOnly}
                                        />
                                        {!isReadOnly && (!report.gist || generatingSummaryId === report.fileId) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "absolute right-2 top-2 h-7 w-7 text-primary hover:bg-primary/10",
                                                    generatingSummaryId === report.fileId && "animate-pulse"
                                                )}
                                                onClick={() => generateAISummary(report, idx)}
                                                disabled={generatingSummaryId !== null}
                                                title="Summarize with AI"
                                            >
                                                {generatingSummaryId === report.fileId ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <BrainCircuit className="w-4 h-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label
                    htmlFor="procedure"
                    className="text-sm font-medium cursor-pointer hover:underline flex items-center gap-2"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsProcedureExpanded(!isProcedureExpanded);
                    }}
                >
                    Procedure Done
                    {(!isProcedureExpanded && !extraData.procedure) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                </Label>
                {(extraData.procedure || isProcedureExpanded) && (
                    <Textarea
                        ref={procedureRef}
                        id="procedure"
                        value={extraData.procedure}
                        onChange={e => onExtraChange('procedure', e.target.value, e.target.selectionStart)}
                        placeholder="Procedure done..."
                        className={cn("min-h-[80px]", getStyle('procedure', extraData.procedure))}
                        disabled={isReadOnly}
                        onBlur={() => {
                            if (!extraData.procedure || extraData.procedure.trim() === '') {
                                setIsProcedureExpanded(false);
                            }
                        }}
                    />
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>

                    {/* Controlled Language Switcher */}
                    <div className="flex items-center bg-muted rounded-md p-0.5 h-7">
                        <Button
                            type="button"
                            variant={language === 'en' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onLanguageChange('en')}
                            disabled={isReadOnly}
                        >
                            EN
                        </Button>
                        <Button
                            type="button"
                            variant={language === 'te' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onLanguageChange('te')}
                            disabled={isReadOnly}
                        >
                            తె
                        </Button>
                    </div>

                    {suggestedAdvice.map((advice) => {
                        const text = typeof advice === 'string' ? advice : advice.text;
                        return (
                            <Button key={text} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => onAdviceSuggestionClick(advice)} disabled={isReadOnly}>
                                {text}
                            </Button>
                        );
                    })}
                </div>
                <Textarea
                    ref={adviceRef}
                    id="advice"
                    value={extraData.advice}
                    onChange={e => onExtraChange('advice', e.target.value, e.target.selectionStart)}
                    placeholder="Medical advice..."
                    className={cn("min-h-[80px]", getStyle('advice', extraData.advice))}
                    disabled={isReadOnly}
                />

                {matchedGuides.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {matchedGuides.map((match, idx) => (
                            <div key={idx} className={cn("flex items-center gap-2 text-sm p-2 rounded-md", match.guide ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200")}>
                                {match.guide ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">Matched Guide:</span>
                                        <span>{match.guide.title}</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">No guide found for:</span>
                                        <span className="font-mono bg-white/50 px-1 rounded">"{match.query}"</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor="orthotics" className="text-sm font-medium">Orthotics</Label>
                    {suggestedOrthotics.map((orthotics) => {
                        const text = typeof orthotics === 'string' ? orthotics : orthotics.text;
                        return (
                            <Button key={text} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => onOrthoticsSuggestionClick(orthotics)} disabled={isReadOnly}>
                                {text}
                            </Button>
                        );
                    })}
                </div>
                <Textarea
                    ref={orthoticsRef}
                    id="orthotics"
                    value={extraData.orthotics || ''}
                    onChange={e => onExtraChange('orthotics', e.target.value, e.target.selectionStart)}
                    placeholder="Enter details about braces, splints, or plaster..."
                    className={cn("min-h-[100px]", getStyle('orthotics', extraData.orthotics))}
                    disabled={isReadOnly}
                />
            </div>

            {/* Referred To keeping in ClinicalNotes as implied by "Notes" structure */}
            <div className="space-y-2">
                <Label
                    htmlFor="referred_to"
                    className="text-sm font-medium cursor-pointer hover:underline flex items-center gap-2"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsReferredToExpanded(!isReferredToExpanded);
                    }}
                >
                    Referred To
                    {/* Only show + if:
                        1. Not expanded (so inputs are hidden)
                        2. AND no data in the list (if there is data, we don't need a prompt, we see the list)
                     */}
                    {(!isReferredToExpanded && (!extraData.referred_to_list || !extraData.referred_to_list.some(s => s.trim()))) && <Plus className="w-4 h-4 text-muted-foreground ml-auto" />}
                </Label>
                {/* Show list if:
                    1. Expanded (user clicked to add)
                    2. OR there is data (user previously added)
                 */}
                {((isReferredToExpanded) || (extraData.referred_to_list && extraData.referred_to_list.some(s => s.trim()))) && (
                    (extraData.referred_to_list && extraData.referred_to_list.length > 0 ? extraData.referred_to_list : ['']).map((item, index) => (
                        <div key={index} className="flex gap-2 items-center mb-2">
                            <div className="flex-1">
                                <AutosuggestInput
                                    ref={index === 0 ? referredToRef : null}
                                    value={item}
                                    onChange={(value, cursor) => {
                                        const newList = [...(extraData.referred_to_list && extraData.referred_to_list.length > 0 ? extraData.referred_to_list : [''])];
                                        newList[index] = value;
                                        onExtraChange('referred_to_list', newList, cursor);
                                    }}
                                    suggestions={referralDoctors.map(d => ({
                                        id: d.id,
                                        name: `${d.name}${d.specialization ? `, ${d.specialization}` : ''}${d.address ? `, ${d.address}` : ''}${d.phone ? `, ${d.phone}` : ''}`
                                    }))}
                                    onSuggestionSelected={suggestion => {
                                        const newList = [...(extraData.referred_to_list && extraData.referred_to_list.length > 0 ? extraData.referred_to_list : [''])];
                                        newList[index] = suggestion.name;
                                        onExtraChange('referred_to_list', newList);
                                    }}
                                    placeholder="Referred to..."
                                    inputProps={{
                                        className: (() => {
                                            if (!initialData || !initialData.referred_to_list) return "bg-background/50";
                                            const initialVal = initialData.referred_to_list[index] || '';
                                            const currentVal = item || '';
                                            const isUnchanged = String(currentVal).trim() === String(initialVal).trim();
                                            const hasContent = currentVal && String(currentVal).trim().length > 0;

                                            if (isUnchanged && hasContent) {
                                                return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
                                            }
                                            return "bg-background/50";
                                        })(),
                                        onBlur: () => {
                                            // Check if ALL entries are empty
                                            const currentList = extraData.referred_to_list || [];
                                            // We use the current state 'item' for this specific input, but we need to check the whole list.
                                            // However, state updates might be async or buffered.
                                            // But onBlur happens after typing.
                                            // IMPORTANT: We must check the ACTUAL list data.
                                            const hasData = currentList.some(str => str && str.trim().length > 0);
                                            if (!hasData) {
                                                // Also check if the current input value (which might be in the process of updating?)
                                                // Actually 'item' is passed in.
                                                // If I just cleared it, 'item' might still be old in this render cycle?
                                                // No, React re-renders on change. onBlur happens after.
                                                setIsReferredToExpanded(false);
                                            }
                                        }
                                    }}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="flex gap-1">
                                {/* Only show delete if it's not the only item OR if it has value */}
                                {(extraData.referred_to_list?.length > 1 || item) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => {
                                            const newList = [...(extraData.referred_to_list || [])];
                                            newList.splice(index, 1);
                                            onExtraChange('referred_to_list', newList.length > 0 ? newList : ['']);
                                        }}
                                        disabled={isReadOnly}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                {/* Show Add button on the last item */}
                                {index === (extraData.referred_to_list?.length || 1) - 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary"
                                        onClick={() => {
                                            const newList = [...(extraData.referred_to_list || [''])];
                                            newList.push('');
                                            onExtraChange('referred_to_list', newList);
                                        }}
                                        disabled={isReadOnly}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )))}
            </div>
        </div>
    );
};
