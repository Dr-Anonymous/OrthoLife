
import React from 'react';

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

interface AppointmentSummaryProps {
  selectedSlot: TimeSlot;
  selectedServiceData: ServiceType;
  selectedService: string;
  selectedDate: Date;
  paymentOption: 'online' | 'offline';
}

const AppointmentSummary: React.FC<AppointmentSummaryProps> = ({
  selectedSlot,
  selectedServiceData,
  selectedService,
  selectedDate,
  paymentOption
}) => {
  return (
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <h4 className="font-medium text-green-800 mb-2">Appointment Summary</h4>
      <div className="space-y-1 text-sm text-green-700">
        <p><strong>Service:</strong> {selectedService}</p>
        <p><strong>Date:</strong> {selectedDate.toLocaleDateString()}</p>
        <p><strong>Time:</strong> {selectedSlot.display}</p>
        <p><strong>Duration:</strong> {selectedServiceData.duration} minutes</p>
        <p><strong>Fee:</strong> ₹{selectedServiceData.price}</p>
        <p><strong>Payment:</strong> {paymentOption === 'online' ? 'Online Payment' : 'Pay at Clinic'}</p>
      </div>
    </div>
  );
};

export default AppointmentSummary;
