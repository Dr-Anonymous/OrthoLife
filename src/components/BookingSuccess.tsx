
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, Mail } from 'lucide-react';

const BookingSuccess: React.FC = () => {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-green-800">Appointment Booked Successfully!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Your appointment has been confirmed and you will receive a confirmation email shortly.
        </p>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Calendar className="w-4 h-4" />
            <span>Check your email for appointment details</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Clock className="w-4 h-4" />
            <span>Please arrive 15 minutes before your appointment</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Mail className="w-4 h-4" />
            <span>Bring a valid ID and any previous medical records</span>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> If you need to reschedule or cancel your appointment, 
            please call us at least 24 hours in advance.
          </p>
        </div>

        <Button 
          onClick={() => window.location.href = '/'} 
          className="w-full"
        >
          Back to Home
        </Button>
      </CardContent>
    </Card>
  );
};

export default BookingSuccess;
