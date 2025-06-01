
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, Mail, MapPin, CreditCard } from 'lucide-react';

interface BookingSuccessProps {
  paymentOption: 'online' | 'offline';
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ paymentOption }) => {
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
          Your appointment has been booked and you will receive a confirmation through SMS/Whatsapp shortly.
        </p>

        {paymentOption === 'offline' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Payment at Clinic</p>
                <p>Please bring the exact amount (cash or card) when you visit the clinic.</p>
              </div>
            </div>
          </div>
        )}

        {paymentOption === 'online' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium">Payment Confirmed</p>
                <p>Your online payment has been processed successfully.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Clock className="w-4 h-4" />
            <span>Please arrive 10 minutes before your appointment</span>
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
