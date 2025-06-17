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

declare global {
  interface Window {
    cashfree: any;
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

  const loadCashfree = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.cashfree?.checkout) return resolve(true);
      const existing = document.querySelector('script[src*="v3/cashfree.js"]');
      if (existing) {
        const check = () => {
          if (window.cashfree?.checkout) resolve(true);
          else setTimeout(check, 100);
        };
        return check();
      }
      const s = document.createElement('script');
      s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      s.async = true;
      s.onload = () => {
        const check = () => {
          if (window.cashfree?.checkout) resolve(true);
          else setTimeout(check, 100);
        };
        check();
      };
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      console.log('[Payment] Loading Cashfree SDK...');
      const ok = await loadCashfree();
      if (!ok) throw new Error('Cashfree SDK failed to load.');

      console.log('[Payment] Creating Cashfree order...');
      const { data: cfData, error: cfErr } = await supabase.functions.invoke(
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
      console.log('[Payment] Cashfree order response:', cfData, cfErr);
      if (cfErr) throw cfErr;
      const sessionId = cfData?.payment_session_id;
      if (!sessionId) throw new Error('No payment session ID returned from backend');

      // ✅ NEW: Use simplified checkout()
      console.log('[Payment] Initiating Cashfree checkout...');
      const result = await window.cashfree.checkout({
        paymentSessionId: sessionId,
        returnUrl: `${window.location.origin}/payment-success?cf_payment_success={order_id}`
      });

      console.log('[Payment] checkout() result:', result);
      if (result.error) {
        throw new Error(result.error.message || 'Payment failed');
      }
      if (result.redirect) {
        console.log('Redirecting to payment page...');
        return; // user is being redirected
      }

      // PaymentResult inline success (e.g. UPI)
      console.log('Payment inline success', result.paymentDetails);
      // Proceed to appointment booking
      const { error: bookingEr } = await supabase.functions.invoke('book-appointment', {
        body: {
          patientData,
          appointmentData,
          paymentData: {
            paymentMethod: 'cashfree',
            paymentStatus: 'paid',
            cashfreeDetails: result.paymentDetails
          }
        }
      });
      if (bookingEr) throw bookingEr;
      onSuccess();

    } catch (err: any) {
      console.error('[Payment] Error:', err);
      setError(err.message || 'Unexpected error');
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
        {/* Summary, details, error block */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

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
