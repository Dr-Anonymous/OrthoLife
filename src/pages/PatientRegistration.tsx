import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';

interface Patient {
  id: number;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  drive_id: string | null;
}

interface FormData {
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
  driveId: string | null;
}

const PatientRegistration = () => {
  const [formData, setFormData] = useState<FormData>({
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
  const [todaysConsultations, setTodaysConsultations] = useState<any[]>([]);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);

  const fetchTodaysConsultations = async () => {
    setIsFetchingConsultations(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-consultations-by-date', {
        body: { date: format(new Date(), 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTodaysConsultations(data.consultations || []);
    } catch (error) {
      console.error('Error fetching today\'s consultations:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching consultations',
        description: error.message,
      });
    } finally {
      setIsFetchingConsultations(false);
    }
  };

  useEffect(() => {
    fetchTodaysConsultations();
  }, []);

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

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex' | 'driveId'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, driveId: null }));
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
      const { data, error } = await supabase.functions.invoke('search-patients-database', {
        body: { searchTerm, searchType },
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchResults(data);
        toast({
          title: 'Patients Found',
          description: `Found ${data.length} patient(s). Please select one.`,
        });
      } else {
        toast({
          title: 'No Patients Found',
          description: 'No existing patients found with this criteria. You can register a new patient.',
        });
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

      // Handle structured responses from the function
      if (data.status === 'partial_match') {
        setMatchingPatients(data.matches);
        setShowConfirmation(true);
      } else if (data.status === 'exact_match') {
        toast({
          variant: 'destructive',
          title: 'Patient Exists',
          description: data.message,
        });
        // Optionally, auto-fill form with exact match data
        handlePatientSelection(data.patient.id.toString(), [data.patient]);
      } else if (data.status === 'success') {
        toast({
          title: 'Patient Registered for Consultation',
          description: `${formData.name} has been successfully registered.`,
        });
        setFormData({ name: '', dob: undefined, sex: 'M', phone: '', driveId: null });
        setSearchResults([]);
        setSelectedPatientId('');
        setShowConfirmation(false);
        fetchTodaysConsultations();
      } else { // Generic error from the function's own catch block
        throw new Error(data.error || 'An unexpected error occurred.');
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Registration failed. Please try again.'
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
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
              <Button className="w-full" onClick={() => submitForm(new Event('submit') as any, true)}>Register as New Patient</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold text-primary">
              <img src="/badam-logo.png" alt="Logo" className="h-32" />
              Patient Registration
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Register new patients and create consultations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
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
          </CardContent>
        </Card>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-center">Today's Consultations ({todaysConsultations.length})</h3>
          {isFetchingConsultations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : todaysConsultations.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {todaysConsultations.map(c => (
                <div key={c.id} className="bg-card border p-3 rounded-lg shadow-sm w-full max-w-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{c.patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(new Date(c.patient.dob))}Y / {c.patient.sex} / {c.patient.phone}
                      </p>
                    </div>
                    <Badge variant={c.status === 'completed' ? 'secondary' : 'default'}>
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No consultations scheduled for today.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRegistration;