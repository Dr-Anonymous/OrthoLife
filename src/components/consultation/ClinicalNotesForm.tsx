import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

import { Trash2, Plus, CheckCircle2, AlertTriangle, ChevronDown, FileUp, BrainCircuit, Loader2, X, Download, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchedGuide, InvestigationReport } from '@/types/consultation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AutosuggestInput, { Suggestion } from '@/components/ui/AutosuggestInput';
import { normalizeSearchText } from '@/lib/utils';
import { useLimsCatalog } from '@/hooks/useLimsCatalog';
import { useInvestigationHistory } from '@/hooks/useInvestigationHistory';
import { ClinicalParser } from '@/lib/clinical-parser';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import InvestigationTrends from './InvestigationTrends';

interface ClinicalNotesFormProps {
    extraData: {
        complaints: string;
        medicalHistory: string;
        familyHistory?: string;
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
    familyHistoryRef: React.RefObject<HTMLTextAreaElement>;
    findingsRef: React.RefObject<HTMLTextAreaElement>;
    investigationsRef: React.RefObject<HTMLTextAreaElement>;
    diagnosisRef: React.RefObject<HTMLTextAreaElement>;
    procedureRef: React.RefObject<HTMLTextAreaElement>;
    adviceRef: React.RefObject<HTMLTextAreaElement>;
    orthoticsRef: React.RefObject<HTMLTextAreaElement>;
    referredToRef: React.RefObject<any>; // Typings for AutosuggestInput ref might be tricky

    // Suggestions
    suggestedInvestigations: string[];
    suggestedAdvice: (string | { text: string; translatedText?: string; badge?: string })[];
    suggestedOrthotics: (string | { text: string; translatedText?: string })[];
    suggestedMedicalHistory?: (string | { text: string; translatedText?: string })[];
    suggestedFamilyHistory?: (string | { text: string; translatedText?: string })[];

    onInvestigationSuggestionClick: (val: string) => void;
    onAdviceSuggestionClick: (val: string | { text: string; translatedText?: string; badge?: string }) => void;
    onOrthoticsSuggestionClick: (val: string | { text: string; translatedText?: string }) => void;
    onMedicalHistorySuggestionClick: (val: string | { text: string; translatedText?: string }) => void;
    onFamilyHistorySuggestionClick: (val: string | { text: string; translatedText?: string }) => void;

    matchedGuides: MatchedGuide[];

    isProcedureExpanded: boolean;
    setIsProcedureExpanded: (val: boolean) => void;
    isReferredToExpanded: boolean;
    setIsReferredToExpanded: (val: boolean) => void;
    isMedicalHistoryExpanded: boolean;
    setIsMedicalHistoryExpanded: (val: boolean) => void;
    isFamilyHistoryExpanded: boolean;
    setIsFamilyHistoryExpanded: (val: boolean) => void;
    isOrthoticsExpanded: boolean;
    setIsOrthoticsExpanded: (val: boolean) => void;

    referralDoctors: { id: string, name: string, specialization?: string, address?: string, phone?: string }[];
    language: string;
    onLanguageChange: (lang: string) => void;
    initialData?: Partial<ClinicalNotesFormProps['extraData']>;
    isReadOnly?: boolean;
    onShortcutsClick?: () => void;
    patientAge?: number | '';
    patientSex?: string;
    patientName?: string;
    consultationId?: string;
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
    familyHistoryRef,
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
    suggestedMedicalHistory = [],
    suggestedFamilyHistory = [],
    onInvestigationSuggestionClick,
    onAdviceSuggestionClick,
    onOrthoticsSuggestionClick,
    onMedicalHistorySuggestionClick,
    onFamilyHistorySuggestionClick,
    matchedGuides,
    isProcedureExpanded,
    setIsProcedureExpanded,
    isReferredToExpanded,
    setIsReferredToExpanded,
    isMedicalHistoryExpanded,
    setIsMedicalHistoryExpanded,
    isFamilyHistoryExpanded,
    setIsFamilyHistoryExpanded,
    isOrthoticsExpanded,
    setIsOrthoticsExpanded,
    referralDoctors,
    language,
    onLanguageChange,
    initialData,
    patientId,
    isReadOnly = false,
    onShortcutsClick,
    patientAge,
    patientSex,
    patientName,
    consultationId
}) => {
    const queryClient = useQueryClient();
    const { data: investigationHistory } = useInvestigationHistory(patientId);
    const [uploadingReport, setUploadingReport] = React.useState<boolean>(false);
    const [generatingSummaryId, setGeneratingSummaryId] = React.useState<string | null>(null);
    const [pendingDeletions, setPendingDeletions] = React.useState<string[]>([]);
    const { data: limsCatalog, isLoading: isCatalogLoading } = useLimsCatalog();
    const [investigationSearch, setInvestigationSearch] = React.useState('');
    const [activeInvestigationIndex, setActiveInvestigationIndex] = React.useState(0);
    const [ghostText, setGhostText] = React.useState('');
    const [isTrendsOpen, setIsTrendsOpen] = React.useState(false);
    const [selectedTrendTestId, setSelectedTrendTestId] = React.useState<string | null>(null);

    const handleOpenTrends = (testId?: string) => {
        setSelectedTrendTestId(testId || null);
        setIsTrendsOpen(true);
    };

    const parser = React.useMemo(() => new ClinicalParser(limsCatalog?.services || [], limsCatalog?.ranges || []), [limsCatalog]);
    const parsedInvestigations = React.useMemo(() => {
        return parser.parse(extraData.investigations, {
            age: typeof patientAge === 'number' ? patientAge : 30,
            sex: patientSex
        });
    }, [parser, extraData.investigations, patientAge, patientSex]);

    const displayInvestigations = React.useMemo(() => {
        const list = [...parsedInvestigations];

        if (investigationHistory) {
            Object.entries(investigationHistory).forEach(([groupKey, history]) => {
                if (history.length === 0) return;

                const isAlreadyPresent = list.some(item => {
                    const itemKey = item.id ? `${item.id}:${item.name.toLowerCase()}` : item.name.toLowerCase();
                    return itemKey === groupKey;
                });

                if (!isAlreadyPresent) {
                    const lastResult = history[history.length - 1];
                    const [serviceIdFromKey, ...nameParts] = groupKey.includes(':') ? groupKey.split(':') : ['', groupKey];

                    // Use the parser to resolve the latest range for this name
                    const [resolved] = parser.parse(`${lastResult.name}: ${lastResult.value}`);

                    list.push({
                        // Crucial: Use the same ID and name structure that formed the groupKey
                        id: serviceIdFromKey || (resolved?.serviceId || ''),
                        name: resolved?.name || lastResult.name,
                        value: '-',
                        status: 'unknown',
                        range: resolved?.range || '',
                        originalText: '',
                        isHistoricalOnly: true
                    } as any);
                }
            });
        }
        return list;
    }, [parsedInvestigations, investigationHistory, limsCatalog, parser]);

    const hasAnyInvestigationData = displayInvestigations.length > 0;

    React.useEffect(() => {
        setActiveInvestigationIndex(0);
    }, [investigationSearch]);

    const handleInvestigationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const selectionStart = e.target.selectionStart;
        onExtraChange('investigations', value, selectionStart);

        // Detect current query and ghost text
        const lines = value.substring(0, selectionStart).split('\n');
        const currentLine = lines[lines.length - 1];

        // Only search if current line looks like a name (no colon/value yet)
        if (currentLine.trim().length > 1 && !currentLine.includes(':') && !currentLine.includes('-')) {
            setInvestigationSearch(currentLine.trim());

            // Ghost text check
            const matchedHistory = investigationHistory?.[currentLine.trim().toLowerCase()]?.[0];
            if (matchedHistory) {
                setGhostText(`: ${matchedHistory.value}`);
            } else {
                setGhostText('');
            }
        } else {
            setInvestigationSearch('');
            setGhostText('');
        }
    };

    const handleInvestigationKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab' && ghostText) {
            e.preventDefault();
            const currentVal = extraData.investigations;
            const selectionStart = (e.target as HTMLTextAreaElement).selectionStart;
            const before = currentVal.substring(0, selectionStart);
            const after = currentVal.substring(selectionStart);
            onExtraChange('investigations', before + ghostText + after, selectionStart + ghostText.length);
            setGhostText('');
            setInvestigationSearch('');
            return;
        }

        if (filteredLimsTests.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveInvestigationIndex(prev => (prev + 1) % filteredLimsTests.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveInvestigationIndex(prev => (prev - 1 + filteredLimsTests.length) % filteredLimsTests.length);
            } else if (e.key === 'Enter' && investigationSearch) {
                e.preventDefault();
                const selected = filteredLimsTests[activeInvestigationIndex];
                if (selected) {
                    const currentVal = extraData.investigations;
                    const selectionStart = (e.target as HTMLTextAreaElement).selectionStart;
                    const lines = currentVal.substring(0, selectionStart).split('\n');
                    const lastLine = lines[lines.length - 1];
                    const before = currentVal.substring(0, selectionStart - lastLine.length);
                    const after = currentVal.substring(selectionStart);

                    const selectedName = selected.name + ': ';
                    const separator = '\n';
                    onExtraChange('investigations', before + selectedName + separator + after, before.length + selectedName.length + separator.length);
                    setInvestigationSearch('');
                    setGhostText('');
                }
            } else if (e.key === 'Escape') {
                setInvestigationSearch('');
                setGhostText('');
            }
        }
    };



    const filteredLimsTests = React.useMemo(() => {
        const query = normalizeSearchText(investigationSearch);
        if (!query) return [];
        return limsCatalog?.services?.filter(s => {
            const normalizedName = normalizeSearchText(s.name);
            // Filter out consultations from the investigations search
            if (normalizedName.includes('consultation')) {
                return false;
            }
            return normalizedName.includes(query);
        }).slice(0, 20) || [];
    }, [limsCatalog, investigationSearch]);

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

    // Auto-focus Procedure textarea when expanded
    React.useEffect(() => {
        if (isProcedureExpanded && procedureRef?.current) {
            // Use a small timeout to ensure DOM is ready and visible
            const timer = setTimeout(() => {
                procedureRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isProcedureExpanded, procedureRef]);

    // Auto-focus Referred To input when expanded
    React.useEffect(() => {
        if (isReferredToExpanded && referredToRef?.current) {
            // Use a small timeout to ensure DOM is ready and visible
            const timer = setTimeout(() => {
                referredToRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isReferredToExpanded, referredToRef]);

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
        <>
            <div className="space-y-6" id="clinical-notes-section">
                <div className="flex items-center justify-between mt-4 mb-4 pb-2 border-b border-primary/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight">Clinical Notes</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={cn("space-y-2", (isMedicalHistoryExpanded || isFamilyHistoryExpanded) ? "sm:col-span-2" : "sm:col-span-1")}>
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
                        {!isReadOnly && (
                            <p className="text-[10px] text-muted-foreground/70 leading-none">
                                Example: Type a custom shortcut (like <code className="font-bold">ra.</code> or <code className="font-bold">acl.</code>) to expand text. Manage these in{" "}
                                <button
                                    onClick={onShortcutsClick}
                                    className="font-bold text-primary hover:underline underline-offset-2"
                                >
                                    More Actions &gt; Shortcuts
                                </button>
                                .
                            </p>
                        )}
                    </div>

                    {(!isMedicalHistoryExpanded && !extraData.medicalHistory && !isFamilyHistoryExpanded && !extraData.familyHistory) ? (
                        <div className="space-y-4 sm:col-span-1">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="medicalHistory"
                                    className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-full group"
                                    tabIndex={0}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (!isMedicalHistoryExpanded) {
                                            setIsMedicalHistoryExpanded(true);
                                            setTimeout(() => medicalHistoryRef.current?.focus(), 50);
                                        } else if (!extraData.medicalHistory) {
                                            setIsMedicalHistoryExpanded(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!isMedicalHistoryExpanded) {
                                                setIsMedicalHistoryExpanded(true);
                                                setTimeout(() => medicalHistoryRef.current?.focus(), 50);
                                            } else if (!extraData.medicalHistory) {
                                                setIsMedicalHistoryExpanded(false);
                                            }
                                        }
                                    }}
                                >
                                    <span className="shrink-0 group-hover:underline">Past History</span>
                                    {suggestedMedicalHistory.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {suggestedMedicalHistory.map((sh) => {
                                                const text = typeof sh === 'string' ? sh : sh.text;
                                                return (
                                                    <Button
                                                        key={text}
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-auto px-2 py-1 text-xs border-primary/20 hover:bg-primary/5"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMedicalHistoryExpanded(true);
                                                            onMedicalHistorySuggestionClick(sh);
                                                        }}
                                                        disabled={isReadOnly}
                                                    >
                                                        {text}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(!isMedicalHistoryExpanded && !extraData.medicalHistory) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                                </Label>
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="familyHistory"
                                    className="text-sm font-medium cursor-pointer hover:underline flex items-center gap-2 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-full"
                                    tabIndex={0}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (!isFamilyHistoryExpanded) {
                                            setIsFamilyHistoryExpanded(true);
                                            setTimeout(() => familyHistoryRef.current?.focus(), 50);
                                        } else if (!extraData.familyHistory) {
                                            setIsFamilyHistoryExpanded(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!isFamilyHistoryExpanded) {
                                                setIsFamilyHistoryExpanded(true);
                                                setTimeout(() => familyHistoryRef.current?.focus(), 50);
                                            } else if (!extraData.familyHistory) {
                                                setIsFamilyHistoryExpanded(false);
                                            }
                                        }
                                    }}
                                >
                                    <span className="shrink-0 group-hover:underline">Family History</span>
                                    {suggestedFamilyHistory.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {suggestedFamilyHistory.map((sh) => {
                                                const text = typeof sh === 'string' ? sh : sh.text;
                                                return (
                                                    <Button
                                                        key={text}
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-auto px-2 py-1 text-xs border-primary/20 hover:bg-primary/5"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsFamilyHistoryExpanded(true);
                                                            onFamilyHistorySuggestionClick(sh);
                                                        }}
                                                        disabled={isReadOnly}
                                                    >
                                                        {text}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(!isFamilyHistoryExpanded && !extraData.familyHistory) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                                </Label>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={cn("space-y-2", (isMedicalHistoryExpanded || isFamilyHistoryExpanded) ? "sm:col-span-2" : "sm:col-span-1")}>
                                <Label
                                    htmlFor="medicalHistory"
                                    className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-full group"
                                    tabIndex={0}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (!isMedicalHistoryExpanded) {
                                            setIsMedicalHistoryExpanded(true);
                                            setTimeout(() => medicalHistoryRef.current?.focus(), 50);
                                        } else if (!extraData.medicalHistory) {
                                            setIsMedicalHistoryExpanded(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!isMedicalHistoryExpanded) {
                                                setIsMedicalHistoryExpanded(true);
                                                setTimeout(() => medicalHistoryRef.current?.focus(), 50);
                                            } else if (!extraData.medicalHistory) {
                                                setIsMedicalHistoryExpanded(false);
                                            }
                                        }
                                    }}
                                >
                                    <span className="shrink-0 group-hover:underline">Past History</span>
                                    {suggestedMedicalHistory.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {suggestedMedicalHistory.map((sh) => {
                                                const text = typeof sh === 'string' ? sh : sh.text;
                                                return (
                                                    <Button
                                                        key={text}
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-auto px-2 py-1 text-xs border-primary/20 hover:bg-primary/5"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMedicalHistoryExpanded(true);
                                                            onMedicalHistorySuggestionClick(sh);
                                                        }}
                                                        disabled={isReadOnly}
                                                    >
                                                        {text}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(!isMedicalHistoryExpanded && !extraData.medicalHistory) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                                </Label>
                                {(extraData.medicalHistory || isMedicalHistoryExpanded) && (
                                    <Textarea
                                        ref={medicalHistoryRef}
                                        id="medicalHistory"
                                        value={extraData.medicalHistory}
                                        onChange={e => onExtraChange('medicalHistory', e.target.value, e.target.selectionStart)}
                                        placeholder="Previous history, chronic conditions..."
                                        className={cn("min-h-[100px]", getStyle('medicalHistory', extraData.medicalHistory))}
                                        disabled={isReadOnly}
                                        onBlur={() => {
                                            if (!extraData.medicalHistory || extraData.medicalHistory.trim() === '') {
                                                setIsMedicalHistoryExpanded(false);
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            <div className={cn("space-y-2", (isMedicalHistoryExpanded || isFamilyHistoryExpanded) ? "sm:col-span-2" : "sm:col-span-1")}>
                                <Label
                                    htmlFor="familyHistory"
                                    className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-full group"
                                    tabIndex={0}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (!isFamilyHistoryExpanded) {
                                            setIsFamilyHistoryExpanded(true);
                                            setTimeout(() => familyHistoryRef.current?.focus(), 50);
                                        } else if (!extraData.familyHistory) {
                                            setIsFamilyHistoryExpanded(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!isFamilyHistoryExpanded) {
                                                setIsFamilyHistoryExpanded(true);
                                                setTimeout(() => familyHistoryRef.current?.focus(), 50);
                                            } else if (!extraData.familyHistory) {
                                                setIsFamilyHistoryExpanded(false);
                                            }
                                        }
                                    }}
                                >
                                    <span className="shrink-0 group-hover:underline">Family History</span>
                                    {suggestedFamilyHistory.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {suggestedFamilyHistory.map((sh) => {
                                                const text = typeof sh === 'string' ? sh : sh.text;
                                                return (
                                                    <Button
                                                        key={text}
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-auto px-2 py-1 text-xs border-primary/20 hover:bg-primary/5"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsFamilyHistoryExpanded(true);
                                                            onFamilyHistorySuggestionClick(sh);
                                                        }}
                                                        disabled={isReadOnly}
                                                    >
                                                        {text}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(!isFamilyHistoryExpanded && !extraData.familyHistory) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                                </Label>
                                {(extraData.familyHistory || isFamilyHistoryExpanded) && (
                                    <Textarea
                                        ref={familyHistoryRef}
                                        id="familyHistory"
                                        value={extraData.familyHistory || ''}
                                        onChange={e => onExtraChange('familyHistory', e.target.value, e.target.selectionStart)}
                                        placeholder="Family history of similar conditions, genetic disorders..."
                                        className={cn("min-h-[80px]", getStyle('familyHistory', extraData.familyHistory))}
                                        disabled={isReadOnly}
                                        onBlur={() => {
                                            if (!extraData.familyHistory || extraData.familyHistory.trim() === '') {
                                                setIsFamilyHistoryExpanded(false);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </>
                    )}
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
                        <div className="flex items-center flex-wrap gap-2 mb-2 w-full">
                            <div className="flex items-center gap-3">
                                <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                                {limsCatalog && (
                                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1">
                                        <div
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full cursor-pointer",
                                                limsCatalog.services.length > 0 ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                            )}
                                            title={limsCatalog.services.length > 0 ? "Live Catalog Active - Click to Refetch" : "Catalog Loading - Click to Refetch"}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                toast.info('Refetching live catalog...');
                                                await queryClient.invalidateQueries({ queryKey: ['lims-catalog'] });
                                            }}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-primary animate-in fade-in slide-in-from-left-2 delay-75"
                                            title="View Trends"
                                            onClick={() => handleOpenTrends()}
                                            disabled={!patientId}
                                        >
                                            <TrendingUp className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>



                            <div className="flex flex-wrap gap-1.5">
                                {suggestedInvestigations.map((investigation) => (
                                    <Button
                                        key={investigation}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-auto px-2 py-1 text-xs"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onInvestigationSuggestionClick(investigation)}
                                        disabled={isReadOnly}
                                    >
                                        {investigation}
                                    </Button>
                                ))}
                            </div>

                            {!isReadOnly && (!extraData.investigation_reports || extraData.investigation_reports.length === 0) && (
                                <div className="ml-auto">
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
                        </div>
                        <div className="relative w-full">
                            <div className="relative">
                                <Textarea
                                    ref={investigationsRef}
                                    id="investigations"
                                    value={extraData.investigations}
                                    onChange={handleInvestigationChange}
                                    onKeyDown={handleInvestigationKeyDown}
                                    placeholder="Investigations ordered... (e.g. CRP: 45, Hb: 12)"
                                    className={cn("min-h-[100px] w-full", getStyle('investigations', extraData.investigations))}
                                    disabled={isReadOnly}
                                />

                                {/* Ghost Text Overlay */}
                                {ghostText && (
                                    <div className="absolute top-2 left-3 pointer-events-none text-sm text-muted-foreground/30 whitespace-pre-wrap">
                                        <span className="invisible">{extraData.investigations.substring(0, investigationsRef.current?.selectionStart || 0)}</span>
                                        {ghostText}
                                        <span className="ml-2 text-[10px] bg-muted px-1 rounded font-sans opacity-100">Tab to accept</span>
                                    </div>
                                )}

                                {/* Integrated LIMS Suggestions */}
                                {investigationSearch && (
                                    <div className="absolute top-full left-0 z-[100] mt-1 w-full max-w-sm p-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-auto">
                                        {isCatalogLoading ? (
                                            <div className="p-4 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Fetching live catalog...</span>
                                            </div>
                                        ) : filteredLimsTests.length > 0 ? (
                                            <>
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground border-b flex justify-between items-center bg-muted/20">
                                                    <span>CATALOG SUGGESTIONS</span>
                                                    <div className="flex gap-2">
                                                        <span className="flex items-center gap-1"><kbd className="px-1 bg-background border rounded text-[8px]">↑↓</kbd> Navigate</span>
                                                        <span className="flex items-center gap-1"><kbd className="px-1 bg-background border rounded text-[8px]">↵</kbd> Select</span>
                                                    </div>
                                                </div>
                                                {filteredLimsTests.map((test, idx) => (
                                                    <button
                                                        key={test.id}
                                                        className={cn(
                                                            "w-full text-left px-2 py-2 text-xs rounded-sm hover:bg-accent flex items-center justify-between gap-2 border-b last:border-0",
                                                            idx === activeInvestigationIndex && "bg-accent"
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            const currentVal = extraData.investigations;
                                                            const selectionStart = investigationsRef.current?.selectionStart || currentVal.length;
                                                            const lines = currentVal.substring(0, selectionStart).split('\n');
                                                            const lastLine = lines[lines.length - 1];
                                                            const before = currentVal.substring(0, selectionStart - lastLine.length);
                                                            const after = currentVal.substring(selectionStart);

                                                            const selectedName = test.name + ': ';
                                                            const separator = '\n';
                                                            onExtraChange('investigations', before + selectedName + separator + after, before.length + selectedName.length + separator.length);
                                                            setInvestigationSearch('');
                                                            setGhostText('');
                                                        }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{test.name}</span>
                                                            {test.category && <span className="text-[10px] text-muted-foreground italic">{test.category}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {test.type?.toLowerCase() === 'package' && (
                                                                <Badge variant="outline" className="h-4 text-[8px] bg-blue-50 text-blue-700 border-blue-200">Panel</Badge>
                                                            )}
                                                            <Search className="w-3 h-3 text-muted-foreground/40" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="p-2 text-[10px] text-muted-foreground">
                                                No matching tests found in catalog.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {hasAnyInvestigationData && (
                                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {/* Results Table */}
                                    <div className="border rounded-lg overflow-x-auto bg-white shadow-sm border-slate-200">
                                        {(() => {
                                            // 1. Collect all unique dates from all tracked tests' history
                                            const allDatesSet = new Set<string>();
                                            displayInvestigations.forEach(res => {
                                                const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();
                                                const history = investigationHistory?.[groupKey] || [];
                                                history.forEach(h => {
                                                    if (h.consultationId !== consultationId) {
                                                        allDatesSet.add(format(new Date(h.date), 'yyyy-MM-dd'));
                                                    }
                                                });
                                            });

                                            // 2. Sort dates descending (most recent first) and take top 3
                                            const sortedDates = Array.from(allDatesSet)
                                                .sort((a, b) => b.localeCompare(a))
                                                .slice(0, 3);

                                            return (
                                                <table className="w-full text-left border-collapse min-w-[600px]">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Parameter</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Range</th>
                                                            {sortedDates.map(date => (
                                                                <th key={date} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-l border-slate-100">
                                                                    {format(new Date(date), 'dd MMM')}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {displayInvestigations.map((res, i) => {
                                                            const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();
                                                            const history = investigationHistory?.[groupKey] || [];

                                                            return (
                                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className={cn(
                                                                        "px-3 py-2 text-xs font-semibold sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]",
                                                                        (res as any).isHistoricalOnly ? "text-slate-400" : "text-slate-700"
                                                                    )}>
                                                                        {res.name}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={cn(
                                                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border",
                                                                                res.status === 'normal' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                                                                (res.status === 'high' || res.status === 'low') && "bg-amber-50 text-amber-700 border-amber-100",
                                                                                (res.status === 'critical-high' || res.status === 'critical-low') && "bg-rose-50 text-rose-700 border-rose-100",
                                                                                res.status === 'unknown' && "bg-slate-50 text-slate-500 border-slate-100"
                                                                            )}>
                                                                                {res.value}
                                                                                {res.status !== 'normal' && res.status !== 'unknown' && <AlertTriangle className="w-3 h-3" />}
                                                                            </div>

                                                                            {(() => {
                                                                                const filteredHistory = history.filter(h => h.consultationId !== consultationId);
                                                                                const prev = filteredHistory[0];
                                                                                if (prev && typeof res.value === 'number' && typeof prev.value === 'number') {
                                                                                    const trendIcon = res.value > prev.value
                                                                                        ? <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                                                                                        : res.value < prev.value
                                                                                            ? <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                                                                            : <Minus className="w-3.5 h-3.5 text-slate-300" />;

                                                                                    return (
                                                                                        <TooltipProvider>
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <button
                                                                                                        className="hover:scale-110 transition-transform focus:outline-none"
                                                                                                        onClick={() => handleOpenTrends(groupKey)}
                                                                                                    >
                                                                                                        {trendIcon}
                                                                                                    </button>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent>
                                                                                                    <p className="text-[10px]">Click to view {res.name} trends</p>
                                                                                                </TooltipContent>
                                                                                            </Tooltip>
                                                                                        </TooltipProvider>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <span className="text-xs text-slate-600 font-mono">
                                                                            {res.range || <span className="text-[10px] text-slate-400 italic">Not in LIMS</span>}
                                                                        </span>
                                                                    </td>
                                                                    {sortedDates.map(dateStr => {
                                                                        const historyMatch = history.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateStr && h.consultationId !== consultationId);
                                                                        return (
                                                                            <td key={dateStr} className="px-3 py-2 border-l border-slate-50">
                                                                                {historyMatch ? (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={cn(
                                                                                            "text-xs font-mono font-medium",
                                                                                            historyMatch.status === 'normal' ? "text-slate-500" : "text-rose-500"
                                                                                        )}>
                                                                                            {historyMatch.value}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-slate-300">-</span>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

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
                        className="text-sm font-medium cursor-pointer hover:underline flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        tabIndex={0}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsProcedureExpanded(!isProcedureExpanded);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsProcedureExpanded(!isProcedureExpanded);
                            }
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
                            const text = typeof advice === 'string' ? advice : (advice.badge || advice.text);
                            const key = typeof advice === 'string' ? advice : advice.text;
                            return (
                                <Button
                                    key={key}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-auto px-2 py-1 text-xs"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onAdviceSuggestionClick(advice)}
                                    disabled={isReadOnly}
                                >
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
                    <Label
                        htmlFor="orthotics"
                        className="text-sm font-medium cursor-pointer flex items-center gap-2 flex-wrap outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-full group"
                        tabIndex={0}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsOrthoticsExpanded(!isOrthoticsExpanded);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsOrthoticsExpanded(!isOrthoticsExpanded);
                            }
                        }}
                    >
                        <span className="shrink-0 group-hover:underline">Orthotics</span>
                        {suggestedOrthotics.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {suggestedOrthotics.map((orthotics) => {
                                    const text = typeof orthotics === 'string' ? orthotics : orthotics.text;
                                    return (
                                        <Button
                                            key={text}
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-auto px-2 py-1 text-xs border-primary/20 hover:bg-primary/5"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsOrthoticsExpanded(true);
                                                onOrthoticsSuggestionClick(orthotics);
                                            }}
                                            disabled={isReadOnly}
                                        >
                                            {text}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                        {(!isOrthoticsExpanded && !extraData.orthotics) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                    </Label>
                    {(extraData.orthotics || isOrthoticsExpanded) && (
                        <Textarea
                            ref={orthoticsRef}
                            id="orthotics"
                            value={extraData.orthotics || ''}
                            onChange={e => onExtraChange('orthotics', e.target.value, e.target.selectionStart)}
                            placeholder="Enter details about braces, splints, or plaster..."
                            className={cn("min-h-[100px]", getStyle('orthotics', extraData.orthotics))}
                            disabled={isReadOnly}
                            onBlur={() => {
                                if (!extraData.orthotics || extraData.orthotics.trim() === '') {
                                    setIsOrthoticsExpanded(false);
                                }
                            }}
                        />
                    )}
                </div>

                {/* Referred To keeping in ClinicalNotes as implied by "Notes" structure */}
                <div className="space-y-2">
                    <Label
                        htmlFor="referred_to"
                        className="text-sm font-medium cursor-pointer hover:underline flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        tabIndex={0}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsReferredToExpanded(!isReferredToExpanded);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsReferredToExpanded(!isReferredToExpanded);
                            }
                        }}
                    >
                        Referred To
                        {(!isReferredToExpanded && (!extraData.referred_to_list || !extraData.referred_to_list.some(s => s.trim()))) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
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
            {isTrendsOpen && patientId && (
                <InvestigationTrends
                    isOpen={isTrendsOpen}
                    onClose={() => setIsTrendsOpen(false)}
                    patientId={patientId}
                    patientName={patientName}
                    defaultTestId={selectedTrendTestId}
                />
            )}
        </>
    );
};
