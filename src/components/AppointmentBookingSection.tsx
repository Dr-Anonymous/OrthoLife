
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PatientRegistration from './PatientRegistration';
import AppointmentBooking from './AppointmentBooking';
import PaymentForm from './PaymentForm';
import BookingSuccess from './BookingSuccess';

type BookingStep = 'registration' | 'appointment' | 'payment' | 'success';

interface PatientData {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
}

interface AppointmentData {
  start: string;
  end: string;
  serviceType: string;
  amount: number;
}

const AppointmentBookingSection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('registration');
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const [paymentOption, setPaymentOption] = useState<'online' | 'offline'>('offline');

  const handlePatientRegistration = (data: PatientData) => {
    setPatientData(data);
    setCurrentStep('appointment');
  };

  const handleAppointmentBooking = (data: AppointmentData) => {
    setAppointmentData(data);
    if (paymentOption === 'online') {
      setCurrentStep('payment');
    } else {
      handleOfflineBooking(data);
    }
  };

  const handleOfflineBooking = async (data: AppointmentData) => {
    if (!patientData) return;

    try {
      const { data: bookingData, error } = await supabase.functions.invoke(
        'book-appointment',
        {
          body: {
            patientData,
            appointmentData: data,
            paymentData: {
              paymentMethod: 'offline',
              paymentStatus: 'pending'
            }
          }
        }
      );

      if (error) throw error;
      setCurrentStep('success');
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
  };

  const goBackToRegistration = () => {
    setCurrentStep('registration');
  };

  const goBackToAppointment = () => {
    setCurrentStep('appointment');
  };

  return (
    <section id="book-appointment" className="py-16 bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Appointment
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto"> 
            Easy online booking with flexible payment options.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap">
              {[
                { step: 'registration', label: 'Registration', number: 1 },
                { step: 'appointment', label: 'Appointment', number: 2 },
                { step: 'payment', label: 'Payment', number: 3 },
                { step: 'success', label: 'Confirmation', number: 4 },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center mb-4 sm:mb-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === item.step
                        ? 'bg-blue-600 text-white'
                        : index < ['registration', 'appointment', 'payment', 'success'].indexOf(currentStep)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.number}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                  {index < 3 && (
                    <div
                      className={`flex-1 h-1 mx-4 hidden sm:block ${
                        index < ['registration', 'appointment', 'payment', 'success'].indexOf(currentStep)
                          ? 'bg-green-600'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex justify-center">
            {currentStep === 'registration' && (
              <PatientRegistration onComplete={handlePatientRegistration} />
            )}
            
            {currentStep === 'appointment' && (
              <AppointmentBooking 
                onComplete={handleAppointmentBooking}
                onBack={goBackToRegistration}
                paymentOption={paymentOption}
                onPaymentOptionChange={setPaymentOption}
              />
            )}
            
            {currentStep === 'payment' && appointmentData && patientData && (
              <PaymentForm
                appointmentData={appointmentData}
                patientData={patientData}
                onSuccess={handlePaymentSuccess}
                onBack={goBackToAppointment}
              />
            )}
            
            {currentStep === 'success' && <BookingSuccess paymentOption={paymentOption} />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppointmentBookingSection;
