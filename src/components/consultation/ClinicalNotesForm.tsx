import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import AutosuggestInput from '@/components/ui/AutosuggestInput';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
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
    };
    onExtraChange: (field: string, value: string, cursorPosition?: number | null) => void;

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
}

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
    referralDoctors
}) => {
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
                        className="min-h-[100px]"
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
                        className="min-h-[100px]"
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
                        className="min-h-[100px]"
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
                        className="min-h-[100px]"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label
                    htmlFor="procedure"
                    className="text-sm font-medium cursor-pointer hover:underline"
                    onClick={() => setIsProcedureExpanded(!isProcedureExpanded)}
                >
                    Procedure Done {(!extraData.procedure && !isProcedureExpanded) && <span className="text-muted-foreground text-xs">(click to add)</span>}
                </Label>
                {(extraData.procedure || isProcedureExpanded) && (
                    <Textarea
                        ref={procedureRef}
                        id="procedure"
                        value={extraData.procedure}
                        onChange={e => onExtraChange('procedure', e.target.value, e.target.selectionStart)}
                        placeholder="Procedure done..."
                        className="min-h-[80px]"
                    />
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
                    <LanguageSwitcher />
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
                    className="min-h-[80px]"
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
                    className="text-sm font-medium cursor-pointer hover:underline"
                    onClick={() => setIsReferredToExpanded(!isReferredToExpanded)}
                >
                    Referred To {(!extraData.referred_to && !isReferredToExpanded) && <span className="text-muted-foreground text-xs">(click to add)</span>}
                </Label>
                {(extraData.referred_to || isReferredToExpanded) && (
                    <AutosuggestInput
                        ref={referredToRef}
                        value={extraData.referred_to}
                        onChange={value => onExtraChange('referred_to', value, (referredToRef.current as any)?.selectionStart || value.length)}
                        suggestions={referralDoctors.map(d => ({
                            id: d.id,
                            name: `${d.name}${d.specialization ? `, ${d.specialization}` : ''}${d.address ? `, ${d.address}` : ''}${d.phone ? `, ${d.phone}` : ''}`
                        }))}
                        onSuggestionSelected={suggestion => onExtraChange('referred_to', suggestion.name)}
                        placeholder="Referred to..."
                    />
                )}
            </div>


        </>
    );
};
