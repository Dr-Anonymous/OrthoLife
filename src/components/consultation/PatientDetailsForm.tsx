import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { User, Folder, History, Calendar as CalendarIcon } from 'lucide-react';
import { calculateAge } from '@/lib/age';
import { ConsultationContext } from '@/context/ConsultationContext';

interface PatientDetailsFormProps {}

const PatientDetailsForm: React.FC<PatientDetailsFormProps> = () => {
    const { state, dispatch } = React.useContext(ConsultationContext);
    const { editablePatientDetails: patientDetails, lastVisitDate, age } = state;
  const [isPatientDatePickerOpen, setIsPatientDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));

  useEffect(() => {
    if (patientDetails?.dob) {
      const dobDate = new Date(patientDetails.dob);
      if (!isNaN(dobDate.getTime())) {
        dispatch({ type: 'SET_AGE', payload: calculateAge(dobDate) });
        setCalendarDate(dobDate);
      }
    } else {
      dispatch({ type: 'SET_AGE', payload: '' });
    }
  }, [patientDetails?.dob, dispatch]);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    dispatch({ type: 'SET_AGE', payload: newAge });
    if (patientDetails && newAge !== '' && !isNaN(newAge)) {
      const today = new Date();
      const birthYear = today.getFullYear() - newAge;
      const currentDob = patientDetails.dob ? new Date(patientDetails.dob) : today;
      const newDob = new Date(birthYear, currentDob.getMonth(), currentDob.getDate());
      dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: { ...patientDetails, dob: format(newDob, 'yyyy-MM-dd') } });
      setCalendarDate(newDob);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (patientDetails && date) {
        dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: { ...patientDetails, dob: format(date, 'yyyy-MM-dd') } });
    }
    setIsPatientDatePickerOpen(false);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(calendarDate);
    newDate.setFullYear(parseInt(year));
    setCalendarDate(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(parseInt(month));
    setCalendarDate(newDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Demographic details of {patientDetails?.name}
          </h3>
          {lastVisitDate && (
            <span className="text-sm text-muted-foreground">
              ({lastVisitDate === 'First Consultation' ? 'First Consultation' : `Last visit: ${lastVisitDate}`})
            </span>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({ type: 'SET_MODAL_OPEN', payload: { modal: 'history', isOpen: true } })}>
            <History className="h-4 w-4" />
            <span className="sr-only">View Patient History</span>
          </Button>
        </div>
        {patientDetails?.drive_id && (
          <a href={`https://drive.google.com/drive/folders/${patientDetails.drive_id}`} target="_blank" rel="noopener noreferrer">
            <Folder className="w-5 h-5 text-blue-500 hover:text-blue-700" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={patientDetails?.name || ''} onChange={e => dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: { ...patientDetails, name: e.target.value } })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" value={patientDetails?.phone || ''} onChange={e => dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: { ...patientDetails, phone: e.target.value } })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Popover open={isPatientDatePickerOpen} onOpenChange={setIsPatientDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !patientDetails?.dob && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {patientDetails?.dob ? format(new Date(patientDetails.dob), "PPP") : <span>Select date</span>}
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
                  selected={patientDetails?.dob ? new Date(patientDetails.dob) : undefined}
                  onSelect={handleDateChange}
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
              onChange={handleAgeChange}
              className="w-full sm:w-24"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Sex</Label>
          <Select value={patientDetails?.sex || ''} onValueChange={value => dispatch({ type: 'SET_EDITABLE_PATIENT_DETAILS', payload: { ...patientDetails, sex: value } })}>
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

export default PatientDetailsForm;
