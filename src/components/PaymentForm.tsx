import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFormProps {
  appointmentData: any;
  patientData: any;
  onSuccess: () => void;
  onBack: () => void;
}

// Cashfree types
declare global {
  interface Window {
    Cashfree: any;
  }
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  appointmentData, 
  patientData, 
  onSuccess, 
  onBack 
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update this function to use production SDK:
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // If already loaded
      if ((window as any).Cashfree) {
        resolve(true);
        return;
      }
      // Always load PRODUCTION JS SDK for production environment
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Load Cashfree script
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Cashfree SDK');
      }

      // Step 1: Create Cashfree order on backend
      const { data: cashfreeData, error: cfError } = await supabase.functions.invoke(
        'create-cashfree-order',
        {
          body: {
            amount: appointmentData.amount,
            currency: 'INR',
            orderNote: `${appointmentData.serviceType} - Appointment`,
            customerDetails: {
              customer_id: patientData.phone,
              customer_email: patientData.email,
              customer_phone: patientData.phone,
              customer_name: patientData.name
            }
          }
        }
      );

      if (cfError) throw cfError;
      if (!cashfreeData.payment_session_id) {
        throw new Error("Cashfree order creation failed.");
      }

      // Step 2: Show Cashfree checkout popup
      const cashfree = (window as any).Cashfree;
      cashfree?.popups?.initiatePayment(
        {
          paymentSessionId: cashfreeData.payment_session_id,
          returnUrl: window.location.href + '?cf_payment_success={order_id}'
        },
        {
          onSuccess: async (data: any) => {
            try {
              // Book the appointment
              const { data: bookingData, error: bookingError } = await supabase.functions.invoke(
                'book-appointment',
                {
                  body: {
                    patientData,
                    appointmentData,
                    paymentData: {
                      paymentMethod: "cashfree",
                      paymentStatus: "paid",
                      cashfreeDetails: data
                    }
                  }
                }
              );
              if (bookingError) throw bookingError;
              onSuccess();
            } catch (error) {
              setError('Payment successful but failed to book appointment. Please contact support.');
              console.error('Error booking appointment:', error);
            }
          },
          onFailure: (data: any) => {
            setError(data?.message || 'Payment failed. Please try again.');
            setProcessing(false);
          },
          onClose: () => {
            setProcessing(false);
          }
        }
      );

    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{appointmentData.serviceType}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>
                {new Date(appointmentData.start).toLocaleDateString()} at{' '}
                {new Date(appointmentData.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-green-600">₹{appointmentData.amount}</span>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Patient Details</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {patientData.name}</p>
            <p><strong>Email:</strong> {patientData.email}</p>
            <p><strong>Phone:</strong> {patientData.phone}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Payment Information */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium">Secure Payment</p>
              <p>Your payment is processed securely through Cashfree. We accept all major cards, UPI, and net banking.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={processing} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={processing}
            className="flex-1"
          >
            {processing ? 'Processing...' : `Pay ₹${appointmentData.amount}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
