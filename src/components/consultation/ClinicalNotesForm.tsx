
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { LanguageSwitcher } from '@/components/LanguageSwitcher'; // Removed in favor of controlled input
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { Trash2, Plus, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchedGuide } from '@/types/consultation';

interface ClinicalNotesFormProps {
    extraData: {
        complaints: string;
        findings: string;
        investigations: string;
        diagnosis: string;
        procedure: string;
        advice: string;
        followup: string;
        referred_to: string;
        referred_to_list?: string[];
    };
    onExtraChange: (field: string, value: any, cursorPosition?: number | null) => void;

    // Refs
    complaintsRef: React.RefObject<HTMLTextAreaElement>;
    findingsRef: React.RefObject<HTMLTextAreaElement>;
    investigationsRef: React.RefObject<HTMLTextAreaElement>;
    diagnosisRef: React.RefObject<HTMLTextAreaElement>;
    procedureRef: React.RefObject<HTMLTextAreaElement>;
    adviceRef: React.RefObject<HTMLTextAreaElement>;
    followupRef: React.RefObject<HTMLTextAreaElement>;
    referredToRef: React.RefObject<any>; // Typings for AutosuggestInput ref might be tricky

    // Suggestions
    suggestedInvestigations: string[];
    suggestedAdvice: string[];
    suggestedFollowup: string[];

    onInvestigationSuggestionClick: (val: string) => void;
    onAdviceSuggestionClick: (val: string) => void;
    onFollowupSuggestionClick: (val: string) => void;

    matchedGuides: MatchedGuide[];

    isProcedureExpanded: boolean;
    setIsProcedureExpanded: (val: boolean) => void;
    isReferredToExpanded: boolean;
    setIsReferredToExpanded: (val: boolean) => void;

    referralDoctors: { id: string, name: string, specialization?: string, address?: string, phone?: string }[];
    language: string;
    onLanguageChange: (lang: string) => void;
    initialData?: Partial<ClinicalNotesFormProps['extraData']>;
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
    findingsRef,
    investigationsRef,
    diagnosisRef,
    procedureRef,
    adviceRef,
    followupRef,
    referredToRef,
    suggestedInvestigations,
    suggestedAdvice,
    suggestedFollowup,
    onInvestigationSuggestionClick,
    onAdviceSuggestionClick,
    onFollowupSuggestionClick,
    matchedGuides,
    isProcedureExpanded,
    setIsProcedureExpanded,
    isReferredToExpanded,
    setIsReferredToExpanded,
    referralDoctors,
    language,
    onLanguageChange,
    initialData
}) => {
    // Helper to determine if a field is autofilled (unchanged from initial) and highlighted
    const getStyle = (field: keyof typeof extraData, value: any) => {
        if (!initialData) return "bg-background/50";

        const initialValue = initialData[field];
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
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                    <Textarea
                        ref={findingsRef}
                        id="findings"
                        value={extraData.findings}
                        onChange={e => onExtraChange('findings', e.target.value, e.target.selectionStart)}
                        placeholder="Clinical findings..."
                        className={cn("min-h-[100px]", getStyle('findings', extraData.findings))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                        {suggestedInvestigations.map((investigation) => (
                            <Button key={investigation} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => onInvestigationSuggestionClick(investigation)}>
                                {investigation}
                            </Button>
                        ))}
                    </div>
                    <Textarea
                        ref={investigationsRef}
                        id="investigations"
                        value={extraData.investigations}
                        onChange={e => onExtraChange('investigations', e.target.value, e.target.selectionStart)}
                        placeholder="Investigations required..."
                        className={cn("min-h-[100px]", getStyle('investigations', extraData.investigations))}
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
                    />
                </div>
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
                        >
                            EN
                        </Button>
                        <Button
                            type="button"
                            variant={language === 'te' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onLanguageChange('te')}
                        >
                            తె
                        </Button>
                    </div>

                    {suggestedAdvice.map((advice) => (
                        <Button key={advice} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => onAdviceSuggestionClick(advice)}>
                            {advice}
                        </Button>
                    ))}
                </div>
                <Textarea
                    ref={adviceRef}
                    id="advice"
                    value={extraData.advice}
                    onChange={e => onExtraChange('advice', e.target.value, e.target.selectionStart)}
                    placeholder="Medical advice..."
                    className={cn("min-h-[80px]", getStyle('advice', extraData.advice))}
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

            {/* Referred To and Followup - keeping in ClinicalNotes as implied by "Notes" structure */}
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
                                    onChange={value => {
                                        const newList = [...(extraData.referred_to_list && extraData.referred_to_list.length > 0 ? extraData.referred_to_list : [''])];
                                        newList[index] = value;
                                        onExtraChange('referred_to_list', newList);
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
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )))}
            </div>
        </>
    );
};
