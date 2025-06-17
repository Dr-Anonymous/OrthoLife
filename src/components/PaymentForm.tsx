import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Assuming this path is correct

interface PaymentFormProps {
  appointmentData: {
    serviceType: string;
    start: string;
    amount: number;
    // Add other relevant appointment data fields as needed, e.g., id
    id?: string;
  };
  patientData: {
    name: string;
    email: string;
    phone: string;
    // Add other relevant patient data fields as needed, e.g., id
    id?: string;
  };
  onSuccess: () => void;
  onBack: () => void;
}

// Cashfree types - more specific for SDK 2.0.0 popup mode
declare global {
  interface Window {
    Cashfree: {
      popups: {
        initiatePayment: (
          options: {
            paymentSessionId: string;
            returnUrl?: string;
            redirectTarget?: '_self' | '_blank'; // Explicitly define accepted values
          },
          callbacks: {
            onSuccess: (data: any) => void;
            onFailure: (data: any) => void;
            onClose?: () => void;
          }
        ) => void;
      };
      // IMPORTANT: For Cashfree Web SDK 2.0.0 for popup payments,
      // there is typically NO top-level 'init' function required or used here.
      // The initiatePayment method handles the initialization internally for the popup.
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
      // Check if Cashfree SDK is already loaded and its initiatePayment function is available
      if (window.Cashfree && typeof window.Cashfree.popups?.initiatePayment === 'function') {
        console.log('Cashfree SDK already loaded and ready.');
        resolve(true);
        return;
      }

      const scriptId = 'cashfree-sdk-script';
      if (document.getElementById(scriptId)) {
        console.warn('Cashfree SDK script element already exists. Waiting for it to load.');
        // If the script element exists, it might be loading.
        // We'll proceed, and the later check on `window.Cashfree` will confirm readiness.
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      // Use the production SDK URL for Cashfree Web SDK 2.0.0
      script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
      script.async = true; // Load script asynchronously to avoid blocking rendering

      script.onload = () => {
        console.log('Cashfree SDK script loaded successfully.');
        // Give a very small delay to ensure the `Cashfree` object is fully available in `window`
        // before proceeding, as script.onload might fire before the global object is fully populated.
        setTimeout(() => resolve(true), 50);
      };

      script.onerror = () => {
        console.error('Failed to load Cashfree SDK script.');
        setError('Failed to load payment gateway. Please check your internet connection and try again.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []); // Empty dependency array means this function is created once

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const scriptLoaded = await loadCashfreeScript();
      if (!scriptLoaded) {
        throw new Error('Payment gateway SDK failed to load. Cannot proceed with payment.');
      }

      // Crucial check: Ensure the global Cashfree object and its required method are available
      if (!window.Cashfree || typeof window.Cashfree.popups?.initiatePayment !== 'function') {
        console.error('Cashfree SDK object or its `initiatePayment` method is not found after loading.');
        throw new Error('Payment gateway is not ready. Please try again or refresh the page.');
      }

      // Step 1: Create Cashfree order on backend via Supabase Function
      console.log('Invoking Supabase function to create Cashfree order...');
      const { data: cashfreeData, error: cfError } = await supabase.functions.invoke(
        'create-cashfree-order', // Name of your Supabase Edge Function
        {
          body: {
            order_amount: appointmentData.amount, // Using `order_amount` as per backend expectation
            order_currency: 'INR',
            order_note: `${appointmentData.serviceType} - Appointment for ${patientData.name}`,
            customer_details: {
              customer_id: patientData.id || patientData.phone, // Use patient ID if available, fallback to phone
              customer_email: patientData.email,
              customer_phone: patientData.phone,
              customer_name: patientData.name,
            },
            // It's good practice to send `return_url` in `order_meta` to the backend
            // so your backend can include it in the Cashfree order creation request.
            order_meta: {
                return_url: `${window.location.origin}/payment-status?cf_payment_success={order_id}&cf_order_id={order_id}&cf_txn_status={txStatus}`,
                // If you implement Instant Payment Notifications (IPN/webhooks),
                // the `notify_url` would typically be set on your backend.
                // notify_url: 'YOUR_SECURE_BACKEND_IPN_URL_HERE',
            }
          },
        }
      );

      if (cfError) {
        console.error('Supabase function returned an error creating Cashfree order:', cfError);
        throw new Error(cfError.message || "Failed to create a payment order on the server. Please try again.");
      }
      if (!cashfreeData || !cashfreeData.payment_session_id) {
        throw new new Error("Backend did not return a valid payment session ID. Payment cannot proceed.");
      }

      console.log('Received payment session ID from backend.');

      // Step 2: Show Cashfree checkout popup
      const cashfree = window.Cashfree;

      // This is the correct method for Cashfree Web SDK 2.0.0 popup integration.
      // ENSURE you are NOT calling any `cashfree.init()` or `window.Cashfree.init()` here.
      // That was likely the cause of your previous `TypeError`.
      cashfree.popups.initiatePayment(
        {
          paymentSessionId: cashfreeData.payment_session_id,
          // This returnUrl is used by the Cashfree SDK to redirect the user after payment.
          // It's important to include the placeholders for order_id and txStatus.
          returnUrl: `${window.location.origin}/payment-status?cf_payment_success={order_id}&cf_order_id={order_id}&cf_txn_status={txStatus}`,
          redirectTarget: '_self' // Opens the payment page in the same window/tab
        },
        {
          onSuccess: async (data: any) => {
            console.log('Cashfree Payment Success Callback:', data);
            // SECURITY NOTE: Client-side callbacks are not fully trustworthy.
            // In a production system, ALWAYS verify payment status on your backend
            // using Cashfree's IPN (webhook) or a server-to-server API call
            // BEFORE confirming the booking or service provision.
            try {
              // For this example, directly invoking book-appointment.
              // For full robustness, this should be part of your backend's IPN handler.
              const { data: bookingData, error: bookingError } = await supabase.functions.invoke(
                'book-appointment', // Your Supabase Edge Function to finalize booking
                {
                  body: {
                    patientData,
                    appointmentData,
                    paymentData: {
                      paymentMethod: "cashfree",
                      paymentStatus: "paid", // This status should ideally be confirmed by backend verification
                      cashfreeDetails: data, // Store relevant Cashfree response data
                      cashfreeOrderId: data.orderId,
                      cashfreeTxnId: data.transactionId,
                    }
                  }
                }
              );

              if (bookingError) {
                console.error('Supabase function error booking appointment after payment:', bookingError);
                throw new Error(bookingError.message || 'Payment successful, but failed to finalize appointment. Please contact support with your payment details.');
              }
              console.log('Appointment booked successfully:', bookingData);
              onSuccess(); // Trigger the parent component's success handler
            } catch (error: any) {
              setError(error.message || 'An error occurred during appointment booking after successful payment. Please contact support.');
              console.error('Error in onSuccess callback during appointment booking:', error);
            } finally {
              setProcessing(false); // Ensure processing state is reset
            }
          },
          onFailure: (data: any) => {
            console.error('Cashfree Payment Failure Callback:', data);
            // 'data' might contain 'message', 'code', 'type' from Cashfree
            setError(data?.message || data?.reason || 'Payment failed. Please try again or choose another payment method.');
            setProcessing(false);
          },
          onClose: () => {
            console.log('Cashfree Payment popup closed by user.');
            setProcessing(false); // Reset processing state if user closes the popup
            setError('Payment process was interrupted. Please try again.');
          }
        }
      );

    } catch (error: any) {
      console.error('Error during payment process in handlePayment:', error);
      setError(error.message || 'An unexpected error occurred during payment. Please try again.');
      setProcessing(false);
    }
  };

  // Helper function to format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { // 'en-IN' for Indian Rupee format
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
