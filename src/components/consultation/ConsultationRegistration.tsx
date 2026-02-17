
import React, { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStore } from '@/lib/local-storage';
import { cachePatients, searchLocalPatients } from '@/hooks/useOfflineSync';
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
import { useHospitals } from '@/context/HospitalsContext';
import { sanitizePhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils';

interface Patient {
  id: number;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  secondary_phone?: string;
  drive_id: string | null;
  complaints?: string;
  findings?: string;
  investigations?: string;
  diagnosis?: string;
  advice?: string;
  followup?: string;
  medications?: any[];
  personalNote?: string;
  is_dob_estimated?: boolean;
}

interface FormData {
  id: number | null;
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
  secondary_phone?: string;
  referred_by?: string;
  driveId: string | null;
  consultation_data: any | null;
  isDobEstimated: boolean;
  language?: string;
}

interface ConsultationRegistrationProps {
  onSuccess?: (newPatient: any, consultationData?: any) => void;
  location?: string;
  existingConsultations?: any[];
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
const ConsultationRegistration: React.FC<ConsultationRegistrationProps> = ({ onSuccess, location, existingConsultations = [] }) => {
  const isOnline = useOnlineStatus();
  const { getHospitalByName } = useHospitals();
  const [formData, setFormData] = useState<FormData>({
    id: null,
    name: '',
    dob: undefined,
    sex: 'M',
    phone: '',
    secondary_phone: '',
    referred_by: '',
    driveId: null,
    consultation_data: null,
    isDobEstimated: false,
  });

  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // New State for Instant Search Optimization
  const [cachedPatients, setCachedPatients] = useState<Patient[]>([]);
  const [lastFetchedPrefix, setLastFetchedPrefix] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionSource, setSuggestionSource] = useState<'name' | 'phone'>('phone');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const justSelected = useRef(false);



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
      setFormData(prev => ({ ...prev, dob: newDob, isDobEstimated: true }));
      setCalendarDate(newDob);
    }
  };

  // Auto-focus Phone Number
  useEffect(() => {
    const timer = setTimeout(() => {
      const phoneInput = document.getElementById('phone');
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (formData.dob && formData.dob > new Date()) newErrors.dob = 'Date of birth cannot be in the future';
    if (!formData.phone || !isValidPhoneNumber(formData.phone)) newErrors.phone = 'A valid 10-digit phone number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex' | 'driveId' | 'id' | 'consultation_data' | 'isDobEstimated'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, driveId: null, id: null, consultation_data: null }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'phone' || field === 'name') {
      setSearchResults([]);
      setSelectedPatientId('');
      // Reset instant search state on manual edit (if user clears phone)
      if (field === 'phone' && value.length < 3) {
        setCachedPatients([]);
        setLastFetchedPrefix('');
        setShowSuggestions(false);
      }
    }
  };

  // Instant Phone Search Effect
  useEffect(() => {
    // Only run if we have a phone number being typed
    const phone = sanitizePhoneNumber(formData.phone);

    // If we just selected a patient, don't re-open suggestions
    if (justSelected.current) {
      justSelected.current = false;
      setShowSuggestions(false);
      return;
    }

    if (!phone || phone.length < 3) {
      setShowSuggestions(false);
      return;
    }

    const fetchCandidates = async () => {
      // 1. Local Cache Check (Duplicate Fetch Prevention)
      // If we have a full number (10+ digits), check if we already found this patient in previous fetches (e.g. prefix search)
      if (phone.length >= 10) {
        const alreadyHasMatch = cachedPatients.some(p => p.phone && sanitizePhoneNumber(p.phone).includes(phone));
        if (alreadyHasMatch) {
          // Filter locally and show
          const filtered = cachedPatients.filter(p => p.phone && sanitizePhoneNumber(p.phone).includes(phone));
          setSearchResults(filtered);
          setShowSuggestions(filtered.length > 0);
          return;
        }
      }

      // 2. Fetch from DB if needed
      // Use last 8 digits for accuracy if phone >= 10, else prefix
      const currentPrefix = phone.length >= 10 ? phone.slice(-8) : phone.slice(0, 8);

      if (phone.length >= 8 && currentPrefix !== lastFetchedPrefix) {
        try {
          let patients: Patient[] = [];

          if (isOnline) {
            // Direct Supabase Query for max speed & control (limit 100)
            const { data, error } = await supabase
              .from('patients')
              .select('*')
              .ilike('phone', `%${currentPrefix}%`)
              .limit(50); // Fetch enough to be useful but not overload

            if (error) throw error;
            patients = data as Patient[];
          } else {
            // Offline fallback
            patients = await searchLocalPatients(currentPrefix, 'phone') as Patient[];
          }

          // Update Cache
          if (patients.length > 0 || isOnline) { // Only update cache if we found something or confirmed empty from server
            setCachedPatients(patients);
            setLastFetchedPrefix(currentPrefix);
          }

          // Update UI with filtered results
          const filtered = patients.filter(p => p.phone && sanitizePhoneNumber(p.phone).includes(phone));
          setSearchResults(filtered);
          setShowSuggestions(filtered.length > 0);
          setSuggestionSource('phone');
          setActiveSuggestionIndex(0);

        } catch (err) {
          console.error("Instant search error:", err);
        }
      } else if (cachedPatients.length > 0) {
        // Local filtering on existing cache (for 3-9 digits typing or continued typing without new fetch)
        const filtered = cachedPatients.filter(p => p.phone && sanitizePhoneNumber(p.phone).includes(phone));
        setSearchResults(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionSource('phone');
        setActiveSuggestionIndex(0);
      }
    };

    const debounceTimer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.phone, isOnline, lastFetchedPrefix, cachedPatients]);

  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = searchResults[activeSuggestionIndex];
      if (selected) handleSelectPatient(selected.id.toString(), searchResults);
    }
  };

  const handleSearch = async (searchType: 'name' | 'phone') => {
    setSuggestionSource(searchType);
    let searchTerm = searchType === 'name' ? formData.name : formData.phone;

    if (searchType === 'phone') {
      searchTerm = sanitizePhoneNumber(searchTerm);
    }
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

    // defined outside for reuse
    const performLocalSearch = async () => {
      const data = await searchLocalPatients(searchTerm, searchType) as Patient[];
      if (data && data.length > 0) {
        setSearchResults(data);
        setShowSuggestions(true); // Show dropdown
        setActiveSuggestionIndex(0);
        toast({
          title: 'Cached Patients Found',
          description: `Found ${data.length} patient(s) in local cache. Please select one.`,
        });
      } else {
        toast({
          title: 'No Patients Found',
          description: 'No patients found in local cache. Try registering as new.',
        });
      }
    };

    try {
      if (isOnline) {
        try {
          // Online Search
          const response = await supabase.functions.invoke('search-patients', {
            body: { searchTerm, searchType },
          });
          const data = response.data;
          const error = response.error;

          if (error) throw error;

          if (data && data.length > 0) {
            setSearchResults(data);
            setShowSuggestions(true); // Show dropdown
            setActiveSuggestionIndex(0);
            cachePatients(data); // Cache successful results
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
        } catch (onlineError: any) {
          console.error('Online search failed, falling back to local:', onlineError);
          const isNetworkError = onlineError.message?.includes('Failed to send a request') ||
            onlineError.message?.includes('Failed to fetch') ||
            onlineError.message?.includes('NetworkError');

          if (isNetworkError) {
            await performLocalSearch();
          } else {
            throw onlineError;
          }
        }
      } else {
        // Offline Search
        await performLocalSearch();
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
    const selected = patientList.find(p => p.id == Number(patientId));
    setSelectedPatientId(patientId);

    if (selected) {
      justSelected.current = true; // Prevent re-opening suggestions
      const { id, name, dob, sex, phone, drive_id, ...consultation_data } = selected;
      setFormData({
        id,
        name,
        dob: dob ? new Date(dob) : undefined,
        sex,
        phone,
        secondary_phone: selected.secondary_phone || '',
        driveId: drive_id,
        consultation_data,
        isDobEstimated: selected.is_dob_estimated || false
      });

      setShowSuggestions(false); // Explicitly hide suggestions

      toast({
        title: 'Patient Data Loaded',
        description: "The form has been auto-filled with the selected patient's data.",
      });
    }
  };

  const handleSexChange = (value: string) => setFormData(prev => ({ ...prev, sex: value }));

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, dob: date, isDobEstimated: false }));
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

    const saveOfflinePatient = async () => {
      // Offline Duplicate Check
      // We check against the locally loaded list of today's consultations
      if (existingConsultations && existingConsultations.length > 0) {
        const isDuplicate = existingConsultations.some(c =>
          String(c.patient?.phone) === String(formData.phone) &&
          c.patient?.name?.toLowerCase().trim() === formData.name.toLowerCase().trim()
        );

        if (isDuplicate) {
          toast({
            variant: 'destructive',
            title: 'Duplicate Consultation',
            description: 'This patient is already registered for today at this location.',
          });
          setIsSubmitting(false);
          return;
        }
      }

      try {
        const tempId = `offline-${Date.now()}`;
        const newPatient = {
          id: tempId,
          name: formData.name,
          dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
          sex: formData.sex,
          phone: sanitizePhoneNumber(formData.phone),
          secondary_phone: formData.secondary_phone ? sanitizePhoneNumber(formData.secondary_phone) : null,
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
          description: isOnline
            ? 'Network request failed. Saved offline and will sync automatically.'
            : `${formData.name} will be synced when you are back online.`,
        });

        if (onSuccess) onSuccess(newConsultation, {});

        setFormData({ id: null, name: '', dob: undefined, sex: 'M', phone: '', driveId: null, consultation_data: null, isDobEstimated: false });
        setSearchResults([]);
        setSelectedPatientId('');
      } catch (storageError) {
        console.error("Local storage failed:", storageError);
        toast({
          variant: 'destructive',
          title: 'Storage Error',
          description: 'Failed to save patient locally.'
        });
      }
    };

    try {
      if (!isOnline) {
        await saveOfflinePatient();
      } else {
        try {
          const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
            body: {
              id: formData.id,
              name: formData.name,
              dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : null,
              sex: formData.sex,
              phone: sanitizePhoneNumber(formData.phone),
              secondary_phone: formData.secondary_phone ? sanitizePhoneNumber(formData.secondary_phone) : null,
              driveId: formData.driveId,
              age: String(age),
              location: location,
              is_dob_estimated: formData.isDobEstimated,
              referred_by: formData.referred_by,
              language: formData.language,
              free_visit_duration_days: location ? getHospitalByName(location)?.settings.free_visit_duration_days : 14
            },
          });

          if (error) { // Network or unexpected function error
            throw new Error(error.message);
          }

          if (data.status === 'error') {
            toast({
              variant: 'destructive',
              title: 'Registration Failed',
              description: data.message,
            });
          } else if (data.status === 'success') {
            toast({
              title: 'Patient Registered for Consultation',
              description: `${formData.name} has been successfully registered.`,
            });
            setFormData({ id: null, name: '', dob: undefined, sex: 'M', phone: '', driveId: null, consultation_data: null, isDobEstimated: false });
            setSearchResults([]);
            setSelectedPatientId('');
            if (onSuccess) {
              // Exclude visit_type from the passed data so it doesn't override the new calculation
              const { visit_type, ...restData } = formData.consultation_data || {};
              // Prioritize the fetched language, otherwise it might perform default logic in parent
              onSuccess({ ...data.consultation, language: formData.language || data.consultation.language }, restData);
            }
          } else {
            throw new Error(data.error || 'An unexpected error occurred.');
          }
        } catch (onlineError: any) {
          console.error('Online registration failed, falling back to offline:', onlineError);
          const isNetworkError = onlineError.message?.includes('Failed to send a request') ||
            onlineError.message?.includes('Failed to fetch') ||
            onlineError.message?.includes('NetworkError');

          if (isNetworkError) {
            await saveOfflinePatient();
          } else {
            throw onlineError; // Re-throw validation/logic errors
          }
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
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  onKeyDown={e => {
                    if (showSuggestions) handleSuggestionKeyDown(e); // Allow navigation even from Phone input
                  }}
                  className={cn("pl-10 pr-10", errors.phone && "border-destructive")}
                  placeholder="Enter 10-digit number"
                />

                {/* Instant Search Suggestions (Under Phone Field) */}
                {showSuggestions && suggestionSource === 'phone' && searchResults.length > 0 && (
                  <PatientSuggestionsList
                    searchResults={searchResults}
                    activeSuggestionIndex={activeSuggestionIndex}
                    onSelect={(patient) => {
                      handleSelectPatient(patient.id.toString(), searchResults);
                      setShowSuggestions(false);
                    }}
                    setActiveSuggestionIndex={setActiveSuggestionIndex}
                    calculateAge={calculateAge}
                  />
                )}
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            {/* Name Input Logic (existing but modified) */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  onKeyDown={e => {
                    if (showSuggestions) handleSuggestionKeyDown(e);
                    else if (e.key === 'Enter') { e.preventDefault(); handleSearch('name'); }
                  }}
                  className={cn("pl-10 pr-10", errors.name && "border-destructive")}
                  placeholder="Enter full name"
                  autoComplete="off"
                />

                {/* Instant Search Suggestions (Under Name Field) */}
                {showSuggestions && suggestionSource === 'name' && searchResults.length > 0 && (
                  <PatientSuggestionsList
                    searchResults={searchResults}
                    activeSuggestionIndex={activeSuggestionIndex}
                    onSelect={(patient) => {
                      handleSelectPatient(patient.id.toString(), searchResults);
                      setShowSuggestions(false);
                    }}
                    setActiveSuggestionIndex={setActiveSuggestionIndex}
                    calculateAge={calculateAge}
                  />
                )}

                <button type="button" onClick={() => handleSearch('name')} className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
          </div>



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

interface PatientSuggestionsListProps {
  searchResults: Patient[];
  activeSuggestionIndex: number;
  onSelect: (patient: Patient) => void;
  setActiveSuggestionIndex: (index: number) => void;
  calculateAge: (dob?: Date) => number | string;
}

const PatientSuggestionsList: React.FC<PatientSuggestionsListProps> = ({
  searchResults,
  activeSuggestionIndex,
  onSelect,
  setActiveSuggestionIndex,
  calculateAge
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && listRef.current) {
      // Find the active element by index (safest without relying on IDs which complicate key usage)
      const activeElement = listRef.current.children[activeSuggestionIndex + 1] as HTMLElement; // +1 to skip header
      if (activeElement) {
        // Check if visible
        const listRect = listRef.current.getBoundingClientRect();
        const itemRect = activeElement.getBoundingClientRect();

        // If item is above view
        if (itemRect.top < listRect.top) {
          listRef.current.scrollTop -= (listRect.top - itemRect.top);
        }
        // If item is below view
        else if (itemRect.bottom > listRect.bottom) {
          listRef.current.scrollTop += (itemRect.bottom - listRect.bottom);
        }
      }
    }
  }, [activeSuggestionIndex]);

  return (
    <div ref={listRef} className="absolute z-50 left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b sticky top-0 bg-background z-10">
        Suggested Patients ({searchResults.length})
      </div>
      {searchResults.map((patient, index) => (
        <button
          key={patient.id}
          type="button"
          className={cn(
            "w-full text-left px-4 py-2 text-sm flex flex-col hover:bg-muted/50 transition-colors",
            index === activeSuggestionIndex && "bg-muted"
          )}
          onClick={() => onSelect(patient)}
          onMouseEnter={() => setActiveSuggestionIndex(index)}
        >
          <span className="font-medium text-foreground">{patient.name}</span>
          <span className="text-xs text-muted-foreground flex justify-between w-full">
            <span>{patient.sex} / {calculateAge(patient.dob ? new Date(patient.dob) : undefined)}Y</span>
            <span>{patient.phone}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default ConsultationRegistration;
