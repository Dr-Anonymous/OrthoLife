
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ServiceSelector from './appointment/ServiceSelector';
import DateSelector from './appointment/DateSelector';
import TimeSlotSelector from './appointment/TimeSlotSelector';
import PaymentOptionSelector from './appointment/PaymentOptionSelector';
import AppointmentSummary from './appointment/AppointmentSummary';

interface TimeSlot {
  start: string;
  end: string;
  display: string;
}

interface ServiceType {
  name: string;
  duration: number;
  price: number;
}

interface AppointmentData {
  start: string;
  end: string;
  serviceType: string;
  amount: number;
}

interface AppointmentBookingProps {
  onComplete: (data: AppointmentData) => void;
  onBack: () => void;
  paymentOption: 'online' | 'offline';
  onPaymentOptionChange: (option: 'online' | 'offline') => void;
}

const services: ServiceType[] = [
  { name: 'New Consultation', duration: 30, price: 500 },
  { name: 'Follow-up Visit', duration: 20, price: 300 },
  { name: 'General Physician Consultation', duration: 45, price: 500 },
  { name: 'X-Ray', duration: 15, price: 300 },
];

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ 
  onComplete, 
  onBack, 
  paymentOption, 
  onPaymentOptionChange 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const selectedServiceData = services.find(s => s.name === selectedService);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    setError('');
    try {
      // Create date in local timezone and set to start of day
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      const localDate = new Date(year, month, day, 0, 0, 0, 0);
      
      console.log('Fetching slots for date:', localDate.toISOString());
      console.log('Local date string:', localDate.toString());
      console.log('Timezone offset:', localDate.getTimezoneOffset());
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: { 
          date: localDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        setError('Unable to fetch available slots. Please try again.');
        setAvailableSlots([]);
        return;
      }

      console.log('Received slots data:', data);
      setAvailableSlots(data?.slots || []);
      
      if (!data?.slots || data.slots.length === 0) {
        setError('No available slots for this date. Please select another date.');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setError('Unable to fetch available slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    if (!selectedSlot || !selectedServiceData) return;

    const appointmentData: AppointmentData = {
      start: selectedSlot.start,
      end: selectedSlot.end,
      serviceType: selectedService,
      amount: selectedServiceData.price
    };

    onComplete(appointmentData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Book Your Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ServiceSelector
            services={services}
            selectedService={selectedService}
            onServiceChange={setSelectedService}
          />

          <DateSelector
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />

          <TimeSlotSelector
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedSlot={selectedSlot}
            loading={loading}
            error={error}
            onSlotSelect={setSelectedSlot}
          />

          {selectedSlot && selectedServiceData && (
            <PaymentOptionSelector
              paymentOption={paymentOption}
              onPaymentOptionChange={onPaymentOptionChange}
            />
          )}

          {selectedSlot && selectedServiceData && (
            <AppointmentSummary
              selectedSlot={selectedSlot}
              selectedServiceData={selectedServiceData}
              selectedService={selectedService}
              selectedDate={selectedDate!}
              paymentOption={paymentOption}
            />
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleBookAppointment}
              disabled={!selectedSlot || !selectedService}
              className="flex-1"
            >
              {paymentOption === 'online' ? 'Proceed to Payment' : 'Book Appointment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentBooking;
