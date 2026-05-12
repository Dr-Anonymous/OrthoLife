import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

import { Trash2, Plus, CheckCircle2, AlertTriangle, ChevronDown, FileUp, Brain, Loader2, X, Download, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchedGuide, InvestigationReport } from '@/types/consultation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AutosuggestInput, { Suggestion } from '@/components/ui/AutosuggestInput';
import { normalizeSearchText } from '@/lib/utils';

import { useLimsCatalog } from '@/hooks/useLimsCatalog';
import { useInvestigationHistory, HistoricalResult } from '@/hooks/useInvestigationHistory';
import { ClinicalParser } from '@/lib/clinical-parser';
import InvestigationTrends from './InvestigationTrends';

interface ClinicalNotesFormProps {
    extraData: {
        complaints: string;
        medicalHistory: string;
        familyHistory?: string;
        findings: string;
        investigations: string;
        radiology_findings?: string;
        radiology_images?: InvestigationReport[];
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
    radiologyFindingsRef: React.RefObject<HTMLTextAreaElement>;
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
    radiologyFindingsRef,
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
    const [uploadingRadiology, setUploadingRadiology] = React.useState<boolean>(false);
    const [generatingSummaryId, setGeneratingSummaryId] = React.useState<string | null>(null);
    const [pendingDeletions, setPendingDeletions] = React.useState<string[]>([]);
    const { data: limsCatalog, isLoading: isCatalogLoading } = useLimsCatalog();
    const [investigationSearch, setInvestigationSearch] = React.useState('');
    const [activeInvestigationIndex, setActiveInvestigationIndex] = React.useState(0);
    const [radiologySearch, setRadiologySearch] = React.useState('');
    const [activeRadiologyIndex, setActiveRadiologyIndex] = React.useState(0);
    const [ghostText, setGhostText] = React.useState('');
    const [isTrendsOpen, setIsTrendsOpen] = React.useState(false);
    const [selectedTrendTestId, setSelectedTrendTestId] = React.useState<string | null>(null);
    const [editingInvestigation, setEditingInvestigation] = React.useState<{ key: string, value: string } | null>(null);
    const [extractedAIFindings, setExtractedAIFindings] = React.useState<Array<{ name: string, value: string | number, sourceId: string }>>([]);

    const handleOpenTrends = (testId?: string) => {
        setSelectedTrendTestId(testId || null);
        setIsTrendsOpen(true);
    };

    const handleAddAISuggestion = (suggestion: { name: string, value: string | number, sourceId: string }) => {
        const textToAppend = `${suggestion.name}: ${suggestion.value}\n`;
        const currentVal = extraData.investigations || '';
        onExtraChange('investigations', currentVal + (currentVal.endsWith('\n') || currentVal === '' ? '' : '\n') + textToAppend);

        // Remove from staging after adding
        setExtractedAIFindings(prev => prev.filter(f => f !== suggestion));
        toast.success(`Added ${suggestion.name} to notes`);
    };

    const handleInvestigationValueChange = (res: any, newValue: string) => {
        if (isReadOnly) return;

        const invText = extraData.investigations || '';
        const invOffset = invText.length + 1;
        const radText = extraData.radiology_findings || '';

        // Determine source field and relative indices
        let field: 'investigations' | 'radiology_findings' = 'investigations';
        let currentText = invText;
        let relativeStart = res.startIndex;
        let relativeEnd = res.endIndex;

        if (res.startIndex !== undefined && res.startIndex >= invOffset) {
            field = 'radiology_findings';
            currentText = radText;
            relativeStart = res.startIndex - invOffset;
            relativeEnd = res.endIndex - invOffset;
        }

        if (res.isHistoricalOnly || res.value === '-') {
            // APPEND mode
            if (!newValue.trim()) return; // Don't append empty values

            // Double check if it's radiology based on service catalog
            const service = limsCatalog?.services?.find(s => s.id === res.id);
            const targetField = service?.type === 'SCAN' ? 'radiology_findings' : 'investigations';
            const targetText = extraData[targetField] || '';

            const separator = ': ';
            const suffix = targetText.trim() ? (targetText.endsWith('\n') ? '' : '\n') : '';
            const newEntry = `${res.name}${separator}${newValue}`;
            onExtraChange(targetField, targetText + suffix + newEntry);
        } else {
            // UPDATE mode - surgical replacement using indices
            if (relativeStart === undefined || relativeEnd === undefined) {
                // Fallback to original replacement if indices are missing for some reason
                const oldLine = res.originalText;
                if (!oldLine) return;
                const separatorMatch = oldLine.match(/([:=]|\s-\s|(?<=[a-zA-Z0-9])-(?=\s))/);
                const separator = separatorMatch ? separatorMatch[0] : ': ';
                const paramNamePart = oldLine.split(separator)[0];
                const newLine = `${paramNamePart}${separator}${newValue}`;
                onExtraChange(field, currentText.replace(oldLine, newLine));
                return;
            }

            const oldLine = res.originalText;
            const separator = ': ';
            const paramNamePart = res.name;

            if (!newValue.trim()) {
                // Deletion mode: remove the line entirely to keep notes clean
                // The parent package expansion will catch this and show a placeholder again
                const updatedText = currentText.substring(0, relativeStart) + currentText.substring(relativeEnd);
                onExtraChange(field, updatedText.replace(/\n\n+/g, '\n').trim());
                return;
            }

            const newLine = `${paramNamePart}${separator}${newValue}`;
            const updatedText = currentText.substring(0, relativeStart) + newLine + currentText.substring(relativeEnd);
            onExtraChange(field, updatedText);
        }
    };

    const parser = React.useMemo(() => new ClinicalParser(limsCatalog?.services || [], limsCatalog?.ranges || []), [limsCatalog]);
    const parsedInvestigations = React.useMemo(() => {
        const combinedText = (extraData.investigations || '') + '\n' + (extraData.radiology_findings || '');
        return parser.parse(combinedText, {
            age: typeof patientAge === 'number' ? patientAge : 30,
            sex: patientSex
        });
    }, [parser, extraData.investigations, extraData.radiology_findings, patientAge, patientSex]);

    const allHistoryDates = React.useMemo(() => {
        if (!investigationHistory) return [];
        const dateSet = new Set<string>();
        Object.values(investigationHistory).forEach((history: HistoricalResult[]) => {
            history.forEach(h => {
                // Exclude current consultation from history columns as it is shown in the 'Current' column
                if (consultationId && String(h.consultationId) === String(consultationId)) return;

                if (h.date) {
                    dateSet.add(format(new Date(h.date), 'dd/MM/yy'));
                }
            });
        });
        // Sort dates descending
        return Array.from(dateSet).sort((a, b) => {
            const [da, ma, ya] = a.split('/').map(Number);
            const [db, mb, yb] = b.split('/').map(Number);
            const dateA = new Date(ya + 2000, ma - 1, da).getTime();
            const dateB = new Date(yb + 2000, mb - 1, db).getTime();
            return dateB - dateA;
        }).slice(0, 15); // Show latest 15 historical dates to match trend density
    }, [investigationHistory, consultationId]);

    const displayInvestigations = React.useMemo(() => {
        const list = [...parsedInvestigations];

        if (investigationHistory) {
            Object.entries(investigationHistory).forEach(([groupKey, history]: [string, HistoricalResult[]]) => {
                const hasOtherHistory = history.some(h => !consultationId || String(h.consultationId) !== String(consultationId));
                if (!hasOtherHistory) return;

                const isAlreadyPresent = list.some(item => {
                    const itemKey = item.id ? `${item.id}:${item.name.toLowerCase()}` : item.name.toLowerCase();
                    return itemKey === groupKey;
                });

                if (!isAlreadyPresent) {
                    const [serviceIdFromKey, ...nameParts] = groupKey.includes(':') ? groupKey.split(':') : ['', groupKey];
                    const testName = nameParts.join(':') || groupKey;

                    // Use the parser to resolve the latest range for this name
                    const [resolved] = parser.parse(`${testName}: -`, {
                        age: typeof patientAge === 'number' ? patientAge : 30,
                        sex: patientSex
                    });

                    list.push({
                        id: serviceIdFromKey || (resolved?.serviceId || ''),
                        name: resolved?.name || testName,
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
    }, [parsedInvestigations, investigationHistory, limsCatalog, parser, consultationId]);

    const hasAnyInvestigationData = displayInvestigations.length > 0;

    React.useEffect(() => {
        setActiveInvestigationIndex(0);
    }, [investigationSearch]);

    React.useEffect(() => {
        setActiveRadiologyIndex(0);
    }, [radiologySearch]);

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



    const flattenedLimsTests = React.useMemo(() => {
        const query = normalizeSearchText(investigationSearch);
        if (!query) return [];

        const matches: any[] = [];
        limsCatalog?.services?.forEach(s => {
            const type = s.type?.toUpperCase();
            if (type !== 'LAB') return;

            const serviceName = normalizeSearchText(s.name);
            if (serviceName.includes('consultation')) return;

            const nameMatch = serviceName.includes(query);
            const matchingParams = s.result_schema?.filter(p => {
                const pName = normalizeSearchText(p.name || '');
                return pName.includes(query);
            }) || [];

            if (nameMatch || matchingParams.length > 0) {
                // Add the service itself
                matches.push({
                    type: 'service',
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    data: s
                });

                // Add matching sub-parameters
                matchingParams.forEach(p => {
                    if (normalizeSearchText(p.name) === serviceName) return;
                    matches.push({
                        type: 'parameter',
                        id: `${s.id}-${p.name}`,
                        name: p.name,
                        parentName: s.name,
                        data: s
                    });
                });
            }
        });

        return matches.slice(0, 25);
    }, [limsCatalog, investigationSearch]);

    const filteredLimsTests = flattenedLimsTests; // For backward compatibility with existing code where possible

    const filteredLimsScans = React.useMemo(() => {
        const query = normalizeSearchText(radiologySearch);
        if (!query) return [];
        return limsCatalog?.services?.filter(s => {
            const type = s.type?.toUpperCase();
            if (type !== 'SCAN') return false;

            const normalizedName = normalizeSearchText(s.name);
            return normalizedName.includes(query);
        }).slice(0, 20) || [];
    }, [limsCatalog, radiologySearch]);

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
        const currentScans = extraData.radiology_images || [];
        const initialScans = initialData?.radiology_images || [];

        const isSynced = JSON.stringify(currentReports) === JSON.stringify(initialReports) &&
            JSON.stringify(currentScans) === JSON.stringify(initialScans);

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
    }, [extraData.investigation_reports, initialData?.investigation_reports, extraData.radiology_images, initialData?.radiology_images, pendingDeletions]);

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

    const handleRadiologyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !patientId) return;

        setUploadingRadiology(true);
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

                const currentReports = extraData.radiology_images || [];
                onExtraChange('radiology_images', [...currentReports, newReport]);
                toast.success('Radiology image uploaded successfully');
            } catch (error: any) {
                console.error('Radiology upload error:', error);
                toast.error('Failed to upload radiology image');
            } finally {
                setUploadingRadiology(false);
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

            if (data.extractedData && Array.isArray(data.extractedData)) {
                const findingsWithSource = data.extractedData.map((f: any) => ({
                    ...f,
                    sourceId: report.fileId
                }));
                setExtractedAIFindings(prev => [...prev, ...findingsWithSource]);
            }
            toast.success('AI summary and suggestions generated');
        } catch (error: any) {
            console.error('AI Summary error:', error);
            toast.error(error.message || 'Failed to generate summary');
        } finally {
            setGeneratingSummaryId(null);
        }
    };

    // Helper to determine if a field is autofilled (unchanged from initial) and highlighted
    const getStyle = (field: keyof ClinicalNotesFormProps['extraData'] | 'radiology_findings', value: any) => {
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

                <div className="space-y-8">
                    {/* 2-Column Vertical Layout: Findings + Attachments */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Labs */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <Label htmlFor="investigations" className="text-sm font-medium">Labs</Label>
                                        {allHistoryDates.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
                                                title="View Trends"
                                                onClick={() => handleOpenTrends()}
                                                disabled={!patientId}
                                            >
                                                <TrendingUp className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {!isReadOnly && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 flex items-center gap-1.5"
                                            disabled={uploadingReport}
                                            onClick={() => document.getElementById('report-upload')?.click()}
                                        >
                                            {uploadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                                            Attach Report
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Textarea
                                        ref={investigationsRef}
                                        id="investigations"
                                        value={extraData.investigations}
                                        onChange={handleInvestigationChange}
                                        onKeyDown={handleInvestigationKeyDown}
                                        placeholder="Laboratory tests... (e.g. CRP: 45, Hb: 12)"
                                        className={cn("min-h-[140px] focus:ring-primary/20", getStyle('investigations', extraData.investigations))}
                                        disabled={isReadOnly}
                                        onBlur={() => {
                                            setInvestigationSearch('');
                                            setGhostText('');
                                        }}
                                    />
                                    {investigationSearch && filteredLimsTests.length > 0 && (
                                        <div className="absolute top-full left-0 z-[100] mt-1 w-full max-w-sm p-1 bg-popover border rounded-xl shadow-xl max-h-[300px] overflow-auto">
                                            <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/50">
                                                Lab Catalog
                                            </div>
                                            {filteredLimsTests.map((item, idx) => (
                                                <button
                                                    key={item.id}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-primary hover:text-white flex items-center justify-between group transition-colors",
                                                        idx === activeInvestigationIndex && "bg-primary text-white"
                                                    )}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        const currentVal = extraData.investigations;
                                                        const selectionStart = investigationsRef.current?.selectionStart || currentVal.length;
                                                        const lines = currentVal.substring(0, selectionStart).split('\n');
                                                        const lastLine = lines[lines.length - 1];
                                                        const before = currentVal.substring(0, selectionStart - lastLine.length);
                                                        const after = currentVal.substring(selectionStart);
                                                        const selectedName = item.name + ': ';
                                                        onExtraChange('investigations', before + selectedName + '\n' + after, before.length + selectedName.length + 1);
                                                        setInvestigationSearch('');
                                                    }}
                                                >
                                                    <span className="font-medium truncate">{item.name}</span>
                                                    <Search className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI Extracted Findings */}
                            {extractedAIFindings.length > 0 && (
                                <div className="p-4 bg-primary/[0.03] border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="relative">
                                            <Brain className="w-4 h-4 text-primary" />
                                            <div className="absolute inset-0 bg-primary/20 blur-sm animate-pulse rounded-full" />
                                        </div>
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI Extracted Findings</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {extractedAIFindings.map((finding, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAddAISuggestion(finding)}
                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-primary/10 rounded-xl text-xs hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-md group active:scale-95"
                                            >
                                                <span className="font-bold">{finding.name}</span>
                                                <span className="opacity-60">{finding.value}</span>
                                                <Plus className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attached Lab Reports */}
                            {extraData.investigation_reports && extraData.investigation_reports.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Attached Lab Reports</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {extraData.investigation_reports.map((report, idx) => (
                                            <div key={report.fileId || idx} className="group relative flex flex-col p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">{report.fileName}</span>
                                                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Lab Report</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => window.open(`https://drive.google.com/file/d/${report.fileId}/view`, '_blank')}>
                                                            <Download className="h-3.5 h-3.5" />
                                                        </Button>
                                                        {!isReadOnly && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/5" onClick={() => {
                                                                const newList = [...(extraData.investigation_reports || [])];
                                                                const r = newList[idx];
                                                                if (r.fileId) setPendingDeletions(prev => [...prev, r.fileId]);
                                                                newList.splice(idx, 1);
                                                                onExtraChange('investigation_reports', newList);
                                                                setExtractedAIFindings(prev => prev.filter(f => f.sourceId !== report.fileId));
                                                            }}>
                                                                <X className="h-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {report.gist ? (
                                                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-600 italic leading-relaxed">
                                                        "{report.gist}"
                                                    </div>
                                                ) : (
                                                    !isReadOnly && (
                                                        <div className="mt-3 pt-3 border-t border-slate-50">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn(
                                                                    "h-8 text-[10px] w-full font-bold tracking-wide transition-all",
                                                                    generatingSummaryId === report.fileId ? "bg-slate-50 text-slate-400" : "hover:bg-primary hover:text-white border-primary/20 text-primary"
                                                                )}
                                                                disabled={generatingSummaryId === report.fileId}
                                                                onClick={() => generateAISummary(report, idx)}
                                                            >
                                                                {generatingSummaryId === report.fileId ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing...</> : <><Brain className="w-3 h-3 mr-2" /> Generate AI Summary</>}
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Right Column: Radiology */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="radiology_findings" className="text-sm font-medium">Radiology</Label>
                                    {!isReadOnly && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 flex items-center gap-1.5"
                                            disabled={uploadingRadiology}
                                            onClick={() => document.getElementById('radiology-upload')?.click()}
                                        >
                                            {uploadingRadiology ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5 text-primary" />}
                                            Attach Scan
                                        </Button>
                                    )}
                                </div>

                                <div className="relative">
                                    <Textarea
                                        ref={radiologyFindingsRef}
                                        id="radiology_findings"
                                        value={extraData.radiology_findings || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const selectionStart = e.target.selectionStart;
                                            onExtraChange('radiology_findings', value, selectionStart);
                                            const lines = value.substring(0, selectionStart).split('\n');
                                            const currentLine = lines[lines.length - 1];
                                            if (currentLine.trim().length > 1 && !currentLine.includes(':')) {
                                                setRadiologySearch(currentLine.trim());
                                            } else {
                                                setRadiologySearch('');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (filteredLimsScans.length > 0) {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setActiveRadiologyIndex(prev => (prev + 1) % filteredLimsScans.length);
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setActiveRadiologyIndex(prev => (prev - 1 + filteredLimsScans.length) % filteredLimsScans.length);
                                                } else if (e.key === 'Enter' && radiologySearch) {
                                                    e.preventDefault();
                                                    const selected = filteredLimsScans[activeRadiologyIndex];
                                                    if (selected) {
                                                        const currentVal = extraData.radiology_findings || '';
                                                        const selectionStart = (e.target as HTMLTextAreaElement).selectionStart;
                                                        const lines = currentVal.substring(0, selectionStart).split('\n');
                                                        const lastLine = lines[lines.length - 1];
                                                        const before = currentVal.substring(0, selectionStart - lastLine.length);
                                                        const after = currentVal.substring(selectionStart);
                                                        const selectedName = selected.name.toUpperCase() + ': ';
                                                        onExtraChange('radiology_findings', before + selectedName + after, before.length + selectedName.length);
                                                        setRadiologySearch('');
                                                    }
                                                } else if (e.key === 'Escape') setRadiologySearch('');
                                            }
                                        }}
                                        placeholder="Radiology findings... (e.g. X-Ray Knee AP/Lat: Normal study)"
                                        className={cn("min-h-[140px] focus:ring-primary/20", getStyle('radiology_findings', extraData.radiology_findings))}
                                        disabled={isReadOnly}
                                        onBlur={() => setRadiologySearch('')}
                                    />
                                    {radiologySearch && filteredLimsScans.length > 0 && (
                                        <div className="absolute top-full left-0 z-[100] mt-1 w-full max-w-sm p-1 bg-popover border rounded-xl shadow-xl max-h-[200px] overflow-auto animate-in fade-in zoom-in-95">
                                            <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/50">
                                                Scan Catalog
                                            </div>
                                            {filteredLimsScans.map((scan, idx) => (
                                                <button
                                                    key={scan.id}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-primary hover:text-white flex flex-col transition-colors group",
                                                        idx === activeRadiologyIndex && "bg-primary text-white"
                                                    )}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        const currentVal = extraData.radiology_findings || '';
                                                        const selectionStart = radiologyFindingsRef.current?.selectionStart || currentVal.length;
                                                        const lines = currentVal.substring(0, selectionStart).split('\n');
                                                        const lastLine = lines[lines.length - 1];
                                                        const before = currentVal.substring(0, selectionStart - lastLine.length);
                                                        const after = currentVal.substring(selectionStart);
                                                        const selectedName = scan.name.toUpperCase() + ': ';
                                                        onExtraChange('radiology_findings', before + selectedName + after, before.length + selectedName.length);
                                                        setRadiologySearch('');
                                                    }}
                                                >
                                                    <span className="font-medium">{scan.name}</span>
                                                    {scan.category && <span className={cn("text-[10px] italic", idx === activeRadiologyIndex ? "text-primary-foreground/70" : "text-muted-foreground")}>{scan.category}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attached Radiology Scans */}
                            {extraData.radiology_images && extraData.radiology_images.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Attached Scans</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {extraData.radiology_images.map((image, idx) => (
                                            <div key={image.fileId || idx} className="group relative flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20 overflow-hidden">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">{image.fileName}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Radiology Scan</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => window.open(`https://drive.google.com/file/d/${image.fileId}/view`, '_blank')}>
                                                        <Download className="h-3.5 h-3.5" />
                                                    </Button>
                                                    {!isReadOnly && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/5" onClick={() => {
                                                            const newList = [...(extraData.radiology_images || [])];
                                                            const img = newList[idx];
                                                            if (img.fileId) setPendingDeletions(prev => [...prev, img.fileId]);
                                                            newList.splice(idx, 1);
                                                            onExtraChange('radiology_images', newList);
                                                            toast.info('Scan removed.');
                                                        }}>
                                                            <X className="h-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Investigation Results Table - Occupying full width below the grid */}
                    {hasAnyInvestigationData && (
                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 overflow-hidden w-full">
                            {/* Investigation Results Table with Historical Trends */}
                            <div className="border rounded-lg overflow-x-auto bg-white shadow-sm border-slate-200">
                                <table className="w-full text-left border-collapse min-w-[400px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Parameter</th>
                                            <th className="px-2 py-1.5 text-[9px] font-bold text-slate-700 uppercase tracking-wider">Current</th>
                                            {allHistoryDates.map(date => (
                                                <th key={date} className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{date}</th>
                                            ))}
                                            <th className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Range</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayInvestigations.map((res) => {
                                            const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();
                                            return (
                                                <tr key={groupKey} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className={cn(
                                                        "px-2 py-1.5 text-[11px] font-semibold sticky left-0 bg-white z-10 border-r border-slate-100",
                                                        (res as any).isHistoricalOnly ? "text-slate-400" : "text-slate-700"
                                                    )}>
                                                        {res.name}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                value={editingInvestigation?.key === groupKey ? editingInvestigation.value : (res.value === '-' ? '' : String(res.value))}
                                                                onFocus={() => !isReadOnly && setEditingInvestigation({ key: groupKey, value: res.value === '-' ? '' : String(res.value) })}
                                                                onBlur={() => setEditingInvestigation(null)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEditingInvestigation({ key: groupKey, value: val });
                                                                    handleInvestigationValueChange(res, val);
                                                                }}
                                                                className={cn(
                                                                    "w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-[10px] font-bold",
                                                                    res.status === 'normal' && "text-emerald-700",
                                                                    (res.status === 'high' || res.status === 'low') && "text-amber-700",
                                                                    (res.status === 'critical-high' || res.status === 'critical-low') && "text-rose-700",
                                                                    res.status === 'unknown' && "text-slate-500 placeholder:text-slate-300"
                                                                )}
                                                                placeholder="-"
                                                                disabled={isReadOnly}
                                                            />
                                                            {res.criticalAlert && (
                                                                <div className="flex items-center gap-1 text-[8px] font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 animate-pulse shrink-0">
                                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                                    <span className="uppercase">{res.criticalAlert}</span>
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const history = investigationHistory?.[groupKey] || [];
                                                                const otherHistory = history.filter(h => String(h.consultationId) !== String(consultationId));
                                                                const hasCurrentValue = res.value !== '-' && res.value !== '';
                                                                const totalPoints = otherHistory.length + (hasCurrentValue ? 1 : 0);

                                                                if (totalPoints < 2) return null;

                                                                const latestHist = otherHistory
                                                                    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];

                                                                const currNum = parseFloat(String(res.value).replace(/[^0-9.-]/g, ''));
                                                                const prevNum = latestHist ? parseFloat(String(latestHist.value).replace(/[^0-9.-]/g, '')) : NaN;

                                                                if (isNaN(currNum) || isNaN(prevNum)) {
                                                                    return (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-5 w-5 text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0"
                                                                            onClick={() => handleOpenTrends(groupKey)}
                                                                            title={`Click to show trend for ${res.name}`}
                                                                        >
                                                                            <TrendingUp className="w-3 h-3" />
                                                                        </Button>
                                                                    );
                                                                }

                                                                const TrendIcon = currNum > prevNum ? TrendingUp : (currNum < prevNum ? TrendingDown : Minus);
                                                                const trendColor = currNum > prevNum ? "text-rose-500" : (currNum < prevNum ? "text-emerald-500" : "text-slate-300");

                                                                return (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={cn("h-5 w-5 hover:bg-primary/5 shrink-0", trendColor)}
                                                                        onClick={() => handleOpenTrends(groupKey)}
                                                                        title={`Click to show trend for ${res.name}`}
                                                                    >
                                                                        <TrendIcon className="w-3 h-3" />
                                                                    </Button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                    {allHistoryDates.map(date => {
                                                        const groupKey = res.id ? `${res.id}:${res.name.toLowerCase()}` : res.name.toLowerCase();
                                                        const hist = investigationHistory?.[groupKey]?.find(h =>
                                                            h.date &&
                                                            format(new Date(h.date), 'dd/MM/yy') === date &&
                                                            (!consultationId || h.consultationId !== consultationId)
                                                        );
                                                        return (
                                                            <td key={date} className="px-2 py-1.5 text-[10px] text-slate-400 tabular-nums">
                                                                {hist ? hist.value : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-2 py-1.5 text-[10px] text-slate-600 font-mono">
                                                        {res.range || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>


                {!isReadOnly && (
                    <>
                        <input
                            id="report-upload"
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={handleReportUpload}
                            disabled={uploadingReport}
                        />
                        <input
                            id="radiology-upload"
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={handleRadiologyUpload}
                            disabled={uploadingRadiology}
                        />
                    </>
                )}

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
                                                const currentList = extraData.referred_to_list || [];
                                                const hasData = currentList.some(str => str && str.trim().length > 0);
                                                if (!hasData) {
                                                    setIsReferredToExpanded(false);
                                                }
                                            }
                                        }}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="flex gap-1">
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
