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

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      console.log('[Cashfree] Starting payment process...');

      // Load SDK
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Cashfree SDK');
      }
      console.log('[Cashfree] SDK loaded');

      // Create Cashfree order
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

      console.log('[Cashfree] Response:', cashfreeData);

      const sessionId = cashfreeData?.payment_session_id;
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error("Invalid payment_session_id received.");
      }

      const cashfree = window?.Cashfree;
      if (!cashfree?.popups?.initiatePayment) {
        throw new Error("Cashfree popup method not available.");
      }

      console.log('[Cashfree] Initiating popup with session ID:', sessionId);

      // Initiate payment popup
      cashfree.popups.initiatePayment(
        {
          paymentSessionId: sessionId,
          returnUrl: `${window.location.origin}/payment-success?cf_payment_success={order_id}`
        },
        {
          onSuccess: async (data: any) => {
            console.log('[Cashfree] Payment success:', data);
            try {
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
            } catch (err) {
              setError('Payment successful, but booking failed. Please contact support.');
              console.error('[Booking Error]:', err);
            }
          },
          onFailure: (data: any) => {
            console.error('[Cashfree] Payment failure:', data);
            setError(data?.message || 'Payment failed. Please try again.');
            setProcessing(false);
          },
          onClose: () => {
            console.warn('[Cashfree] Payment popup closed by user');
            setProcessing(false);
          }
        }
      );

      // Fallback: alert if popup didn’t open in 5 seconds
      setTimeout(() => {
        if (processing) {
          alert('If the payment popup didn’t open, please disable popup blockers and try again.');
        }
      }, 5000);

    } catch (error: any) {
      console.error('[Cashfree Error]:', error);
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
