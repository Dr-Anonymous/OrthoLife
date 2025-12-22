import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FollowUpSectionProps {
    followup: string;
    onExtraChange: (field: string, value: string, cursorPosition?: number | null) => void;
    followupRef: React.RefObject<HTMLTextAreaElement>;
    suggestedFollowup: string[];
    onFollowupSuggestionClick: (val: string) => void;
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
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
                {suggestedFollowup.map((item) => (
                    <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() => onFollowupSuggestionClick(item)}
                    >
                        {item}
                    </Button>
                ))}
            </div>
            <Textarea
                ref={followupRef}
                id="followup"
                value={followup}
                onChange={e => onExtraChange('followup', e.target.value, e.target.selectionStart)}
                placeholder="Follow-up instructions..."
                className="min-h-[80px]"
            />
        </div>
    );
};
