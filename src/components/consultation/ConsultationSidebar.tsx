import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Search, UserPlus, BookOpen, Loader2, BarChart, Calendar as CalendarIcon, Stethoscope, CloudOff, Trash2, ChevronDown, Eye, EyeOff, Clock, Timer, Hourglass, UserCog, Filter, Check, X } from 'lucide-react';
import { cn, formatLocalTime } from '@/lib/utils';
import { format } from 'date-fns';
import { Consultation } from '@/types/consultation';
import { useHospitals } from '@/context/HospitalsContext';
import { useConsultant } from '@/context/ConsultantContext';
import { Input } from '@/components/ui/input';
import { addSeconds } from 'date-fns';
import { FamilyMemberManager } from './FamilyMemberManager';
import { HandbookSheet } from './HandbookSheet';
import { Badge } from '@/components/ui/badge';
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';

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
    personalNoteRef?: React.RefObject<HTMLTextAreaElement>;
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
    referredByRef?: React.RefObject<HTMLInputElement>;
    initialReferredBy?: string;
    onProfileClick?: () => void;
    onShortcutsClick?: () => void;
    hasChanges?: boolean;
    onNavigate?: (path: string) => void;
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
    personalNoteRef,
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
    referredByRef,
    initialReferredBy,
    onProfileClick,
    onShortcutsClick,
    hasChanges = false,
    onNavigate
}) => {
    const { hospitals } = useHospitals();
    const { consultant } = useConsultant();

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

    const [isHandbookOpen, setIsHandbookOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const [sexFilter, setSexFilter] = useState<'all' | 'male' | 'female'>('all');
    const [ageFilter, setAgeFilter] = useState<'all' | 'pediatric' | 'adult' | 'senior'>('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'paid' | 'free'>('all');

    const calculateAge = (dob: string) => {
        if (!dob) return 0;
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return 0;
        }
    };

    const applyFilters = (consultations: Consultation[]) => {
        return consultations.filter(c => {
            const matchesSearch = c.patient.name.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesSex = sexFilter === 'all' ||
                (sexFilter === 'male' && (c.patient.sex?.toLowerCase() === 'm' || c.patient.sex?.toLowerCase() === 'male')) ||
                (sexFilter === 'female' && (c.patient.sex?.toLowerCase() === 'f' || c.patient.sex?.toLowerCase() === 'female'));

            const age = calculateAge(c.patient.dob);
            const matchesAge = ageFilter === 'all' ||
                (ageFilter === 'pediatric' && age < 18) ||
                (ageFilter === 'adult' && age >= 18 && age <= 60) ||
                (ageFilter === 'senior' && age > 60);

            const matchesVisitType = visitTypeFilter === 'all' ||
                (visitTypeFilter === 'paid' && c.visit_type?.toLowerCase() === 'paid') ||
                (visitTypeFilter === 'free' && c.visit_type?.toLowerCase() === 'free');

            return matchesSearch && matchesSex && matchesAge && matchesVisitType;
        });
    };

    const filteredPending = applyFilters(pendingConsultations);
    const filteredEvaluation = applyFilters(evaluationConsultations);
    const filteredCompleted = applyFilters(completedConsultations);

    const visibleConsultations = [...filteredPending, ...filteredEvaluation, ...filteredCompleted];

    React.useEffect(() => {
        if (searchQuery.trim() !== '' && visibleConsultations.length === 1) {
            setHighlightedIndex(0);
        } else {
            setHighlightedIndex(-1);
        }

        if (searchQuery.trim() !== '') {
            if (filteredEvaluation.length > 0) setIsEvaluationCollapsed(false);
            if (filteredCompleted.length > 0) setIsCompletedCollapsed(false);
        }
    }, [searchQuery, filteredEvaluation.length, filteredCompleted.length, visibleConsultations.length, setIsEvaluationCollapsed, setIsCompletedCollapsed]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Focus search bar on mount
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        // Prevent sidebar navigation if a modal is open
        if (document.querySelector('[role="dialog"]')) return;

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
            } else if (visibleConsultations.length === 1) {
                const selected = visibleConsultations[0];
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
            {/* Consultant Profile Header */}
            {consultant && (
                <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Welcome,</span>
                        <span className="text-sm font-bold text-primary">
                            {typeof consultant.name === 'object'
                                ? consultant.name.en || consultant.name.te
                                : consultant.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            title="Handbook & Shortcuts"
                            onClick={() => setIsHandbookOpen(true)}
                        >
                            <BookOpen className="w-5 h-5 text-primary hover:text-primary/80" />
                        </Button>
                        {onProfileClick && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={onProfileClick}
                                id="profile-settings-button"
                            >
                                <UserCog className="h-5 w-5" />
                                <span className="sr-only">My Profile</span>
                            </Button>
                        )}
                    </div>
                </div>
            )}

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
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onSearchClick} title="Search Consultations">
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search Consultations</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" id="registration-button" onClick={onRegisterClick} title="Register New Patient">
                            <UserPlus className="h-4 w-4" />
                            <span className="sr-only">Register New Patient</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            title="Consultation Statistics"
                            onClick={() => onNavigate ? onNavigate('/stats') : window.location.href = '/stats'}
                        >
                            <BarChart className="w-5 h-5 text-primary hover:text-primary/80" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            title="Follow-up Dashboard"
                            onClick={() => onNavigate ? onNavigate('/followups') : window.location.href = '/followups'}
                        >
                            <CalendarIcon className="w-5 h-5 text-primary hover:text-primary/80" />
                        </Button>
                    </div>
                </div>
                <Popover open={isConsultationDatePickerOpen} onOpenChange={setIsConsultationDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date-picker-trigger"
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
                                ref={referredByRef}
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
                                ref={personalNoteRef}
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
                    <div className="flex gap-2">
                        <Input
                            ref={searchInputRef}
                            placeholder={`Search patients... (${typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
                                    ? '2 Finger Tap'
                                    : (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl') + '+D'
                                })`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="h-8"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 border-dashed bg-background/50 px-2">
                                    <Filter className="h-3.5 w-3.5" />
                                    {(sexFilter !== 'all' || ageFilter !== 'all' || visitTypeFilter !== 'all') && (
                                        <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal text-[10px] bg-primary/10 text-primary border-none">
                                            {([sexFilter, ageFilter, visitTypeFilter].filter(f => f !== 'all').length)}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="end">
                                <Command>
                                    <CommandList>
                                        <CommandGroup heading="Sex">
                                            <CommandItem onSelect={() => setSexFilter('all')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    sexFilter === 'all' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {sexFilter === 'all' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>All</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setSexFilter('male')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    sexFilter === 'male' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {sexFilter === 'male' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Male</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setSexFilter('female')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    sexFilter === 'female' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {sexFilter === 'female' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Female</span>
                                            </CommandItem>
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Age Group">
                                            <CommandItem onSelect={() => setAgeFilter('all')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    ageFilter === 'all' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {ageFilter === 'all' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>All Ages</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setAgeFilter('pediatric')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    ageFilter === 'pediatric' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {ageFilter === 'pediatric' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Pediatric (&lt;18)</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setAgeFilter('adult')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    ageFilter === 'adult' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {ageFilter === 'adult' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Adult (18-60)</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setAgeFilter('senior')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    ageFilter === 'senior' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {ageFilter === 'senior' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Senior (&gt;60)</span>
                                            </CommandItem>
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Visit Type">
                                            <CommandItem onSelect={() => setVisitTypeFilter('all')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    visitTypeFilter === 'all' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {visitTypeFilter === 'all' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>All Visits</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setVisitTypeFilter('paid')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    visitTypeFilter === 'paid' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {visitTypeFilter === 'paid' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Paid Visit</span>
                                            </CommandItem>
                                            <CommandItem onSelect={() => setVisitTypeFilter('free')}>
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    visitTypeFilter === 'free' ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {visitTypeFilter === 'free' && <Check className="h-3 w-3" />}
                                                </div>
                                                <span>Free Visit</span>
                                            </CommandItem>
                                        </CommandGroup>
                                        {(sexFilter !== 'all' || ageFilter !== 'all' || visitTypeFilter !== 'all') && (
                                            <>
                                                <CommandSeparator />
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setSexFilter('all');
                                                            setAgeFilter('all');
                                                            setVisitTypeFilter('all');
                                                        }}
                                                        className="justify-center text-center text-xs font-medium text-destructive hover:text-destructive"
                                                    >
                                                        Clear filters
                                                    </CommandItem>
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
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
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between px-3" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="truncate w-full text-left">{c.patient.name}</span>
                                                <span className="text-[10px] opacity-70 font-normal">
                                                    {formatLocalTime(c.created_at)}
                                                </span>
                                            </div>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500 shrink-0" />}
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
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between px-3" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="truncate w-full text-left">{c.patient.name}</span>
                                                <span className="text-[10px] opacity-70 font-normal">
                                                    {formatLocalTime(c.created_at)}
                                                </span>
                                            </div>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500 shrink-0" />}
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
                                        <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between px-3" onClick={() => {
                                            onSelectConsultation(c);
                                            setSearchQuery('');
                                        }}>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="truncate w-full text-left">{c.patient.name}</span>
                                                <span className="text-[10px] opacity-70 font-normal">
                                                    {formatLocalTime(c.created_at)}
                                                </span>
                                            </div>
                                            {(String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500 shrink-0" />}
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

            <HandbookSheet
                isOpen={isHandbookOpen}
                onClose={() => setIsHandbookOpen(false)}
                onShortcutsClick={onShortcutsClick}
                onProfileClick={onProfileClick}
            />
        </div>
    );
};
