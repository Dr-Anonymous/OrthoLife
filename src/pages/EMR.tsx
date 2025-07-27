import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, User, Phone, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
}

interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const myUrl = 'https://script.google.com/macros/s/AKfycbw6e8GRRijCP_2dA1G9W7Uu1pAXfxzKMl64gPYE02wJWCzn5SVeaYxvqvBeu1s4XOQ0/exec';

const EMR = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dob: undefined,
    sex: 'M',
    phone: ''
  });

  const [extraData, setExtraData] = useState({
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    medications: [
      { name: '', dose: '', frequency: '', duration: '', instructions: '' }
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
    if (formData.dob && formData.dob > new Date()) {
      newErrors.dob = 'Date of birth cannot be in the future';
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof Omit<FormData, 'dob' | 'sex'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSexChange = (value: string) => {
    setFormData(prev => ({ ...prev, sex: value }));
  };

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

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    setExtraData(prev => {
      const newMeds = [...prev.medications];
      newMeds[index][field] = value;
      return { ...prev, medications: newMeds };
    });
  };

  const addMedication = () => {
    setExtraData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dose: '', frequency: '', duration: '', instructions: '' }]
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
        medications: extraData.medications
      };
      const response = await fetch(myUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          New Patient Registration
        </CardTitle>
        <CardDescription>Enter details, complaints & medicines to generate prescription.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitForm} className="space-y-4">
          {/* Basic fields */}
          <div>
            <Label>Full Name</Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)}
                     className={`pl-10 ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter full name" />
            </div>
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal",
                          !formData.dob && "text-muted-foreground", errors.dob && "border-red-500")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dob ? format(formData.dob, "PPP") : <span>Select date of birth</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b space-y-2">
                  <div className="flex gap-2">
                    <Select value={calendarDate.getMonth().toString()} onValueChange={handleMonthChange}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={calendarDate.getFullYear().toString()} onValueChange={handleYearChange}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">
                        {years.map((year) => (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Calendar mode="single" selected={formData.dob} onSelect={handleDateChange}
                          month={calendarDate} onMonthChange={setCalendarDate}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {errors.dob && <p className="text-sm text-red-500 mt-1">{errors.dob}</p>}
          </div>
          <div>
            <Label>Sex</Label>
            <Select value={formData.sex} onValueChange={handleSexChange}>
              <SelectTrigger className="pl-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone Number</Label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)}
                     className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`} placeholder="1234567890" />
            </div>
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
          </div>
          {/* Extra fields */}
          <Textarea value={extraData.complaints} onChange={e => handleExtraChange('complaints', e.target.value)} placeholder="Complaints" />
          <Textarea value={extraData.findings} onChange={e => handleExtraChange('findings', e.target.value)} placeholder="Findings" />
          <Textarea value={extraData.investigations} onChange={e => handleExtraChange('investigations', e.target.value)} placeholder="Investigations" />
          <Textarea value={extraData.diagnosis} onChange={e => handleExtraChange('diagnosis', e.target.value)} placeholder="Diagnosis" />
          <Textarea value={extraData.advice} onChange={e => handleExtraChange('advice', e.target.value)} placeholder="Advice" />
          {/* Medications */}
          <div className="space-y-2">
            <Label>Medications</Label>
            {extraData.medications.map((med, index) => (
              <div key={index} className="space-y-1 border p-2 rounded">
                <Input value={med.name} onChange={e => handleMedChange(index, 'name', e.target.value)} placeholder="Medicine Name" />
                <Input value={med.dose} onChange={e => handleMedChange(index, 'dose', e.target.value)} placeholder="Dose" />
                <Input value={med.frequency} onChange={e => handleMedChange(index, 'frequency', e.target.value)} placeholder="Frequency" />
                <Input value={med.duration} onChange={e => handleMedChange(index, 'duration', e.target.value)} placeholder="Duration" />
                <Input value={med.instructions} onChange={e => handleMedChange(index, 'instructions', e.target.value)} placeholder="Instructions" />
                <Button type="button" variant="destructive" onClick={() => removeMedication(index)}>Remove</Button>
              </div>
            ))}
            <Button type="button" onClick={addMedication}>Add Medication</Button>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</>) : 'Register & Generate Prescription'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EMR;
