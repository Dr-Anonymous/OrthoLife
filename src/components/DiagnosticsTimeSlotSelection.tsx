import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Calendar as CalendarIcon, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  start: string;
  end: string;
  display: string;
}

interface DiagnosticsTimeSlotSelectionProps {
  onComplete: (timeSlotData: { start: string; end: string; date: string }) => void;
  onBack: () => void;
}

const DiagnosticsTimeSlotSelection: React.FC<DiagnosticsTimeSlotSelectionProps> = ({ 
  onComplete, 
  onBack 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      
      const { data, error } = await supabase.functions.invoke('get-diagnostics-slots', {
        body: { date: `${year}-${month}-${day}`}
      });

      if (error) {
        console.error('Supabase function error:', error);
        setError('Unable to fetch available slots. Please try again.');
        setAvailableSlots([]);
        return;
      }

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

  const handleContinue = () => {
    if (!selectedSlot || !selectedDate) return;

    const timeSlotData = {
      start: selectedSlot.start,
      end: selectedSlot.end,
      date: selectedDate.toISOString().split('T')[0]
    };

    onComplete(timeSlotData);
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
            <Home className="w-5 h-5 text-blue-600" />
            Schedule Home Collection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select your preferred date and time for blood sample collection at home
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isPastDate(date)}
              className="rounded-md border"
            />
            <p className="text-sm text-gray-500 mt-2">
              Our phlebotomist will visit your home at the selected time
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

          {/* Summary */}
          {selectedSlot && selectedDate && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Collection Summary
              </h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Service:</strong> Home Blood Collection</p>
                <p><strong>Date:</strong> {selectedDate?.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {selectedSlot.display}</p>
                <p><strong>Location:</strong> Your Home Address</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!selectedSlot || !selectedDate}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticsTimeSlotSelection;