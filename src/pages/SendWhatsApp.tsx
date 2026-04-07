
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Phone, MessageSquare, Image as ImageIcon } from "lucide-react";
import { useConsultant } from "@/context/ConsultantContext";
import { socialService } from "@/utils/socialService";

const SendWhatsApp = () => {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { consultant } = useConsultant();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      let mediaUrl = "";
      
      if (image) {
        // Use the existing socialService publishing mechanism to handle the upload.
        // This bypasses Browser RLS issues because the Edge function handles the upload with SERVICE_ROLE.
        const uploadResult = await socialService.publishAll({
          content: message,
          platforms: ['phone_bridge_only'],
          mediaFiles: [image]
        });
        
        mediaUrl = uploadResult.mediaUrls?.[0] || "";
        
        if (!mediaUrl) {
          throw new Error("Failed to get public URL for image.");
        }
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { 
          number, 
          message,
          media_url: mediaUrl || undefined,
          consultant_id: consultant?.id || "legacy" 
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: mediaUrl ? "Image and message sent successfully!" : "Message sent successfully!",
      });
      console.log("Response:", data);
      setMessage(""); // Clear message on success
      setImage(null);
      setImagePreview(null);
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
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Image (Optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            {imagePreview && (
              <div className="mt-2 relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-md border" 
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                >
                  ×
                </Button>
              </div>
            )}
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

export default SendWhatsApp;
