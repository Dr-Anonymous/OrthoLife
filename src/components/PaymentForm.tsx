import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const cashfree = window.Cashfree;
      if (!cashfree) throw new Error('Cashfree SDK not loaded');

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

      const result = await cashfree.checkout({
        paymentSessionId: sessionId,
        mode: 'production',
        returnUrl: `${window.location.origin}/payment-return?order_id={order_id}`
      });

      if (result.error) {
        throw new Error(result.error?.message || 'Payment failed');
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Payment failed. Try again.');
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

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Patient Details</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {patientData.name}</p>
            <p><strong>Email:</strong> {patientData.email}</p>
            <p><strong>Phone:</strong> {patientData.phone}</p>
          </div>
        </div>

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
              <p>Your payment is securely processed via Cashfree Checkout.</p>
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
