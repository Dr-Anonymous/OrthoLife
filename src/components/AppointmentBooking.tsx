import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar as CalendarIcon, DollarSign, CreditCard, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';


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
      console.log('Fetching slots for date:', selectedDate.getDate());
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: { date: selectedDate.getDate()}
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

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 ;//|| day === 6;
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
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
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Service</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    <div className="flex justify-between items-center w-full">
                      <span>{service.name}</span>
                      <span className="text-green-600 font-medium">₹{service.price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedServiceData && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {selectedServiceData.duration} minutes</span>
                  <DollarSign className="w-4 h-4 ml-4" />
                  <span>Fee: ₹{selectedServiceData.price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isPastDate(date) || isWeekend(date)}
              className="rounded-md border"
            />
            <p className="text-sm text-gray-500 mt-2">
              Appointments available Monday to Saturday only. For instant EMERGENCY / Sunday consultation contact through Whatsapp
            </p>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Available Time Slots for {selectedDate.toLocaleDateString()}
              </label>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              {loading ? (
                <div className="text-center py-4">Loading available slots...</div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot)}
                      className="text-sm"
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              ) : !error ? (
                <p className="text-center py-4 text-gray-500">
                  No available slots for this date
                </p>
              ) : null}
            </div>
          )}

          {/* Payment Option Selection */}
          {selectedSlot && selectedServiceData && (
            <div>
              <label className="block text-sm font-medium mb-2">Payment Option</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={paymentOption === 'offline' ? 'default' : 'outline'}
                  onClick={() => onPaymentOptionChange('offline')}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <MapPin className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Pay at Clinic</div>
                    <div className="text-xs opacity-70">Pay when you visit</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={paymentOption === 'online' ? 'default' : 'outline'}
                  onClick={() => onPaymentOptionChange('online')}
                  className="flex items-center gap-2 h-auto p-4"
                >
                  <CreditCard className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">Pay Online</div>
                    <div className="text-xs opacity-70">Secure payment</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedSlot && selectedServiceData && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Appointment Summary</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Service:</strong> {selectedService}</p>
                <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {selectedSlot.display}</p>
                <p><strong>Duration:</strong> {selectedServiceData.duration} minutes</p>
                <p><strong>Fee:</strong> ₹{selectedServiceData.price}</p>
                <p><strong>Payment:</strong> {paymentOption === 'online' ? 'Online Payment' : 'Pay at Clinic'}</p>
              </div>
            </div>
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
