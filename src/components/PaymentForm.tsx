import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFormProps {
  appointmentData: any;
  patientData: any;
  onSuccess: () => void;
  onBack: () => void;
}

// Simplified Cashfree integration using redirect approach
const PaymentForm: React.FC<PaymentFormProps> = ({ 
  appointmentData, 
  patientData, 
  onSuccess, 
  onBack 
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
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
              return_url: `${window.location.origin}/payment-success?order_id={order_id}`,
              notify_url: `${window.location.origin}/api/cashfree-webhook`
            }
          }
        }
      );

      if (cfError) throw cfError;
      if (!cashfreeData.payment_session_id) {
        throw new Error("Failed to create payment session");
      }

      // Step 2: Store order details in sessionStorage for later verification
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        orderId: cashfreeData.order_id,
        paymentSessionId: cashfreeData.payment_session_id,
        patientData,
        appointmentData,
        timestamp: Date.now()
      }));

      // Step 3: Redirect to Cashfree payment page
      const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
      const baseUrl = environment === 'production' 
        ? 'https://payments.cashfree.com/pay' 
        : 'https://payments-test.cashfree.com/pay';
      
      const paymentPageUrl = `${baseUrl}/${cashfreeData.payment_session_id}`;
      
      // Option 1: Redirect in same window
      window.location.href = paymentPageUrl;
      
      // Option 2: Open in new window (uncomment below and comment above line)
      // const paymentWindow = window.open(paymentPageUrl, '_blank', 'width=800,height=600');
      // if (!paymentWindow) {
      //   throw new Error('Please allow popups for payment window');
      // }

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setError(error.message || 'Failed to initialize payment. Please try again.');
      setProcessing(false);
    }
  };

  // Check for payment completion on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order_id');

    if (paymentStatus === 'success' && orderId) {
      handlePaymentSuccess(orderId);
    } else if (paymentStatus === 'failed') {
      setError('Payment failed. Please try again.');
    }
  }, []);

  const handlePaymentSuccess = async (orderId: string) => {
    try {
      // Get stored payment details
      const pendingPaymentStr = sessionStorage.getItem('pendingPayment');
      if (!pendingPaymentStr) {
        throw new Error('Payment session not found');
      }

      const pendingPayment = JSON.parse(pendingPaymentStr);
      
      // Verify the order ID matches
      if (pendingPayment.orderId !== orderId) {
        throw new Error('Payment verification failed');
      }

      // Book the appointment
      const { data: bookingData, error: bookingError } = await supabase.functions.invoke(
        'book-appointment',
        {
          body: {
            patientData: pendingPayment.patientData,
            appointmentData: pendingPayment.appointmentData,
            paymentData: {
              paymentMethod: "cashfree",
              paymentStatus: "completed",
              orderId: orderId,
              paymentSessionId: pendingPayment.paymentSessionId
            }
          }
        }
      );

      if (bookingError) throw bookingError;

      // Clear pending payment data
      sessionStorage.removeItem('pendingPayment');
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      onSuccess();
    } catch (error) {
      console.error('Error processing payment success:', error);
      setError('Payment successful but failed to book appointment. Please contact support.');
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
                You will be redirected to Cashfree's secure payment page. 
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
              <div className="flex items-center gap-2">
                <span>Pay ₹{appointmentData.amount} Securely</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            )}
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          By proceeding with payment, you will be redirected to Cashfree's secure payment page. 
          Your appointment will be confirmed upon successful payment.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
