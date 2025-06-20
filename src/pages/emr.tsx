import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const emr = () => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    sex: 'M',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [prescriptionLink, setPrescriptionLink] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSexChange = (value: string) => {
    setFormData(prev => ({ ...prev, sex: value }));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your name',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine the URL based on URL params (matching original logic)
      const params = new URLSearchParams(window.location.search);
      const param = params.toString().slice(0, -1);
      const url = param === '2' 
        ? 'https://script.google.com/macros/s/AKfycbxkmInqjlZUTs7xzT3KVvZsjhLtbixReGfYAdE8QJQvEDGDINdOMpUGF1X68FAgbTl9/exec'
        : 'https://script.google.com/macros/s/AKfycbzy7xI1Py_LRwr90_x3A7HA6yPCLjUBPNvbY0hU1cMML3V-ewLkLcv6FAGBMSdIRxn4/exec';

      const queryParams = new URLSearchParams({
        name: formData.name,
        dob: formData.dob,
        sex: formData.sex,
        phone: formData.phone
      }).toString();

      const response = await fetch(`${url}?${queryParams}`);
      
      if (!response.ok) throw new Error('Registration failed');
      
      const result = await response.text();
      setPrescriptionLink(result);
      setRegistrationSuccess(true);
      
      toast({
        title: 'Registration Successful',
        description: 'You can now view your prescriptions online',
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Registration failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Registration Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>Click the button below on a mobile device to complete payment via UPI:</p>
            <Button asChild variant="outline" className="w-full">
              <a href={`upi://pay?pa=drshalima@upi&pn=SHALIMA PINNAMANENI&cu=INR&am=300`}>
                Complete Payment (₹300)
              </a>
            </Button>
          </div>
          <div className="space-y-2">
            <p>You can view your prescriptions here:</p>
            <Button asChild variant="outline" className="w-full">
              <a href={prescriptionLink} target="_blank" rel="noopener noreferrer">
                View Prescriptions
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">New Patient Registration</CardTitle>
        <CardDescription>
          Please enter your basic details to register and view prescriptions online
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitForm} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dob" className="block text-sm font-medium">
              Date of Birth
            </label>
            <Input
              id="dob"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sex" className="block text-sm font-medium">
              Sex
            </label>
            <Select value={formData.sex} onValueChange={handleSexChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium">
              Phone Number
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Preferably with WhatsApp"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default emr;
