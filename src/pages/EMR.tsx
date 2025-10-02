import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Calendar as CalendarIcon, FileText, Stethoscope, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
}

interface PatientFolder {
  id: string;
  name: string;
}

interface Medication {
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  duration: string;
  instructions: string;
}

let patientId;
declare global {
  interface Window {
    folderId?: string;
  }
}

const EMR = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dob: undefined,
    sex: 'M',
    phone: ''
  });

  const [patientFolders, setPatientFolders] = useState<PatientFolder[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const savedMedications: Medication[] = [
    { name: 'T. HIFENAC SP', dose: '1 tab', freqMorning: true, freqNoon: false, freqNight: true, duration: '1 week', instructions: 'Aft. meal' },
    { name: 'T. PANTOVAR', dose: '40 mg', freqMorning: true, freqNoon: false, freqNight: false, duration: '1 week', instructions: 'Bef. breakfast' }
  ];

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: 'after 2 weeks/immediately- if worsening of any symptoms.',
    medications: [
      { name: 'T. HIFENAC SP', dose: '1 tab', freqMorning: true, freqNoon: false, freqNight: true, duration: '1 week', instructions: 'Aft. meal' },
      { name: 'T. PANTOVAR', dose: '40 mg', freqMorning: true, freqNoon: false, freqNight: false, duration: '1 week', instructions: 'Bef. breakfast' }
    ] as Medication[]
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2000, 0, 1));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (formData.dob && formData.dob > new Date()) newErrors.dob = 'Date of birth cannot be in the future';
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = 'Enter valid 10-digit phone number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    
    // Clear patient selection when phone changes
    if (field === 'phone') {
      setPatientFolders([]);
      setSelectedPatient('');
    }
  };

  const searchPatientRecords = async (phoneNumber: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-patient-records', {
        body: { phoneNumber }
      });

      if (error) throw error;

      if (data?.patientFolders?.length > 0) {
        setPatientFolders(data.patientFolders);
        toast({
          title: "Patient Records Found",
          description: `Found ${data.patientFolders.length} patient record(s). Please select a patient.`
        });
      } else {
        setPatientFolders([]);
        setSelectedPatient('');
      }
    } catch (error) {
      console.error('Error searching patient records:', error);
      toast({
        variant: 'destructive',
        title: "Search Error",
        description: "Failed to search patient records. Please try again."
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePatientSelection = (folderId: string) => {
    const selectedFolderData = patientFolders.find(folder => folder.id === folderId);
    setSelectedPatient(selectedFolderData?.name || folderId);
    setSelectedFolder(folderId);
  };

  useEffect(() => {
    if (selectedFolder) {
      fetchPatientData(selectedFolder);
    }
  }, [selectedFolder, fetchPatientData]);

  const fetchPatientData = useCallback(async (folderId: string) => {
    setIsFetchingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-patient-records', {
        body: { phoneNumber: formData.phone, selectedFolder: folderId }
      });

      if (error) throw error;

      if (data?.patientData) {
        const patientData = data.patientData;
        window.folderId = data.folderId;
        patientId = patientData.id;

        setFormData(prev => ({
          ...prev,
          name: patientData.name || prev.name,
          dob: patientData.dob ? new Date(patientData.dob) : prev.dob,
          sex: patientData.sex || prev.sex,
        }));

        setExtraData(prev => ({
          ...prev,
          complaints: patientData.complaints || prev.complaints,
          findings: patientData.findings || prev.findings,
          investigations: patientData.investigations || prev.investigations,
          diagnosis: patientData.diagnosis || prev.diagnosis,
          advice: patientData.advice || prev.advice,
          followup: patientData.followup || prev.followup,
          medications: patientData.medications?.length ? patientData.medications : prev.medications
        }));

        toast({
          title: "Data Loaded",
          description: "Patient data has been auto-filled."
        });
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast({
        variant: 'destructive',
        title: "Load Error",
        description: "Failed to load patient data."
      });
    } finally {
      setIsFetchingDetails(false);
    }
  }, [formData.phone]);

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
  
  const handleExtraChange = (field: string, value: string) => {
    setExtraData(prev => ({ ...prev, [field]: value }));
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string | boolean) => {
    if (field === 'name' && typeof value === 'string' && value.startsWith('/')) {
      const shortcutIndex = parseInt(value.substring(1), 10) - 1;
      if (shortcutIndex >= 0 && shortcutIndex < savedMedications.length) {
        const savedMed = savedMedications[shortcutIndex];
        setExtraData(prev => {
          const newMeds = [...prev.medications];
          newMeds[index] = { ...savedMed };
          return { ...prev, medications: newMeds };
        });
        return;
      }
    }

    setExtraData(prev => {
      const newMeds = [...prev.medications];
      newMeds[index][field] = value as never;
      return { ...prev, medications: newMeds };
    });
  };

  const addMedication = () => {
    setExtraData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, duration: '', instructions: '' }]
    }));
  };

  const removeMedication = (index: number) => {
    setExtraData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleTranslateAll = async () => {
    const textsToTranslate = {
        advice: extraData.advice,
        followup: extraData.followup,
        medications: extraData.medications.map(med => med.instructions)
    };

    if (!textsToTranslate.advice.trim() && !textsToTranslate.followup.trim() && textsToTranslate.medications.every(inst => !inst.trim())) {
        toast({
            variant: 'destructive',
            title: 'Nothing to translate',
            description: 'Please enter some text in Advice, Follow-up, or Medication Instructions before translating.',
        });
        return;
    }

    setIsTranslating(true);

    try {
        const translate = (text: string) => {
            if (!text.trim()) return Promise.resolve(text);
            return supabase.functions.invoke('translate-content', {
                body: { text, targetLanguage: 'te' },
            }).then(result => {
                if (result.error) throw new Error(result.error.message);
                if (result.data?.error) throw new Error(result.data.error);
                return result.data?.translatedText || text;
            });
        };

        const [translatedAdvice, translatedFollowup] = await Promise.all([
            translate(textsToTranslate.advice),
            translate(textsToTranslate.followup)
        ]);

        const translatedMedInstructions = await Promise.all(
            textsToTranslate.medications.map(inst => translate(inst))
        );

        setExtraData(prev => ({
            ...prev,
            advice: translatedAdvice,
            followup: translatedFollowup,
            medications: prev.medications.map((med, index) => ({
                ...med,
                instructions: translatedMedInstructions[index]
            }))
        }));

        toast({
            title: 'Translation Successful',
            description: 'The relevant fields have been translated to Telugu.'
        });

    } catch (error) {
        console.error('Translation error:', error);
        toast({
            variant: 'destructive',
            title: 'Translation Error',
            description: (error as Error).message || 'Could not translate the text. Please try again.'
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        folderId: window.folderId,
        patientId: patientId,
        name: formData.name,
        dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : '',
        sex: formData.sex,
        phone: formData.phone,
        complaints: extraData.complaints,
        findings: extraData.findings,
        investigations: extraData.investigations,
        diagnosis: extraData.diagnosis,
        advice: extraData.advice,
        followup: extraData.followup,
        medications: JSON.stringify(extraData.medications)
      };
    
      const { data, error } = await supabase.functions.invoke('create-docs-prescription', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Failed to create prescription');
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      // Handle success - data.url contains the Google Docs link
      // data.patientId may contain the generated or provided patient ID
      if (data?.url) {
        window.location.href = data.url;
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold text-primary">
              <Stethoscope className="w-7 h-7" />
              Electronic Medical Records
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Patient Registration & Prescription Management System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={submitForm} className="space-y-6">
              {/* Patient Information Section */}
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
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className={cn("pl-10", errors.name && "border-destructive")} 
                        placeholder="Enter full name" 
                      />
                    </div>
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
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
                          {formData.dob ? (
                            format(formData.dob, "PPP")
                          ) : (
                            <span>Select date of birth</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b space-y-2">
                          <div className="flex gap-2">
                            <Select value={calendarDate.getMonth().toString()} onValueChange={handleMonthChange}>
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {months.map((month, index) => (
                                  <SelectItem key={index} value={index.toString()}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={calendarDate.getFullYear().toString()} onValueChange={handleYearChange}>
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                {years.map((year) => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sex" className="text-sm font-medium">Sex</Label>
                    <Select value={formData.sex} onValueChange={handleSexChange}>
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
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input 
                        id="phone"
                        value={formData.phone} 
                        onChange={e => handleInputChange('phone', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchPatientRecords((e.target as HTMLInputElement).value))}
                        className={cn("pl-10", errors.phone && "border-destructive")} 
                        placeholder="1234567890" 
                      />
                      {isSearching && (
                        <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                </div>

                {/* Patient Selection Dropdown */}
                {patientFolders.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select Patient Record</Label>
                    <Select value={selectedPatient} onValueChange={handlePatientSelection} disabled={isFetchingDetails}>
                      <SelectTrigger className="relative">
                        <SelectValue placeholder="Choose existing patient record..." />
                        {isFetchingDetails && (
                          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {patientFolders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Medical Information Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complaints" className="text-sm font-medium">Complaints</Label>
                    <Textarea 
                      id="complaints"
                      value={extraData.complaints} 
                      onChange={e => handleExtraChange('complaints', e.target.value)} 
                      placeholder="Patient complaints..."
                      onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
                    <Textarea 
                      id="findings"
                      value={extraData.findings} 
                      onChange={e => handleExtraChange('findings', e.target.value)} 
                      placeholder="Clinical findings..."
                      onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                    <Textarea 
                      id="investigations"
                      value={extraData.investigations} 
                      onChange={e => handleExtraChange('investigations', e.target.value)} 
                      placeholder="Investigations required..."
                      onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
                    <Textarea 
                      id="diagnosis"
                      value={extraData.diagnosis} 
                      onChange={e => handleExtraChange('diagnosis', e.target.value)} 
                      placeholder="Clinical diagnosis..."
                      onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
                  </div>
                  <Textarea 
                    id="advice"
                    value={extraData.advice} 
                    onChange={e => handleExtraChange('advice', e.target.value)} 
                    placeholder="Medical advice and recommendations..."
                    onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
                  </div>
                  <Textarea
                    id="followup"
                    value={extraData.followup}
                    onChange={e => handleExtraChange('followup', e.target.value)}
                    placeholder="Follow-up instructions..."
                    onKeyDown={e => e.key === 'Enter' && e.stopPropagation()}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              {/* Medications Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Medications</h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {extraData.medications.map((med, index) => (
                    <Card key={index} className="p-4 border border-border relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMedication(index)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove medication</span>
                      </Button>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Medicine Name</Label>
                            <Input 
                              value={med.name} 
                              onChange={e => handleMedChange(index, 'name', e.target.value)} 
                              placeholder="Enter medicine name"
                              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Dosage</Label>
                            <Input 
                              value={med.dose} 
                              onChange={e => handleMedChange(index, 'dose', e.target.value)} 
                              placeholder="e.g., 500mg"
                              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Frequency</Label>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={med.freqMorning} 
                                onChange={e => handleMedChange(index, 'freqMorning', e.target.checked)} 
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqMorning', !med.freqMorning))}
                                className="rounded border-border"
                              />
                              <span className="text-sm">Morning</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={med.freqNoon} 
                                onChange={e => handleMedChange(index, 'freqNoon', e.target.checked)} 
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqNoon', !med.freqNoon))}
                                className="rounded border-border"
                              />
                              <span className="text-sm">Noon</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={med.freqNight} 
                                onChange={e => handleMedChange(index, 'freqNight', e.target.checked)} 
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleMedChange(index, 'freqNight', !med.freqNight))}
                                className="rounded border-border"
                              />
                              <span className="text-sm">Night</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Duration</Label>
                            <Input 
                              value={med.duration} 
                              onChange={e => handleMedChange(index, 'duration', e.target.value)} 
                              placeholder="e.g., 7 days"
                              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Instructions</Label>
                            <Input 
                              value={med.instructions} 
                              onChange={e => handleMedChange(index, 'instructions', e.target.value)} 
                              placeholder="Special instructions"
                              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={addMedication} variant="outline" size="sm">
                    Add Medication
                  </Button>
                  <Button type="button" size="sm" variant="link" onClick={handleTranslateAll} disabled={isTranslating}>
                      {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Translate to Telugu
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Prescription...
                    </>
                  ) : (
                    'Generate Prescription'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EMR;
