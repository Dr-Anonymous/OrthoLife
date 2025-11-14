
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateAge } from '@/lib/age';

interface Patient {
  id: number;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  drive_id: string | null;
}

interface FormData {
  id: number | null;
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
  driveId: string | null;
}

interface ConsultationRegistrationProps {
  onSuccess?: (newPatient: any) => void;
}

const ConsultationRegistration: React.FC<ConsultationRegistrationProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    id: null,
    name: '',
    dob: undefined,
    sex: 'M',
    phone: '',
    driveId: null,
  });

  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [matchingPatients, setMatchingPatients] = useState<Patient[]>([]);

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [age, setAge] = useState<number | ''>('');

  useEffect(() => {
    setAge(calculateAge(formData.dob));
  }, [formData.dob]);

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    setAge(newAge);

    if (newAge !== '' && !isNaN(newAge)) {
      const today = new Date();
      const birthYear = today.getFullYear() - newAge;
      const newDob = new Date(birthYear, formData.dob?.getMonth() ?? today.getMonth(), formData.dob?.getDate() ?? today.getDate());
      setFormData(prev => ({ ...prev, dob: newDob }));
      setCalendarDate(newDob);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (formData.dob && formData.dob > new Date()) newErrors.dob = 'Date of birth cannot be in the future';
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = 'A valid 10-digit phone number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex' | 'driveId' | 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, driveId: null, id: null }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'phone' || field === 'name') {
      setSearchResults([]);
      setSelectedPatientId('');
    }
  };

  const handleSearch = async (searchType: 'name' | 'phone') => {
    const searchTerm = searchType === 'name' ? formData.name : formData.phone;
    if (!searchTerm.trim()) {
      toast({
        title: 'Search term required',
        description: `Please enter a ${searchType} to search.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedPatientId('');

    try {
      // Step 1: Search the database
      const { data: dbData, error: dbError } = await supabase.functions.invoke('search-patients-database', {
        body: { searchTerm, searchType },
      });

      if (dbError) throw dbError;

      if (dbData && dbData.length > 0) {
        setSearchResults(dbData);
        toast({
          title: 'Patients Found in Database',
          description: `Found ${dbData.length} patient(s). Please select one.`,
        });
      } else {
        // Step 2: If no database results and searching by phone, search Google Drive
        if (searchType === 'phone') {
          toast({
            title: 'Searching Legacy Records',
            description: 'No patients found in the database. Checking older records from Google Drive...',
          });
          const { data: driveData, error: driveError } = await supabase.functions.invoke('search-patient-records', {
            body: { phoneNumber: searchTerm },
          });

          if (driveError) throw driveError;

          if (driveData && driveData.length > 0) {
            setSearchResults(driveData);
            toast({
              title: 'Patients Found in Google Drive',
              description: `Found ${driveData.length} patient(s). Please select one to import.`,
            });
          } else {
            toast({
              title: 'No Patients Found',
              description: 'No patients found in the database or Google Drive. You can register a new patient.',
            });
          }
        } else {
          toast({
            title: 'No Patients Found',
            description: 'No patients found with this name. You can register a new patient.',
          });
        }
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        variant: 'destructive',
        title: 'Search Error',
        description: 'Failed to search for patients. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePatientSelection = (patientId: string, patientList: Patient[] = searchResults) => {
    const selected = patientList.find(p => p.id.toString() === patientId);
    setSelectedPatientId(patientId);

    if (selected) {
      setFormData({
        id: selected.id,
        name: selected.name,
        dob: selected.dob ? new Date(selected.dob) : undefined,
        sex: selected.sex,
        phone: selected.phone,
        driveId: selected.drive_id,
      });
      toast({
        title: 'Patient Data Loaded',
        description: "The form has been auto-filled with the selected patient's data.",
      });
    }
  };

  const handleSexChange = (value: string) => setFormData(prev => ({ ...prev, sex: value }));

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, dob: date }));
    if (errors.dob) setErrors(prev => ({ ...prev, dob: undefined }));
    if (date) setIsDatePickerOpen(false);
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

  const submitForm = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
        body: {
          id: formData.id,
          name: formData.name,
          dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
          sex: formData.sex,
          phone: formData.phone,
          driveId: formData.driveId,
          force,
          age: String(age),
        },
      });

      if (error) { // Network or unexpected function error
        throw new Error(error.message);
      }

      if (data.status === 'partial_match') {
        setMatchingPatients(data.matches);
        setShowConfirmation(true);
      } else if (data.status === 'exact_match') {
        toast({
          variant: 'destructive',
          title: 'Patient Exists',
          description: data.message,
        });
        handlePatientSelection(data.patient.id.toString(), [data.patient]);
      } else if (data.status === 'success') {
        toast({
          title: 'Patient Registered for Consultation',
          description: `${formData.name} has been successfully registered.`,
        });
        setFormData({ id: null, name: '', dob: undefined, sex: 'M', phone: '', driveId: null });
        setSearchResults([]);
        setSelectedPatientId('');
        setShowConfirmation(false);
        if (onSuccess) onSuccess(data.consultation);
      } else {
        throw new Error(data.error || 'An unexpected error occurred.');
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Registration failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];

  const handleSelectFromModal = (patientId: string) => {
    handlePatientSelection(patientId, matchingPatients);
    setShowConfirmation(false);
  };

  return (
    <>
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Patient Identity</DialogTitle>
            <DialogDescription>
              A patient with a similar name is already registered. Please select the correct patient, or register as a new patient.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
            {matchingPatients.map(p => (
              <Button
                variant="outline"
                className="w-full justify-start h-auto"
                key={p.id}
                onClick={() => handleSelectFromModal(p.id.toString())}
              >
                <div className="text-left">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.phone} - DOB: {format(new Date(p.dob), 'PPP')}</p>
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={(e) => submitForm(e, true)}>Register as New Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <form onSubmit={submitForm} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Patient Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch('name'); }}}
                  className={cn("pl-10 pr-10", errors.name && "border-destructive")}
                  placeholder="Enter full name"
                />
                <button type="button" onClick={() => handleSearch('name')} className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch('phone'); }}}
                  className={cn("pl-10 pr-10", errors.phone && "border-destructive")}
                  placeholder="Enter 10-digit number"
                />
                <button type="button" onClick={() => handleSearch('phone')} className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Select Existing Patient</Label>
              <Select value={selectedPatientId} onValueChange={handlePatientSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient from search results..." />
                </SelectTrigger>
                <SelectContent>
                  {searchResults.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
              <div className="flex gap-2">
                <div className="space-y-2">
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={handleAgeChange}
                    placeholder="Age"
                    className="w-24"
                  />
                </div>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dob && "text-muted-foreground",
                        errors.dob && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dob ? format(formData.dob, "PPP") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b space-y-2">
                      <div className="flex gap-2">
                        <Select value={calendarDate.getMonth().toString()} onValueChange={handleMonthChange}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {months.map((month, index) => <SelectItem key={index} value={index.toString()}>{month}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={calendarDate.getFullYear().toString()} onValueChange={handleYearChange}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-48">
                            {years.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Calendar
                      mode="single"
                      selected={formData.dob}
                      onSelect={handleDateChange}
                      month={calendarDate}
                      onMonthChange={setCalendarDate}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex" className="text-sm font-medium">Sex</Label>
              <Select value={formData.sex} onValueChange={handleSexChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Registering...</>
            ) : (
              'Register for Consultation'
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default ConsultationRegistration;
