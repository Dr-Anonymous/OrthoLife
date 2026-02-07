import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Search, UserPlus, RefreshCw, Loader2, BarChart, Calendar as CalendarIcon, Stethoscope, CloudOff, Trash2, ChevronDown, Eye, EyeOff, Clock, Timer, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Consultation } from '@/types/consultation';
import { useHospitals } from '@/context/HospitalsContext';
import { Input } from '@/components/ui/input';
import { addSeconds } from 'date-fns';
import { FamilyMemberManager } from './FamilyMemberManager';

interface ConsultationSidebarProps {
    selectedHospitalName: string;
    onHospitalSelect: (name: string) => void;
    isGpsEnabled: boolean;
    onToggleGps: () => void;

    selectedDate: Date | undefined;
    onDateChange: (date: Date | undefined) => void;
    isConsultationDatePickerOpen: boolean;
    setIsConsultationDatePickerOpen: (open: boolean) => void;

    onSearchClick: () => void;
    onRegisterClick: () => void;
    onRefreshClick: () => void;

    isFetchingConsultations: boolean;

    totalConsultationsCount: number;
    pendingConsultations: Consultation[];
    evaluationConsultations: Consultation[];
    completedConsultations: Consultation[];

    selectedConsultationId: string | undefined;
    selectedConsultation?: Consultation | null;
    onSelectConsultation: (consultation: Consultation) => void;
    onDeleteClick: (e: React.MouseEvent, consultation: Consultation) => void;
    onShowPatientHistory: (patientId: string) => void;



    personalNote: string;
    onPersonalNoteChange: (value: string) => void;
    initialPersonalNote?: string;

    isEvaluationCollapsed: boolean;
    setIsEvaluationCollapsed: (collapsed: boolean) => void;
    isCompletedCollapsed: boolean;
    setIsCompletedCollapsed: (collapsed: boolean) => void;

    isTimerVisible: boolean;
    setIsTimerVisible: (visible: boolean) => void;

    timerSeconds: number;
    referredBy: string;
    onReferredByChange: (value: string) => void;
    initialReferredBy?: string;
}

/**
 * ConsultationSidebar Component
 * 
 * Displays the list of consultations (Pending, Evaluation, Completed) and sidebar controls.
 * Features:
 * - Hospital/Location selection with GPS toggle
 * - Date selection via Calendar
 * - Consultation status filtering (Pending/Evaluation/Completed)
 * - Navigation buttons (Search, Register, Refresh)
 */
export const ConsultationSidebar: React.FC<ConsultationSidebarProps> = ({
    selectedHospitalName,
    onHospitalSelect,
    isGpsEnabled,
    onToggleGps,
    selectedDate,
    onDateChange,
    isConsultationDatePickerOpen,
    setIsConsultationDatePickerOpen,
    onSearchClick,
    onRegisterClick,
    onRefreshClick,
    isFetchingConsultations,
    totalConsultationsCount,
    pendingConsultations,
    evaluationConsultations,
    completedConsultations,
    selectedConsultationId,
    selectedConsultation,
    onSelectConsultation,
    onDeleteClick,
    onShowPatientHistory,
    personalNote,
    onPersonalNoteChange,
    initialPersonalNote,
    isEvaluationCollapsed,
    setIsEvaluationCollapsed,
    isCompletedCollapsed,
    setIsCompletedCollapsed,
    isTimerVisible,
    setIsTimerVisible,
    timerSeconds,
    referredBy,
    onReferredByChange,
    initialReferredBy
}) => {
    const { hospitals } = useHospitals();

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const [isPersonalNoteExpanded, setIsPersonalNoteExpanded] = useState(!!personalNote);
    const [isReferredByExpanded, setIsReferredByExpanded] = useState(!!referredBy);

    // Reset expanded states when consultation changes
    React.useEffect(() => {
        setIsPersonalNoteExpanded(!!personalNote);
        setIsReferredByExpanded(!!referredBy);
    }, [selectedConsultationId, personalNote, referredBy]);


    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const filteredPending = pendingConsultations.filter(c => c.patient.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredEvaluation = evaluationConsultations.filter(c => c.patient.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredCompleted = completedConsultations.filter(c => c.patient.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const visibleConsultations = [...filteredPending, ...filteredEvaluation, ...filteredCompleted];

    React.useEffect(() => {
        setHighlightedIndex(-1);
    }, [searchQuery]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (visibleConsultations.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % visibleConsultations.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + visibleConsultations.length) % visibleConsultations.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < visibleConsultations.length) {
                const selected = visibleConsultations[highlightedIndex];
                onSelectConsultation(selected);
                setSearchQuery('');
                setHighlightedIndex(-1);
            }
        }
    };

    // --- Timer Calculations ---
    const completedWithDuration = completedConsultations.filter(c => (c.duration || 0) > 0);
    const avgDurationSeconds = completedWithDuration.length > 0
        ? completedWithDuration.reduce((acc, curr) => acc + (curr.duration || 0), 0) / completedWithDuration.length
        : 0;

    const remainingCount = pendingConsultations.length + evaluationConsultations.length;

    // Heuristic: If we are currently in a consultation (timerSeconds > 0), we might subtract "time elapsed" from that specific slot,
    // but a simple "Average * Count" added to "Current Time" is usually sufficient and stable.
    // However, if we just finished one, avg updates.

    let estimatedEndTime: Date | null = null;
    let estimatedEndTimeElement = <span>--:--</span>;

    if (avgDurationSeconds > 0) {
        const totalRemainingSeconds = remainingCount * avgDurationSeconds;
        // If there's an active timer, maybe we count the current one as partially done?
        // Let's stick to simple: Now + (Remaining * Avg). 
        // Note: remainingCount includes the current one if it's in evaluation/pending list.
        estimatedEndTime = addSeconds(new Date(), totalRemainingSeconds);
        estimatedEndTimeElement = <span>{format(estimatedEndTime, 'h:mm a')}</span>;
    }

    const avgMinutes = avgDurationSeconds > 0 ? Math.round(avgDurationSeconds / 60) : 0;


    return (
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-2rem)] lg:overflow-y-auto pr-2">
            <div className="flex items-center gap-2">
                <Label htmlFor="location-select" className="flex-shrink-0">Location</Label>
                <Select value={selectedHospitalName} onValueChange={(value) => onHospitalSelect(value)}>
                    <SelectTrigger id="location-select" className="flex-grow">
                        <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                        {hospitals.map(hospital => (
                            <SelectItem key={hospital.name} value={hospital.name}>
                                {hospital.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={onToggleGps}>
                    <MapPin className={cn("h-4 w-4", isGpsEnabled ? "text-blue-500 fill-blue-200" : "text-muted-foreground")} />
                    <span className="sr-only">Toggle GPS selection</span>
                </Button>
            </div>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <Label>Consultation Date</Label>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onSearchClick}>
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search Consultations</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRegisterClick}>
                            <UserPlus className="h-4 w-4" />
                            <span className="sr-only">Register New Patient</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRefreshClick} disabled={isFetchingConsultations}>
                            {isFetchingConsultations ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="sr-only">Refresh</span>
                        </Button>
                        <Link to="/stats">
                            <BarChart className="w-5 h-5 text-primary hover:text-primary/80" />
                        </Link>
                    </div>
                </div>
                <Popover open={isConsultationDatePickerOpen} onOpenChange={setIsConsultationDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={onDateChange}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            {selectedConsultationId && selectedConsultation && (
                <div className="space-y-4">
                    {/* Referred By Field */}
                    <div className={cn(
                        "transition-all duration-300 rounded-md p-3 border space-y-2",
                        (() => {
                            const isReferredByAutofilled = initialReferredBy && referredBy && String(referredBy).trim() === String(initialReferredBy).trim() && String(referredBy).trim().length > 0;
                            return isReferredByAutofilled
                                ? "bg-amber-50/80 border-amber-200 shadow-sm"
                                : "bg-secondary/10 border-secondary/20";
                        })()
                    )}>
                        <Label
                            className={cn(
                                "text-sm font-medium flex items-center gap-2 cursor-pointer select-none hover:underline",
                                (() => {
                                    const isReferredByAutofilled = initialReferredBy && referredBy && String(referredBy).trim() === String(initialReferredBy).trim() && String(referredBy).trim().length > 0;
                                    return isReferredByAutofilled ? "text-amber-900" : "text-foreground";
                                })()
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsReferredByExpanded(!isReferredByExpanded);
                            }}
                        >
                            <UserPlus className={cn("w-4 h-4", (() => {
                                const isReferredByAutofilled = initialReferredBy && referredBy && String(referredBy).trim() === String(initialReferredBy).trim() && String(referredBy).trim().length > 0;
                                return isReferredByAutofilled ? "text-amber-600" : "text-primary";
                            })())} />
                            Referred By
                            {(!isReferredByExpanded && !referredBy) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                        </Label>

                        {(referredBy || isReferredByExpanded) && (
                            <Input
                                value={referredBy}
                                onChange={e => onReferredByChange(e.target.value)}
                                placeholder="Referrer name..."
                                className={cn(
                                    "mt-1 text-sm transition-all",
                                    "bg-background/50"
                                )}
                                autoFocus={isReferredByExpanded && !referredBy}
                                onBlur={() => {
                                    if (!referredBy || referredBy.trim() === '') {
                                        setIsReferredByExpanded(false);
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Personal Note Field */}
                    <div className={cn(
                        "transition-all duration-300 rounded-md p-3 border space-y-2",
                        (() => {
                            const isPersonalNoteAutofilled = initialPersonalNote && personalNote && String(personalNote).trim() === String(initialPersonalNote).trim() && String(personalNote).trim().length > 0;
                            return isPersonalNoteAutofilled
                                ? "bg-amber-50/80 border-amber-200 shadow-sm"
                                : "bg-secondary/10 border-secondary/20";
                        })()
                    )}>
                        <Label
                            className={cn(
                                "text-sm font-medium flex items-center gap-2 cursor-pointer select-none hover:underline",
                                (() => {
                                    const isPersonalNoteAutofilled = initialPersonalNote && personalNote && String(personalNote).trim() === String(initialPersonalNote).trim() && String(personalNote).trim().length > 0;
                                    return isPersonalNoteAutofilled ? "text-amber-900" : "text-foreground";
                                })()
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsPersonalNoteExpanded(!isPersonalNoteExpanded);
                            }}
                        >
                            <Stethoscope className={cn("w-4 h-4", personalNote ? "text-amber-600" : "text-primary")} />
                            Doctor's Personal Note
                            {/* Only show chevron if not expanded AND empty (prompt to open) */}
                            {(!isPersonalNoteExpanded && !personalNote) && <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
                        </Label>

                        {(personalNote || isPersonalNoteExpanded) && (
                            <Textarea
                                id="personalNoteSidebar"
                                value={personalNote}
                                onChange={e => onPersonalNoteChange(e.target.value)}
                                placeholder="Private notes..."
                                className={cn(
                                    "min-h-[100px] text-sm resize-y transition-all",
                                    (() => {
                                        if (!initialPersonalNote) return "bg-background/50";
                                        const isUnchanged = String(personalNote).trim() === String(initialPersonalNote).trim();
                                        const hasContent = personalNote && String(personalNote).trim().length > 0;
                                        return (isUnchanged && hasContent)
                                            ? "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40"
                                            : "bg-background/50";
                                    })()
                                )}
                                autoFocus={isPersonalNoteExpanded && !personalNote}
                                onBlur={() => {
                                    if (!personalNote || personalNote.trim() === '') {
                                        setIsPersonalNoteExpanded(false);
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {selectedConsultationId && selectedConsultation && (
                <FamilyMemberManager
                    currentPatientId={String(selectedConsultation.patient.id)}
                    currentPatientName={selectedConsultation.patient.name}
                    onSelectPatient={(p) => {
                        // Check if this patient has a consultation in the visible list
                        // If so, switch to it. If not, maybe show a toast or navigation hint.
                        const consultation = visibleConsultations.find(c => String(c.patient.id) === String(p.id));
                        if (consultation) {
                            onSelectConsultation(consultation);
                        } else {
                            // If navigation to history is needed, we'd need more logic. 
                            // For now, simple indication.
                        }
                    }}
                    onViewHistory={onShowPatientHistory}
                />
            )}
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="font-semibold">
                        Total Consultations: {totalConsultationsCount}
                    </div>
                    <Input
                        ref={searchInputRef}
                        placeholder="Search patients... (Cmd+D)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="h-8"
                    />
                </div>
                <div>
                    <Label>Pending Consultations: {filteredPending.length}</Label>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                            {filteredPending.map((c, idx) => {
                                const globalIndex = idx;
                                const isHighlighted = globalIndex === highlightedIndex;
                                return (
                                    <div key={c.id} className={cn("flex items-center gap-2 p-1 rounded-md", isHighlighted && "bg-accent")}>
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <span>{c.patient.name}</span>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                            {filteredPending.length === 0 && <p className="text-sm text-muted-foreground">No pending consultations.</p>}
                        </div>
                    )}
                </div>
                <div>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsEvaluationCollapsed(!isEvaluationCollapsed)}>
                        <Label className="cursor-pointer">Under Evaluation: {filteredEvaluation.length}</Label>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isEvaluationCollapsed && "rotate-180")} />
                    </Button>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isEvaluationCollapsed ? "max-h-0" : "max-h-60")}>
                            {filteredEvaluation.map((c, idx) => {
                                const globalIndex = filteredPending.length + idx;
                                const isHighlighted = globalIndex === highlightedIndex;
                                return (
                                    <div key={c.id} className={cn("flex items-center gap-2 p-1 rounded-md", isHighlighted && "bg-accent")}>
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <span>{c.patient.name}</span>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                            {filteredEvaluation.length === 0 && <p className="text-sm text-muted-foreground">No consultations under evaluation.</p>}
                        </div>
                    )}
                </div>
                <div>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}>
                        <Label className="cursor-pointer">Completed Consultations: {filteredCompleted.length}</Label>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isCompletedCollapsed && "rotate-180")} />
                    </Button>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isCompletedCollapsed ? "max-h-0" : "max-h-60")}>
                            {filteredCompleted.map((c, idx) => {
                                const globalIndex = filteredPending.length + filteredEvaluation.length + idx;
                                const isHighlighted = globalIndex === highlightedIndex;
                                return (
                                    <div key={c.id} className={cn("flex items-center gap-2 p-1 rounded-md", isHighlighted && "bg-accent")}>
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <span>{c.patient.name}</span>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                            {filteredCompleted.length === 0 && <p className="text-sm text-muted-foreground">No completed consultations.</p>}
                        </div>
                    )}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Time Tracking
                        </Label>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsTimerVisible(!isTimerVisible)}>
                            {isTimerVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                    </div>

                    {isTimerVisible && (
                        <div className="grid grid-cols-3 gap-2 text-center bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    Current
                                </span>
                                <span className={cn("text-lg font-bold font-mono", timerSeconds > 600 ? "text-amber-600" : "text-primary")}>
                                    {formatTime(timerSeconds)}
                                </span>
                            </div>

                            <div className="flex flex-col items-center border-l border-r border-border/50 px-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Avg
                                </span>
                                <span className="text-lg font-semibold">
                                    {avgMinutes > 0 ? `${avgMinutes}m` : '--'}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                    <Hourglass className="w-3 h-3" />
                                    Est. End
                                </span>
                                <span className="text-sm font-semibold mt-1">
                                    {estimatedEndTimeElement}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
