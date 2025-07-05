import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, MapPin, Loader2 } from 'lucide-react';

interface PatientDetailsFormProps {
  patientData: {
    name: string;
    phone: string;
    address: string;
  };
  onPatientDataChange: (data: { name: string; phone: string; address: string; }) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const PatientDetailsForm: React.FC<PatientDetailsFormProps> = ({
  patientData,
  onPatientDataChange,
  onSubmit,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    onPatientDataChange({
      ...patientData,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFormValid = patientData.name.trim() && patientData.phone.trim() && patientData.address.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Patient Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={patientData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
            value={patientData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Delivery Address *</Label>
          <Textarea
            id="address"
            placeholder="Enter your complete address for delivery"
            value={patientData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            required
          />
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Home Service</p>
              <p>Our team will reach the above provided address within few hours.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="flex-1"
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              'Order'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientDetailsForm;
