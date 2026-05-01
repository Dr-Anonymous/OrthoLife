import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineSelectorProps {
    items: any[];
    activeId?: string;
    onSelect: (item: any) => void;
    getDate: (item: any) => Date | string | null | undefined;
    getLocation?: (item: any) => string | undefined;
    getConsultant?: (item: any) => string | undefined;
}

export const TimelineSelector: React.FC<TimelineSelectorProps> = ({
    items,
    activeId,
    onSelect,
    getDate,
    getLocation,
    getConsultant,
}) => {
    const [showHistory, setShowHistory] = React.useState(false);

    if (!items || items.length <= 1) return null;

    return (
        <div className="fixed right-6 bottom-24 flex flex-col items-end gap-3 z-40">
            {/* History Items - Floating Above Toggle */}
            <div 
                className={cn(
                    "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
                    showHistory 
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                        : "opacity-0 scale-95 translate-y-4 pointer-events-none"
                )}
            >
                <div className="flex flex-col items-end gap-2 max-h-[50vh] overflow-y-auto no-scrollbar py-2 px-2">
                    {items.map((item, idx) => {
                        const dateVal = getDate(item);
                        const dateText = dateVal ? format(new Date(dateVal), 'dd MMM yyyy') : 'No Date';
                        const locationText = getLocation ? getLocation(item) : '';
                        const consultantText = getConsultant ? getConsultant(item) : '';
                        const nameStr = typeof consultantText === 'object' && consultantText 
                            ? ((consultantText as any).en || (consultantText as any).te || '') 
                            : (consultantText || '');
                        const labelText = `${dateText}${locationText ? ` at ${locationText}` : ''}${nameStr ? ` with ${nameStr}` : ''}`;
                        const isSelected = activeId === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onSelect(item);
                                    setShowHistory(false);
                                }}
                                className={cn(
                                    "px-4 py-2.5 rounded-2xl border flex items-center justify-start text-left bg-white shadow-lg transition-all duration-300 shrink-0 select-none max-w-[calc(100vw-3.5rem)] sm:max-w-sm",
                                    isSelected 
                                        ? "border-primary bg-primary text-white scale-105 font-bold ring-4 ring-primary/20" 
                                        : "border-muted text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted/30"
                                )}
                            >
                                <span className="text-xs font-semibold break-words">
                                    {labelText}
                                    {idx === 0 && " (Latest)"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggle Button */}
            <Button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                    "h-12 w-12 rounded-full shadow-lg transition-all duration-300 p-0",
                    showHistory ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-primary"
                )}
                size="icon"
            >
                {showHistory ? <X className="h-6 w-6 text-white" /> : <History className="h-6 w-6 text-white" />}
            </Button>
        </div>
    );
};
