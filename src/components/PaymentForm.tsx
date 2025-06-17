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

// Correct Cashfree types for current SDK
declare global {
  interface Window {
    Cashfree: new (options: { mode: string }) => {
      checkout: (options: any) => Promise<any>;
    };
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

  // Load correct Cashfree SDK
  const loadCashfreeScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // If already loaded
      if ((window as any).Cashfree) {
        resolve(true);
        return;
      }
      
      // Load the current Cashfree JS SDK
      const script = document.createElement('script');
      // Using the correct SDK URL from documentation
      script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
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
            order_amount: appointmentData.amount,
            order_currency: 'INR',
            order_note: `${appointmentData.serviceType} - Appointment`,
            customer_details: {
              customer_id: patientData.phone,
              customer_email: patientData.email,
              customer_phone: patientData.phone,
              customer_name: patientData.name
            },
            order_meta: {
              return_url: `${window.location.origin}?payment_status=success&order_id={order_id}`,
              notify_url: `${window.location.origin}/api/cashfree-webhook`
            }
          }
        }
      );

      if (cfError) throw cfError;
      if (!cashfreeData.payment_session_id) {
        throw new Error("Failed to create payment session");
      }

      // Step 2: Initialize Cashfree SDK and open checkout
      const cashfree = new window.Cashfree({ mode: 'sandbox' });


      // For redirect checkout (most common and stable)
      const checkoutOptions = {
        paymentSessionId: cashfreeData.payment_session_id,
        redirectTarget: '_modal', // Opens in popup modal
        returnUrl: `${window.location.origin}?payment_status=success&order_id=${cashfreeData.order_id}`
      };

      // Handle the checkout promise
      try {
        const result = await cashfree.checkout(checkoutOptions);
        
        // Handle success case
        if (result && result.paymentDetails) {
          console.log('Payment Success:', result);
          
          try {
            // Verify payment and book appointment
            const { data: bookingData, error: bookingError } = await supabase.functions.invoke(
              'book-appointment',
              {
                body: {
                  patientData,
                  appointmentData,
                  paymentData: {
                    paymentMethod: "cashfree",
                    paymentStatus: "completed",
                    orderId: result.paymentDetails.orderId || cashfreeData.order_id,
                    paymentSessionId: cashfreeData.payment_session_id,
                    cashfreeDetails: result
                  }
                }
              }
            );
            
            if (bookingError) throw bookingError;
            
            setProcessing(false);
            onSuccess();
          } catch (error) {
            console.error('Error booking appointment:', error);
            setError('Payment successful but failed to book appointment. Please contact support.');
            setProcessing(false);
          }
        } else {
          // Payment was not successful or was cancelled
          console.log('Payment not completed:', result);
          setError('Payment was not completed. Please try again.');
          setProcessing(false);
        }
      } catch (checkoutError: any) {
        console.error('Checkout error:', checkoutError);
        setError(checkoutError.message || 'Payment failed. Please try again.');
        setProcessing(false);
      }

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setError(error.message || 'Failed to initialize payment. Please try again.');
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
              <span className="font-medium">{appointmentData.serviceType}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span className="font-medium">
                {new Date(appointmentData.start).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })} at{' '}
                {new Date(appointmentData.start).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <div className="flex justify-between items-center font-medium text-lg border-t pt-3 mt-3">
              <span>Total Amount:</span>
              <span className="text-green-600 text-xl">₹{appointmentData.amount}</span>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3 text-blue-800">Patient Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600">Name:</span>
              <span className="font-medium">{patientData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Email:</span>
              <span className="font-medium">{patientData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Phone:</span>
              <span className="font-medium">{patientData.phone}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 text-sm font-medium">Payment Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Security Information */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">100% Secure Payment</p>
              <p className="text-green-600">
                Your payment is processed securely through Cashfree Payment Gateway. 
                We support UPI, Cards, Net Banking, Wallets and EMI options.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Methods Preview */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h4 className="font-medium mb-3 text-slate-700">Accepted Payment Methods</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">UPI</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Cards</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Net Banking</span>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Wallets</span>
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">Pay Later</span>
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">EMI</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={onBack} 
            disabled={processing} 
            className="flex-1"
          >
            ← Back
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={processing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {processing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              `Pay ₹${appointmentData.amount} Securely`
            )}
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          By proceeding with payment, you agree to our terms of service. 
          Your appointment will be confirmed upon successful payment.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
