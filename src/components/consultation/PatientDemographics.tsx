import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarWithMonthYearPicker } from '@/components/ui/calendar-with-month-year';
import { Badge } from '@/components/ui/badge';
import { User, Folder, Calendar as CalendarIcon, History, Link as LinkIcon, Phone, Briefcase, MapPin, Users, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Patient } from '@/types/consultation';

interface PatientDemographicsProps {
    patient: Patient;
    visitType: string;
    onVisitTypeChange: (type: string) => void;
    lastVisitDate: string | null;
    onHistoryClick?: () => void;

    onPatientDetailsChange: (field: string, value: string) => void;

    isPatientDatePickerOpen: boolean;
    setIsPatientDatePickerOpen: (open: boolean) => void;

    age: number | '';
    onAgeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    onDateChange: (date: Date | undefined) => void;
    onLinkClick: () => void;
    isReadOnly?: boolean;
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
    age,
    onAgeChange,
    onDateChange,
    onLinkClick,
    isReadOnly = false,
}) => {
    const [showSecondaryPhone, setShowSecondaryPhone] = React.useState(false);

    React.useEffect(() => {
        setShowSecondaryPhone(Boolean(patient.secondary_phone));
    }, [patient.secondary_phone]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between mb-6 pb-2 border-b border-primary/10">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Patient Demographics</h3>
                    
                    <div className="flex items-center gap-1.5 ml-1">
                        <Badge
                            variant={visitType === 'free' ? 'secondary' : 'default'}
                            className={cn(
                                "text-[10px] h-5 px-1.5 uppercase tracking-wider font-extrabold cursor-pointer hover:opacity-80 select-none", 
                                visitType === 'free' ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            )}
                            onClick={() => onVisitTypeChange(visitType === 'paid' ? 'free' : 'paid')}
                        >
                            {visitType === 'free' ? 'Free' : 'Paid'}
                        </Badge>

                        {lastVisitDate && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal text-[10px] h-5 whitespace-nowrap">
                                {lastVisitDate}
                            </Badge>
                        )}

                        {isReadOnly && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 text-[10px] h-5">
                                <CalendarIcon className="w-3 h-3" />
                                Read Only
                            </Badge>
                        )}
                        
                        <div className="flex items-center gap-0.5 ml-1">
                            {onHistoryClick && (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10 transition-colors" onClick={onHistoryClick} title="View Patient History">
                                    <History className="h-4 w-4 text-primary" />
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-orange-50 transition-colors" onClick={onLinkClick} title="Link Duplicate Patient">
                                <LinkIcon className="h-4 w-4 text-orange-500" />
                            </Button>
                        </div>
                    </div>
                </div>
                {patient.drive_id && (
                    <a 
                        href={`https://drive.google.com/drive/folders/${patient.drive_id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                        title="View Drive Folder"
                    >
                        <Folder className="w-5 h-5 text-blue-500" />
                    </a>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input id="name" value={patient.name} onChange={e => onPatientDetailsChange('name', e.target.value)} disabled={isReadOnly} className="pl-9" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2 relative">
                        <div className="relative flex-1">
                            <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 z-10" />
                            <Input id="phone" value={patient.phone} onChange={e => onPatientDetailsChange('phone', e.target.value)} className="pl-9" />
                        </div>
                        {showSecondaryPhone && (
                            <>
                                <div className="flex items-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full hover:bg-primary/10 transition-colors shrink-0"
                                        onClick={() => {
                                            const primary = patient.phone;
                                            const secondary = patient.secondary_phone || '';
                                            onPatientDetailsChange('phone', secondary);
                                            onPatientDetailsChange('secondary_phone', primary);
                                        }}
                                        title="Swap Numbers"
                                        disabled={isReadOnly}
                                    >
                                        <ArrowLeftRight className="h-4 w-4 text-primary" />
                                    </Button>
                                </div>
                                <div className="relative flex-1">
                                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 z-10" />
                                    <Input
                                        id="secondary_phone"
                                        value={patient.secondary_phone || ''}
                                        onChange={e => onPatientDetailsChange('secondary_phone', e.target.value)}
                                        onBlur={() => {
                                            if (!patient.secondary_phone?.trim()) {
                                                setShowSecondaryPhone(false);
                                                onPatientDetailsChange('secondary_phone', ''); // Ensure it's clean empty string
                                            }
                                        }}
                                        placeholder="Alt Phone"
                                        className="pl-9"
                                    />
                                </div>
                            </>
                        )}
                        {!showSecondaryPhone && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowSecondaryPhone(true)}
                                title="Add Secondary Phone"
                                disabled={isReadOnly}
                                className="shrink-0"
                            >
                                <span className="text-lg">+</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Popover open={isPatientDatePickerOpen} onOpenChange={setIsPatientDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !patient.dob && "text-muted-foreground")} disabled={isReadOnly}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {patient.dob ? format(new Date(patient.dob), "PPP") : <span>Select date</span>}
                                    {patient.is_dob_estimated && <span className="ml-2 text-xs opacity-70">(Est.)</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarWithMonthYearPicker
                                    selected={patient.dob ? new Date(patient.dob) : undefined}
                                    onSelect={onDateChange}
                                    onClose={() => setIsPatientDatePickerOpen(false)}
                                    fromYear={1930}
                                    toYear={new Date().getFullYear()}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <div className="relative">
                        <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 z-10 pointer-events-none" />
                        <Select value={patient.sex} onValueChange={value => onPatientDetailsChange('sex', value)} disabled={isReadOnly}>
                            <SelectTrigger className="pl-9">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <div className="relative">
                        <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input id="occupation" value={patient.occupation || ''} onChange={e => onPatientDetailsChange('occupation', e.target.value)} placeholder="e.g., Software... " disabled={isReadOnly} className="pl-9" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hometown">Hometown</Label>
                    <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input id="hometown" value={patient.hometown || ''} onChange={e => onPatientDetailsChange('hometown', e.target.value)} placeholder="e.g., Kakinada..." disabled={isReadOnly} className="pl-9" />
                    </div>
                </div>
            </div>
        </div>
    );
};
