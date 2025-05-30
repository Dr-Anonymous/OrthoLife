
import React, { useState } from 'react';
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

  const handlePatientRegistration = (data: PatientData) => {
    setPatientData(data);
    setCurrentStep('appointment');
  };

  const handleAppointmentBooking = (data: AppointmentData) => {
    setAppointmentData(data);
    setCurrentStep('payment');
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
            Schedule your visit with our experienced orthopedic specialists. 
            Easy online booking with secure payment.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { step: 'registration', label: 'Registration', number: 1 },
                { step: 'appointment', label: 'Appointment', number: 2 },
                { step: 'payment', label: 'Payment', number: 3 },
                { step: 'success', label: 'Confirmation', number: 4 },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center">
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
                      className={`flex-1 h-1 mx-4 ${
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
            
            {currentStep === 'success' && <BookingSuccess />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppointmentBookingSection;
