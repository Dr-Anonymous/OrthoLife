
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Phone, MessageSquare, Image as ImageIcon, Upload } from "lucide-react";
import { useConsultant } from "@/context/ConsultantContext";
import { socialService } from "@/utils/socialService";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const SendWhatsApp = () => {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { consultant } = useConsultant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleFiles = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please select an image or PDF file.",
      });
      return;
    }
    setImage(file);
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview("pdf_placeholder"); // Local marker for PDF
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFiles(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      messageRef.current?.focus();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFiles(file);
  };

  const handleSend = async () => {
    if (!number || (!message && !image)) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please enter a phone number and either a message or an attachment.",
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
          consultant_id: consultant?.phone || "general_notifications"
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
            WhatsApp Messaging
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
              onKeyDown={handlePhoneKeyDown}
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
              ref={messageRef}
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Attachment (Image or PDF)
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative group border-2 border-dashed rounded-lg p-4 transition-all duration-200 text-center cursor-pointer",
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageChange}
                className="hidden"
              />
              {!imagePreview ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="p-2 rounded-full bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-blue-600">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400">PNG, JPG, GIF or PDF</p>
                </div>
              ) : image?.type === "application/pdf" || imagePreview === "pdf_placeholder" ? (
                <div className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-md border border-gray-100">
                  <Upload className="w-8 h-8 text-blue-500" />
                  <p className="text-sm font-medium text-gray-600">{image?.name || "Document.pdf"}</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                    <p className="text-white text-xs font-medium">Click to change</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-lg z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
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
