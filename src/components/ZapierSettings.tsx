
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Settings, ExternalLink, MessageCircle } from 'lucide-react';

const ZapierSettings: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your Zapier webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Testing Zapier webhook:", webhookUrl);

    try {
      const testPayload = {
        appointmentId: "TEST-" + Date.now(),
        patientName: "Test Patient",
        patientPhone: "+91XXXXXXXXXX",
        patientEmail: "test@example.com",
        serviceType: "Test Consultation",
        appointmentDate: new Date().toLocaleDateString('en-IN'),
        appointmentTime: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        amount: 400,
        paymentMethod: "offline",
        clinicName: "Dr. Samuel Manoj Cherukuri Orthopedic Clinic",
        clinicAddress: "Kakinada, Andhra Pradesh",
        timestamp: new Date().toISOString(),
        isTest: true
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(testPayload),
      });

      toast({
        title: "Test Request Sent",
        description: "The test request was sent to Zapier. Please check your Zap's history to confirm it was triggered.",
      });
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Error",
        description: "Failed to test the Zapier webhook. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            WhatsApp Notifications via Zapier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Setup Instructions
            </h4>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Create a new Zap in your Zapier account</li>
              <li>Set the trigger to "Webhooks by Zapier" → "Catch Hook"</li>
              <li>Copy the webhook URL and paste it below</li>
              <li>Set the action to send WhatsApp messages (via WhatsApp Business or similar)</li>
              <li>Test the webhook using the button below</li>
            </ol>
          </div>

          <form onSubmit={handleTestWebhook} className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the webhook URL from your Zapier trigger
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={!webhookUrl || isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Test Webhook'}
            </Button>
          </form>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Sample WhatsApp Message Template</h4>
            <div className="text-sm text-yellow-700 bg-white p-3 rounded border">
              <p className="font-medium">Appointment Confirmed! 🩺</p>
              <p className="mt-2">
                Dear [Patient Name],<br/>
                Your appointment has been confirmed:<br/><br/>
                📅 Date: [Appointment Date]<br/>
                🕐 Time: [Appointment Time]<br/>
                🏥 Service: [Service Type]<br/>
                💰 Fee: ₹[Amount]<br/>
                💳 Payment: [Payment Method]<br/><br/>
                📍 Dr. Samuel Manoj Cherukuri<br/>
                Orthopedic Clinic, Kakinada<br/><br/>
                For any queries, please contact us.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://zapier.com/', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Zapier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://zapier.com/apps/webhooks/integrations', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Webhook Help
            </Button>
          </div>

          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
            <p><strong>Note:</strong> You'll need to add the webhook URL as a secret named "ZAPIER_WEBHOOK_URL" in your Supabase project settings for the integration to work with real appointments.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZapierSettings;
