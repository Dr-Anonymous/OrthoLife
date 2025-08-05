import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Calendar as CalendarIcon, FileText, Stethoscope } from 'lucide-react';
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

interface Medication {
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  duration: string;
  instructions: string;
}

const myUrl = 'https://script.google.com/macros/s/AKfycbx48rO6urA7pEf1c2j-53yeNgBnSK0OBbJ9bEnb73l05JyemiksathpqSE-Ebeye8e88A/exec';

const EMR = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dob: undefined,
    sex: 'M',
    phone: ''
  });

  const [patientFolders, setPatientFolders] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    medications: [
      { name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, duration: '', instructions: '' }
    ] as Medication[]
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    
    // Search for patient when phone number changes
    if (field === 'phone' && value.length === 10) {
      searchPatientRecords(value);
    }
    
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

  const handlePatientSelection = async (patientFolder: string) => {
    setSelectedPatient(patientFolder);
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-patient-records', {
        body: { selectedFolder: patientFolder }
      });

      if (error) throw error;

      if (data?.patientData) {
        const patientData = data.patientData;
        
        // Auto-fill form with patient data
        setFormData(prev => ({
          ...prev,
          name: patientData.name || prev.name,
          dob: patientData.dob ? new Date(patientData.dob) : prev.dob,
          sex: patientData.sex || prev.sex,
          phone: patientData.phone || prev.phone
        }));

        setExtraData(prev => ({
          ...prev,
          complaints: patientData.complaints || prev.complaints,
          findings: patientData.findings || prev.findings,
          investigations: patientData.investigations || prev.investigations,
          diagnosis: patientData.diagnosis || prev.diagnosis,
          advice: patientData.advice || prev.advice,
          medications: patientData.medications && patientData.medications.length > 0 
            ? patientData.medications 
            : prev.medications
        }));

        toast({
          title: "Data Loaded",
          description: "Patient data has been auto-filled from the latest prescription."
        });
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast({
        variant: 'destructive',
        title: "Load Error",
        description: "Failed to load patient data. Please try again."
      });
    } finally {
      setIsSearching(false);
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
  
  const handleExtraChange = (field: string, value: string) => {
    setExtraData(prev => ({ ...prev, [field]: value }));
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string | boolean) => {
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

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        dob: formData.dob ? format(formData.dob, 'yyyy-MM-dd') : '',
        sex: formData.sex,
        phone: formData.phone,
        complaints: extraData.complaints,
        findings: extraData.findings,
        investigations: extraData.investigations,
        diagnosis: extraData.diagnosis,
        advice: extraData.advice,
        medications: JSON.stringify(extraData.medications)
      };
      const query = new URLSearchParams(payload).toString();
      const response = await fetch(`${myUrl}?${query}`);
      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Unknown error');
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
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
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
                    <Select value={selectedPatient} onValueChange={handlePatientSelection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose existing patient record..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patientFolders.map((folder) => (
                          <SelectItem key={folder} value={folder}>
                            {folder}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Medical Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
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
                  <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
                  <Textarea 
                    id="advice"
                    value={extraData.advice} 
                    onChange={e => handleExtraChange('advice', e.target.value)} 
                    placeholder="Medical advice and recommendations..."
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
                  <Button type="button" onClick={addMedication} variant="outline" size="sm">
                    Add Medication
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {extraData.medications.map((med, index) => (
                    <Card key={index} className="p-4 border border-border">
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
                                className="rounded border-border"
                              />
                              <span className="text-sm">Morning</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={med.freqNoon} 
                                onChange={e => handleMedChange(index, 'freqNoon', e.target.checked)} 
                                className="rounded border-border"
                              />
                              <span className="text-sm">Noon</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={med.freqNight} 
                                onChange={e => handleMedChange(index, 'freqNight', e.target.checked)} 
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

                        {extraData.medications.length > 1 && (
                          <div className="flex justify-end">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removeMedication(index)}
                            >
                              Remove Medication
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
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
