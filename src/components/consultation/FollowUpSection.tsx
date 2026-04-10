import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn, calculateFollowUpDate } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface FollowUpSectionProps {
    followup: string;
    onExtraChange: (field: string, value: string, cursorPosition?: number | null) => void;
    followupRef: React.RefObject<HTMLTextAreaElement>;
    suggestedFollowup: (string | { text: string; translatedText?: string })[];
    onFollowupSuggestionClick: (val: string | { text: string; translatedText?: string }) => void;
    language: string;
    baseDate?: Date;
    initialFollowup?: string;
    isReadOnly?: boolean;
}

/**
 * FollowUpSection Component
 * 
 * Captures follow-up instructions.
 * Features:
 * - Textarea for free text.
 * - Quick suggestion buttons (e.g., "1 week", "3 days").
 * - Supports shortcut expansion via parent handler.
 */
export const FollowUpSection: React.FC<FollowUpSectionProps> = ({
    followup,
    onExtraChange,
    followupRef,
    suggestedFollowup,
    onFollowupSuggestionClick,
    language,
    baseDate,
    initialFollowup,
    isReadOnly = false
}) => {
    // Highlighting logic
    const getStyle = () => {
        if (initialFollowup === undefined) return "";

        const isUnchanged = String(followup).trim() === String(initialFollowup || '').trim();
        const hasContent = followup && String(followup).trim().length > 0;

        if (isUnchanged && hasContent) {
            return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
        }
        return "";
    };

    const calculatedDate = calculateFollowUpDate(followup, baseDate);

    const handleAdjustDate = (days: number) => {
        if (isReadOnly) return;
        
        // 1. Calculate the current target date
        const currentTargetDate = calculateFollowUpDate(followup, baseDate);
        if (!currentTargetDate) return;

        const dateObj = new Date(currentTargetDate);
        dateObj.setDate(dateObj.getDate() + days);
        
        // 2. Calculate the difference from baseDate in days
        const baseRef = baseDate || new Date();
        const diffMs = dateObj.getTime() - baseRef.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return;

        // 3. Generate smart text
        const isTelugu = language === 'te';
        let newCount, newUnit;
        
        if (diffDays % 30 === 0) {
            newCount = diffDays / 30;
            newUnit = isTelugu ? (newCount === 1 ? 'నెల' : 'నెలల') : (newCount === 1 ? 'month' : 'months');
        } else if (diffDays % 7 === 0) {
            newCount = diffDays / 7;
            newUnit = isTelugu ? (newCount === 1 ? 'వారం' : 'వారాల') : (newCount === 1 ? 'week' : 'weeks');
        } else {
            newCount = diffDays;
            newUnit = isTelugu ? (newCount === 1 ? 'రోజు' : 'రోజుల') : (newCount === 1 ? 'day' : 'days');
        }

        const newDurationText = `${newCount} ${newUnit}`;

        // 4. Regex to replace EXISTING duration/date/keyword in string
        // Order matters: match plural/inflected forms before singular forms to avoid partial matches
        const durationRegex = /(?:\d+)?\s*(days|day|weeks|week|months|month|years|year|రోజులు|రోజుల|రోజు|వారాలు|వారాల|వారం|నెలలు|నెలల|నెల|సంవత్సరాలు|సంవత్సరాల|సంవత్సరం)/i;
        const tomorrowRegex = /(tomorrow|రేపు)/i;
        const dateStrRegex = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})|(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/;
        
        let processedFollowup = followup;
        
        if (dateStrRegex.test(followup)) {
            const formattedDate = format(dateObj, 'dd-MM-yyyy');
            processedFollowup = followup.replace(dateStrRegex, formattedDate);
        } else if (tomorrowRegex.test(followup)) {
            processedFollowup = followup.replace(tomorrowRegex, newDurationText);
        } else if (durationRegex.test(followup)) {
            processedFollowup = followup.replace(durationRegex, newDurationText);
        } else {
            processedFollowup = `${followup} ${newDurationText}`.trim();
        }
        
        onExtraChange('followup', processedFollowup);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
                
                {calculatedDate && (
                    <div className="flex items-center gap-1 bg-muted/30 rounded-full border border-border/50 p-0.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => handleAdjustDate(-1)}
                            disabled={isReadOnly}
                        >
                            <Minus className="h-2.5 w-2.5" />
                        </Button>

                        {(() => {
                            const dateObj = new Date(calculatedDate);
                            const isSunday = dateObj.getDay() === 0;
                            const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                            return (
                                <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5",
                                    isSunday ? "text-red-600" : "text-primary"
                                )}>
                                    {dateObj.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'long' })} ({dayName})
                                </span>
                            );
                        })()}

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => handleAdjustDate(1)}
                            disabled={isReadOnly}
                        >
                            <Plus className="h-2.5 w-2.5" />
                        </Button>
                    </div>
                )}

                {suggestedFollowup.map((item) => {
                    const text = typeof item === 'string' ? item : item.text;
                    return (
                        <Button
                            key={text}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={() => onFollowupSuggestionClick(item)}
                            disabled={isReadOnly}
                        >
                            {text}
                        </Button>
                    );
                })}
            </div>
            <Textarea
                ref={followupRef}
                id="followup"
                value={followup}
                onChange={e => onExtraChange('followup', e.target.value, e.target.selectionStart)}
                placeholder="Follow-up instructions..."
                className={cn("min-h-[80px]", getStyle())}
                disabled={isReadOnly}
            />
        </div>
    );
};
