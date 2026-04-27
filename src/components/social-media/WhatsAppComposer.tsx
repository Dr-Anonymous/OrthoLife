import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Phone, MessageSquare, Image as ImageIcon, Upload } from "lucide-react";
import { useConsultant } from "@/context/ConsultantContext";
import { socialService } from "@/utils/socialService";
import { scheduleService } from "@/utils/scheduleService";
import { getLocalDateTime } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { SchedulePopover } from "@/components/SchedulePopover";

const WhatsAppComposer = () => {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
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
      setImagePreview("pdf_placeholder");
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

      const scheduledDateTime = scheduledDate ? getLocalDateTime(scheduledDate, scheduledTime) : undefined;
      if (scheduledDate && !scheduledDateTime) {
        throw new Error("Invalid schedule time.");
      }
      if (scheduledDateTime && scheduledDateTime <= new Date()) {
        throw new Error("Scheduled time must be in the future.");
      }

      if (scheduledDateTime) {
        const { success, error } = await scheduleService.scheduleTask({
          task_type: 'whatsapp_message',
          scheduled_for: scheduledDateTime.toISOString(),
          payload: {
            number,
            message,
            media_url: mediaUrl || undefined,
            consultant_id: consultant?.phone || "general_notifications"
          },
          source: 'manual_send_whatsapp',
          consultant_id: consultant?.id
        });
        
        if (!success) throw new Error("Failed to schedule task");
      } else {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            number,
            message,
            media_url: mediaUrl || undefined,
            consultant_id: consultant?.phone || "general_notifications"
          },
        });

        if (error) {
          throw new Error(error.message || "Failed to send message.");
        }
      }

      toast({
        title: "Success",
        description: scheduledDate 
          ? "Message scheduled successfully!" 
          : "Message sent successfully!",
      });
      setMessage("");
      setImage(null);
      setImagePreview(null);
      setScheduledDate(undefined);
      setScheduledTime("09:00");
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
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Send className="h-5 w-5 text-primary" />
          Direct WhatsApp Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Phone Number
              </label>
              <Input
                placeholder="e.g. 9876543210"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onKeyDown={handlePhoneKeyDown}
                type="tel"
                className="bg-gray-50/50"
              />
              <p className="text-[10px] text-muted-foreground">
                Country code (91) will be added automatically if 10 digits.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Message
              </label>
              <Textarea
                ref={messageRef}
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={5}
                className="bg-gray-50/50 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right">
                Press Ctrl+Enter to send
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Attachment (Image or PDF)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative group border-2 border-dashed rounded-lg p-6 transition-all duration-200 text-center cursor-pointer min-h-[180px] flex flex-col justify-center",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50/80"
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
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="p-3 rounded-full bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-primary">Click to upload</span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF or PDF</p>
                  </div>
                ) : image?.type === "application/pdf" || imagePreview === "pdf_placeholder" ? (
                  <div className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-md border border-gray-100">
                    <Upload className="w-10 h-10 text-primary" />
                    <p className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{image?.name || "Document.pdf"}</p>
                    <Button variant="ghost" size="sm" className="text-xs h-8" onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setImagePreview(null);
                    }}>Remove</Button>
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
                      size="icon"
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
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <SchedulePopover
            scheduledDate={scheduledDate}
            scheduledTime={scheduledTime}
            onDateChange={setScheduledDate}
            onTimeChange={setScheduledTime}
            disabled={loading}
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <Button
            className="flex-1 h-11 text-base font-medium rounded-xl shadow-md"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {scheduledDate ? "Scheduling..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                {scheduledDate ? "Schedule WhatsApp" : "Send WhatsApp Now"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppComposer;
