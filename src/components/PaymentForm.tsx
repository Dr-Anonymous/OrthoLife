import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFormProps {
  appointmentData: {
    serviceType: string;
    start: string;
    amount: number;
    // Add other relevant appointment data fields as needed
  };
  patientData: {
    name: string;
    email: string;
    phone: string;
    // Add other relevant patient data fields as needed
  };
  onSuccess: () => void;
  onBack: () => void;
}

// Cashfree types - more specific
declare global {
  interface Window {
    Cashfree: {
      popups: {
        initiatePayment: (
          options: {
            paymentSessionId: string;
            returnUrl?: string;
            redirectTarget?: string; // Often 'self' or '_blank'
          },
          callbacks: {
            onSuccess: (data: any) => void;
            onFailure: (data: any) => void;
            onClose?: () => void;
          }
        ) => void;
        // Other methods if they exist, like init() for explicit initialization
        // init?: (options: any) => void;
      };
      // Other top-level Cashfree properties if they exist
    };
  }
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  appointmentData,
  patientData,
  onSuccess,
  onBack,
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize loadCashfreeScript to prevent re-creation on every render
  const loadCashfreeScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if Cashfree SDK is already loaded
      if (window.Cashfree && typeof window.Cashfree.popups?.initiatePayment === 'function') {
        console.log('Cashfree SDK already loaded.');
        resolve(true);
        return;
      }

      const scriptId = 'cashfree-sdk-script';
      if (document.getElementById(scriptId)) {
        console.log('Cashfree SDK script element already exists.');
        resolve(true); // Assuming if element exists, it's either loading or loaded
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      // Always load PRODUCTION JS SDK for production environment
      script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
      script.async = true; // Load script asynchronously

      script.onload = () => {
        console.log('Cashfree SDK loaded successfully.');
        resolve(true);
      };

      script.onerror = () => {
        console.error('Failed to load Cashfree SDK script.');
        setError('Failed to load payment gateway. Please refresh and try again.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []); // Empty dependency array means this function is created once

  // Optional: Load script on component mount if needed, or keep it within handlePayment
  useEffect(() => {
    // You could pre-load it here if you want, but loading on payment trigger is fine too.
    // loadCashfreeScript();
  }, [loadCashfreeScript]);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        throw new Error('Cashfree SDK failed to load.');
      }

      if (!window.Cashfree || typeof window.Cashfree.popups?.initiatePayment !== 'function') {
        throw new Error('Cashfree SDK not initialized correctly after loading.');
      }

      // Step 1: Create Cashfree order on backend via Supabase Function
      const { data: cashfreeData, error: cfError } = await supabase.functions.invoke(
        'create-cashfree-order',
        {
          body: {
            amount: appointmentData.amount,
            currency: 'INR',
            orderNote: `${appointmentData.serviceType} - Appointment for ${patientData.name}`,
            customerDetails: {
              customer_id: patientData.phone, // Unique identifier for the customer
              customer_email: patientData.email,
              customer_phone: patientData.phone,
              customer_name: patientData.name,
            },
            // Add any other metadata you want to pass to Cashfree
            // metadata: {
            //   appointment_id: appointmentData.id,
            //   patient_id: patientData.id
            // }
          },
        }
      );

      if (cfError) {
        console.error('Supabase function error creating Cashfree order:', cfError);
        throw new Error(cfError.message || "Failed to create payment order. Please try again.");
      }
      if (!cashfreeData || !cashfreeData.payment_session_id) {
        throw new Error("Cashfree order creation failed: No payment session ID received.");
      }

      // Step 2: Show Cashfree checkout popup
      const cashfree = window.Cashfree;

      // You might need to explicitly initialize if Cashfree requires it for the popups object.
      // Example (check Cashfree docs for exact init method/options):
      // if (cashfree.init && typeof cashfree.init === 'function') {
      //   cashfree.init({}); // Pass any necessary configuration
      // }

      cashfree.popups.initiatePayment(
        {
          paymentSessionId: cashfreeData.payment_session_id,
          // It's often better to handle success on your backend with webhooks,
          // but returnUrl is for client-side redirection after payment.
          // Ensure this URL is correctly configured in your Cashfree dashboard.
          returnUrl: `${window.location.origin}/payment-status?cf_payment_success={order_id}&cf_order_id={order_id}&cf_txn_status={txStatus}`,
          redirectTarget: '_self' // Or '_blank' for a new tab, '_self' for same tab
        },
        {
          onSuccess: async (data: any) => {
            console.log('Cashfree Payment Success:', data);
            // Verify payment status with your backend here for security,
            // before marking the appointment as booked.
            // For this example, we assume `data` contains sufficient success info.
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
                      cashfreeDetails: data, // Store Cashfree success response
                      cashfreeOrderId: data.orderId, // Store the Cashfree order ID
                      cashfreeTxnId: data.transactionId // Store the Cashfree transaction ID
                    }
                  }
                }
              );

              if (bookingError) {
                console.error('Supabase function error booking appointment:', bookingError);
                throw new Error(bookingError.message || 'Payment successful but failed to book appointment. Please contact support with your payment details.');
              }
              console.log('Appointment booked successfully:', bookingData);
              onSuccess(); // Call the parent's success handler
            } catch (error: any) {
              setError(error.message || 'Payment successful, but failed to finalize appointment. Please contact support.');
              console.error('Error booking appointment after successful payment:', error);
            } finally {
              setProcessing(false); // Ensure processing state is reset
            }
          },
          onFailure: (data: any) => {
            console.error('Cashfree Payment Failure:', data);
            setError(data?.message || data?.reason || 'Payment failed. Please try again or choose another method.');
            setProcessing(false);
          },
          onClose: () => {
            console.log('Cashfree Payment popup closed.');
            setProcessing(false); // Reset processing state if user closes popup
          }
        }
      );

    } catch (error: any) {
      console.error('Error in handlePayment:', error);
      setError(error.message || 'An unexpected error occurred during payment processing. Please try again.');
      setProcessing(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0, // No decimal for whole rupees
      maximumFractionDigits: 2, // Allow two decimals if cents are present
    }).format(amount);
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
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatCurrency(appointmentData.amount)}</span>
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
            {processing ? 'Processing...' : `Pay ${formatCurrency(appointmentData.amount)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
