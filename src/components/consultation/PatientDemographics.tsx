import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { User, Folder, Calendar as CalendarIcon, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Patient } from '@/types/consultation';

interface PatientDemographicsProps {
    patient: Patient;
    visitType: string;
    onVisitTypeChange: (type: string) => void;
    lastVisitDate: string | null;
    onHistoryClick: () => void;

    onPatientDetailsChange: (field: string, value: string) => void;

    isPatientDatePickerOpen: boolean;
    setIsPatientDatePickerOpen: (open: boolean) => void;

    calendarDate: Date;
    setCalendarDate: (date: Date) => void;

    age: number | '';
    onAgeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    onDateChange: (date: Date | undefined) => void;
    handleYearChange: (year: string) => void;
    handleMonthChange: (month: string) => void;
}



/**
 * PatientDemographics Component
 * 
 * Renders the patient's personal information at the top of the consultation form.
 * Features:
 * - Editable Name and Phone
 * - Date of Birth with Age calculation sync
 * - Sex selection
 * - Visit Type toggle (Paid/Free)
 * - Link to Google Drive folder (if available)
 * - Access to consolidated Patient History
 */
export const PatientDemographics: React.FC<PatientDemographicsProps> = ({
    patient,
    visitType,
    onVisitTypeChange,
    lastVisitDate,
    onHistoryClick,
    onPatientDetailsChange,
    isPatientDatePickerOpen,
    setIsPatientDatePickerOpen,
    calendarDate,
    setCalendarDate,
    age,
    onAgeChange,
    onDateChange,
    handleYearChange,
    handleMonthChange,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        Demographic details of {patient.name}
                        <Badge
                            variant={visitType === 'free' ? 'secondary' : 'default'}
                            className={cn("cursor-pointer hover:opacity-80 select-none", visitType === 'free' ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-blue-100 text-blue-800 hover:bg-blue-200")}
                            onClick={() => onVisitTypeChange(visitType === 'paid' ? 'free' : 'paid')}
                        >
                            {visitType === 'free' ? 'Free' : 'Paid'}
                        </Badge>
                    </h3>
                    {lastVisitDate && (
                        <span className="text-sm text-muted-foreground">
                            {lastVisitDate === 'First Consultation' ? 'First Consultation' : `Last visit: ${lastVisitDate}`}
                        </span>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onHistoryClick}>
                        <History className="h-4 w-4" />
                        <span className="sr-only">View Patient History</span>
                    </Button>
                </div>
                {patient.drive_id && (
                    <a href={`https://drive.google.com/drive/folders/${patient.drive_id}`} target="_blank" rel="noreferrer">
                        <Folder className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                    </a>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={patient.name} onChange={e => onPatientDetailsChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={patient.phone} onChange={e => onPatientDetailsChange('phone', e.target.value)} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Popover open={isPatientDatePickerOpen} onOpenChange={setIsPatientDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !patient.dob && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {patient.dob ? format(new Date(patient.dob), "PPP") : <span>Select date</span>}
                                    {patient.is_dob_estimated && <span className="ml-2 text-xs opacity-70">(Est.)</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="p-3 border-b space-y-2">
                                    <div className="flex gap-2">
                                        <Select value={calendarDate.getMonth().toString()} onValueChange={handleMonthChange}>
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }).map((_, index) => (
                                                    <SelectItem key={index} value={index.toString()}>
                                                        {format(new Date(2000, index), 'MMMM')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={calendarDate.getFullYear().toString()} onValueChange={handleYearChange}>
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent className="max-h-48">
                                                {Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Calendar
                                    mode="single"
                                    selected={patient.dob ? new Date(patient.dob) : undefined}
                                    onSelect={onDateChange}
                                    month={calendarDate}
                                    onMonthChange={setCalendarDate}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                    className="p-3"
                                />
                            </PopoverContent>
                        </Popover>
                        <Input
                            id="age"
                            type="number"
                            placeholder="Age"
                            value={age}
                            onChange={onAgeChange}
                            className="w-full sm:w-24"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Select value={patient.sex} onValueChange={value => onPatientDetailsChange('sex', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
