
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Phone, MessageSquare } from "lucide-react";

const WhatsAppTestPage = () => {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!number || !message) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please enter both a phone number and a message.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { number, message },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
      console.log("Response:", data);
      setMessage(""); // Clear message on success
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-6 w-6" />
            Test WhatsApp Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" /> Phone Number
            </label>
            <Input
              placeholder="e.g. 9876543210"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              type="tel"
            />
            <p className="text-xs text-muted-foreground">
              Country code (91) will be added automatically if 10 digits.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message
            </label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppTestPage;
