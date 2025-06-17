import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Extend window interface
declare global {
  interface Window {
    Cashfree?: any;
  }
}

interface PaymentFormProps {
  appointmentData: any;
  patientData: any;
  onSuccess: () => void;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  appointmentData,
  patientData,
  onSuccess,
  onBack
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Cashfree v3 SDK
  const loadCashfree = (): Promise<any> => {
    if (window.Cashfree) return Promise.resolve(window.Cashfree);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      s.onload = () => {
        if (window.Cashfree) resolve(window.Cashfree);
        else reject(new Error('Cashfree SDK unavailable'));
      };
      s.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.body.appendChild(s);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      const cashfree = await loadCashfree();
      const { data: cfOrder, error: cfErr } = await supabase.functions.invoke(
        'create-cashfree-order',
        {
          body: {
            amount: appointmentData.amount,
            currency: 'INR',
            orderNote: `${appointmentData.serviceType} Appointment`,
            customerDetails: {
              customer_id: patientData.phone,
              customer_email: patientData.email,
              customer_phone: patientData.phone,
              customer_name: patientData.name
            }
          }
        }
      );
      if (cfErr) throw cfErr;
      const sessionId = cfOrder.payment_session_id;
      if (!sessionId) throw new Error('No payment session ID');

      // Initiate checkout
      const checkoutOptions = {
        paymentSessionId: sessionId,
        mode: 'production',
        returnUrl: `${window.location.origin}/payment-return?order_id={order_id}`
      };
      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        throw new Error(result.error?.message || 'Payment failed');
      }
      if (result.redirect) {
        console.log('Redirecting to Cashfree page...');
      }

      // In popup/inline mode you get redirected back or resolved here
      // After redirect, backend webhook should confirm the payment.
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
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
        {/* Payment & Patient summary UI */}
        {/* ... remains unchanged ... */}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium">Secure Payment</p>
              <p>Processed securely via Cashfree’s Checkout v3.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={processing} className="flex-1">
            Back
          </Button>
          <Button onClick={handlePayment} disabled={processing} className="flex-1">
            {processing ? 'Processing...' : `Pay ₹${appointmentData.amount}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
