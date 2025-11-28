import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import PatientRegistration from '@/components/PatientRegistration';
import AppointmentBooking from '@/components/AppointmentBooking';
import PaymentForm from '@/components/PaymentForm';
import BookingSuccess from '@/components/BookingSuccess';

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

const AppointmentPage = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('registration');
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const [paymentOption, setPaymentOption] = useState<'online' | 'offline'>('offline');
  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [initialServiceType, setInitialServiceType] = useState<string | undefined>(undefined);
  const location = useLocation();
  const { serviceType } = useParams();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle Service Type Autofill (from URL params only)
    if (serviceType) {
      if (serviceType === 'ortho') setInitialServiceType('Orthopaedic Consultation');
      else if (serviceType === 'physician') setInitialServiceType('General Physician Consultation');
      else if (serviceType === 'follow-up') setInitialServiceType('Follow-up Visit');
      else if (serviceType === 'home-visit') setInitialServiceType('Home Visit');
    }

    // Handle Reschedule
    if (params.get('reschedule')) {
      const eventId = params.get('eventId');
      const start = params.get('start');
      const description = params.get('description');

      // Basic parsing of name and phone from description
      const nameMatch = description?.match(/Name:\s*(.*?)\s*Phone:/);
      const phoneMatch = description?.match(/Phone:\s*([\d\s\+]+)/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      const phone = phoneMatch ? phoneMatch[1].trim() : '';

      const data = {
        eventId,
        start,
        description,
        patient: { name, phone }
      };
      setRescheduleData(data);

      // Pre-fill patient data and skip to the appointment step
      if (data.patient.name && data.patient.phone) {
        setPatientData({
          name: data.patient.name,
          phone: data.patient.phone,
          email: '', // Not available from event
          address: '', // Not available from event
          dateOfBirth: '', // Not available from event
        });
        setCurrentStep('appointment');
      }
    }
  }, [location]);

  const handlePatientRegistration = (data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string | Date | undefined;
  }) => {
    const fixedData: PatientData = {
      ...data,
      dateOfBirth: data.dateOfBirth
        ? typeof data.dateOfBirth === "string"
          ? data.dateOfBirth
          : (data.dateOfBirth instanceof Date && !isNaN(data.dateOfBirth.getTime()))
            ? data.dateOfBirth.toISOString()
            : ""
        : ""
    };
    setPatientData(fixedData);
    setCurrentStep('appointment');
  };

  const handleAppointmentBooking = (data: AppointmentData) => {
    setAppointmentData(data);
    if (paymentOption === 'online' && data['amount'] !== 0) {
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
            },
            eventId: rescheduleData?.eventId
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section id="book-appointment" className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === item.step
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
                          className={`flex-1 h-1 mx-4 hidden sm:block ${index < ['registration', 'appointment', 'payment', 'success'].indexOf(currentStep)
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
                  <PatientRegistration
                    onComplete={handlePatientRegistration}
                    initialData={rescheduleData?.patient}
                  />
                )}

                {currentStep === 'appointment' && (
                  <AppointmentBooking
                    onComplete={handleAppointmentBooking}
                    onBack={goBackToRegistration}
                    paymentOption={paymentOption}
                    onPaymentOptionChange={setPaymentOption}
                    rescheduleData={rescheduleData}
                    initialServiceType={initialServiceType}
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
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default AppointmentPage;
