import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Search, UserPlus, RefreshCw, Loader2, BarChart, Calendar as CalendarIcon, Stethoscope, CloudOff, Trash2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Consultation } from '@/types/consultation';
import { HOSPITALS } from '@/config/constants';

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
    onSelectConsultation: (consultation: Consultation) => void;
    onDeleteClick: (e: React.MouseEvent, consultation: Consultation) => void;

    pendingSyncIds: string[];

    personalNote: string;
    onPersonalNoteChange: (value: string) => void;

    isEvaluationCollapsed: boolean;
    setIsEvaluationCollapsed: (collapsed: boolean) => void;
    isCompletedCollapsed: boolean;
    setIsCompletedCollapsed: (collapsed: boolean) => void;

    isTimerVisible: boolean;
    setIsTimerVisible: (visible: boolean) => void;
    timerSeconds: number;
}

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
    onSelectConsultation,
    onDeleteClick,
    pendingSyncIds,
    personalNote,
    onPersonalNoteChange,
    isEvaluationCollapsed,
    setIsEvaluationCollapsed,
    isCompletedCollapsed,
    setIsCompletedCollapsed,
    isTimerVisible,
    setIsTimerVisible,
    timerSeconds
}) => {
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    return (
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-2rem)] lg:overflow-y-auto pr-2">
            <div className="flex items-center gap-2">
                <Label htmlFor="location-select" className="flex-shrink-0">Location</Label>
                <Select value={selectedHospitalName} onValueChange={(value) => onHospitalSelect(value)}>
                    <SelectTrigger id="location-select" className="flex-grow">
                        <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                        {HOSPITALS.map(hospital => (
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
                        <Link to="/consultation-stats">
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
            {selectedConsultationId && (
                <div className="space-y-2 p-3 bg-secondary/10 rounded-md border border-secondary/20">
                    <Label htmlFor="personalNoteSidebar" className="text-sm font-medium flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        Doctor's Personal Note
                    </Label>
                    <Textarea
                        id="personalNoteSidebar"
                        value={personalNote}
                        onChange={e => onPersonalNoteChange(e.target.value)}
                        placeholder="Private notes..."
                        className="min-h-[100px] text-sm bg-background/50 resize-y"
                    />
                </div>
            )}
            <div className="space-y-4">
                <div className="font-semibold">
                    Total Consultations: {totalConsultationsCount}
                </div>
                <div>
                    <Label>Pending Consultations: {pendingConsultations.length}</Label>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                            {pendingConsultations.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => onSelectConsultation(c)}>
                                        <span>{c.patient.name}</span>
                                        {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No pending consultations.</p>}
                        </div>
                    )}
                </div>
                <div>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsEvaluationCollapsed(!isEvaluationCollapsed)}>
                        <Label className="cursor-pointer">Under Evaluation: {evaluationConsultations.length}</Label>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isEvaluationCollapsed && "rotate-180")} />
                    </Button>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isEvaluationCollapsed ? "max-h-0" : "max-h-60")}>
                            {evaluationConsultations.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => onSelectConsultation(c)}>
                                        <span>{c.patient.name}</span>
                                        {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {evaluationConsultations.length === 0 && <p className="text-sm text-muted-foreground">No consultations under evaluation.</p>}
                        </div>
                    )}
                </div>
                <div>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent" onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}>
                        <Label className="cursor-pointer">Completed Consultations: {completedConsultations.length}</Label>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", !isCompletedCollapsed && "rotate-180")} />
                    </Button>
                    {isFetchingConsultations ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className={cn("space-y-2 mt-2 transition-all overflow-y-auto", isCompletedCollapsed ? "max-h-0" : "max-h-60")}>
                            {completedConsultations.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <Button variant={selectedConsultationId === c.id ? 'default' : 'outline'} className="flex-grow justify-between" onClick={() => onSelectConsultation(c)}>
                                        <span>{c.patient.name}</span>
                                        {(pendingSyncIds.includes(c.id) || String(c.patient.id).startsWith('offline-')) && <CloudOff className="h-4 w-4 text-yellow-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0" onClick={(e) => onDeleteClick(e, c)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {completedConsultations.length === 0 && <p className="text-sm text-muted-foreground">No completed consultations.</p>}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center mt-4">
                    {isTimerVisible && (
                        <div className="text-lg font-semibold">
                            {formatTime(timerSeconds)}
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setIsTimerVisible(!isTimerVisible)}>
                        {isTimerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};
