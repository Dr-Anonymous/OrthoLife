
import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
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
  complaints?: string;
  findings?: string;
  investigations?: string;
  diagnosis?: string;
  advice?: string;
  followup?: string;
  medications?: any[];
}

interface FormData {
  id: number | null;
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
  driveId: string | null;
  consultation_data: any | null;
}

interface ConsultationRegistrationProps {
  onSuccess?: (newPatient: any, consultationData?: any) => void;
  location?: string;
}

/**
 * ConsultationRegistration Component
 * 
 * Handles the registration of new patients or selection of existing ones for a consultation.
 * Features:
 * - Patient Search (Name/Phone) via Supabase Edge Function `search-patients`.
 * - New Patient Registration form (Name, Sex, DOB/Age, Phone).
 * - Offline Support: Registers patient locally to IndexedDB if offline.
 * - Auto-calc of visit type (Paid/Free) based on history (14-day rule).
 * - Duplicate check via backend logic.
 */
const ConsultationRegistration: React.FC<ConsultationRegistrationProps> = ({ onSuccess, location }) => {
  const isOnline = useOnlineStatus();
  const [formData, setFormData] = useState<FormData>({
    id: null,
    name: '',
    dob: undefined,
    sex: 'M',
    phone: '',
    driveId: null,
    consultation_data: null,
  });

  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);



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

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex' | 'driveId' | 'id' | 'consultation_data'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, driveId: null, id: null, consultation_data: null }));
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
      const { data, error } = await supabase.functions.invoke('search-patients', {
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
          description: 'No patients found. You can register a new patient.',
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

  const handleSelectPatient = (patientId: string, patientList: Patient[] = searchResults) => {
    // The review identified a bug here. The patientId from the Select component is a string,
    // while the patient.id from the search results is a number. We need to ensure the comparison
    // works correctly by coercing the types.
    const selected = patientList.find(p => p.id == Number(patientId));
    setSelectedPatientId(patientId);

    if (selected) {
      const { id, name, dob, sex, phone, drive_id, ...consultation_data } = selected;
      setFormData({
        id,
        name,
        dob: dob ? new Date(dob) : undefined,
        sex,
        phone,
        driveId: drive_id,
        consultation_data,
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

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      if (!isOnline) {
        const tempId = `offline-${Date.now()}`;
        const newPatient = {
          id: tempId,
          name: formData.name,
          dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
          sex: formData.sex,
          phone: formData.phone,
          drive_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const newConsultation = {
          id: `offline-consultation-${Date.now()}`,
          patient_id: tempId,
          status: 'pending',
          consultation_data: {},
          location: location,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient: newPatient
        };

        await offlineStore.setItem(tempId, { type: 'new_patient', patient: newPatient, consultation: newConsultation });

        toast({
          title: 'Patient Registered Locally',
          description: `${formData.name} will be synced when you are back online.`,
        });

        if (onSuccess) onSuccess(newConsultation, {});

        setFormData({ id: null, name: '', dob: undefined, sex: 'M', phone: '', driveId: null, consultation_data: null });
        setSearchResults([]);
        setSelectedPatientId('');

      } else {
        const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
          body: {
            id: formData.id,
            name: formData.name,
            dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
            sex: formData.sex,
            phone: formData.phone,
            driveId: formData.driveId,
            age: String(age),
            location: location,
          },
        });

        if (error) { // Network or unexpected function error
          throw new Error(error.message);
        }

        if (data.status === 'exact_match') {
          toast({
            variant: 'destructive',
            title: 'Patient Exists',
            description: data.message,
          });
          handleSelectPatient(data.patient.id.toString(), [data.patient]);
        } else if (data.status === 'success') {
          // Calculate visit_type
          let visitType = 'paid';
          const patientId = data.consultation.patient_id;

          // Check for previous paid consultations
          const { data: lastPaidConsultation, error: fetchError } = await supabase
            .from('consultations')
            .select('created_at')
            .eq('patient_id', patientId)
            .neq('id', data.consultation.id) // Exclude current one
            .eq('visit_type', 'paid')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!fetchError && lastPaidConsultation) {
            const daysSinceLastPaid = differenceInDays(new Date(), new Date(lastPaidConsultation.created_at));
            if (daysSinceLastPaid <= 14) {
              visitType = 'free';
            }
          }

          // Update visit_type if needed (backend defaults to 'paid')
          if (visitType === 'free') {
            const { error: updateError } = await supabase
              .from('consultations')
              .update({ visit_type: visitType })
              .eq('id', data.consultation.id);

            if (updateError) {
              console.error("Error updating consultation data:", updateError);
            } else {
              // We don't need to update data.consultation.consultation_data here since we didn't add the fields to it.
              // But if we want to reflect the change locally, we can update the dedicated properties.
              data.consultation.visit_type = visitType;
            }
          }
          toast({
            title: 'Patient Registered for Consultation',
            description: `${formData.name} has been successfully registered.`,
          });
          setFormData({ id: null, name: '', dob: undefined, sex: 'M', phone: '', driveId: null, consultation_data: null });
          setSearchResults([]);
          setSelectedPatientId('');
          if (onSuccess) {
            // Exclude visit_type from the passed data so it doesn't override the new calculation
            const { visit_type, ...restData } = formData.consultation_data || {};
            onSuccess(data.consultation, restData);
          }
        } else {
          throw new Error(data.error || 'An unexpected error occurred.');
        }
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



  return (
    <>
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
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch('name'); } }}
                  className={cn("pl-10 pr-10", errors.name && "border-destructive")}
                  placeholder="Enter full name"
                />
                <button type="button" onClick={() => handleSearch('name')} className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isSearching || !isOnline}>
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
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch('phone'); } }}
                  className={cn("pl-10 pr-10", errors.phone && "border-destructive")}
                  placeholder="Enter 10-digit number"
                />
                <button type="button" onClick={() => handleSearch('phone')} className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isSearching || !isOnline}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Select Existing Patient</Label>
              <Select value={selectedPatientId} onValueChange={handleSelectPatient}>
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
