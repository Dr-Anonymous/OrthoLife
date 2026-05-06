import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn, calculateFollowUpDate, getNextFollowUpText } from '@/lib/utils';
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
        const processedFollowup = getNextFollowUpText(followup, days, baseDate || new Date(), language);
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
                            // Parse YYYY-MM-DD manually to create local Date object for display
                            const [y, m, d] = String(calculatedDate).split('-').map(Number);
                            const dateObj = new Date(y, m - 1, d);
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
            {!isReadOnly && <p className="text-[10px] text-muted-foreground/70 leading-none mt-1">Speed tip: Use custom shorthand (like <code className="font-bold">2w.</code>) to write "after 2 weeks".</p>}
        </div>
    );
};
