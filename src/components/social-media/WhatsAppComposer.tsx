import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Phone, MessageSquare, Image as ImageIcon, Upload, X, Check } from "lucide-react";
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
  const [scheduledTime, setScheduledTime] = useState("");
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
      setScheduledTime("");
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
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <div className="p-1.5 bg-green-500 rounded-lg">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            Direct WhatsApp
          </CardTitle>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto sm:min-w-[240px]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight shrink-0">To:</span>
            <input
              type="tel"
              placeholder="9866812555"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onKeyDown={handlePhoneKeyDown}
              className="flex-1 bg-transparent border-none text-sm font-semibold focus:outline-none placeholder:text-gray-300 placeholder:font-normal"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          className={cn(
            "relative min-h-[300px] flex flex-col transition-all duration-300",
            isDragging && "bg-green-50/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            ref={messageRef}
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[200px] border-none focus-visible:ring-0 text-base p-6 resize-none bg-transparent placeholder:text-gray-300"
          />

          {/* Media Previews */}
          {imagePreview && (
            <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="relative group w-fit">
                <div className="rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gray-100">
                  {image?.type === "application/pdf" || imagePreview === "pdf_placeholder" ? (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 min-w-[200px]">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-700 truncate">{image?.name || "Document.pdf"}</p>
                        <p className="text-[10px] text-gray-400 font-medium">PDF Document</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-[200px] w-auto object-cover rounded-lg"
                    />
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg border-2 border-white"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {isDragging && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 backdrop-blur-[2px] z-20">
              <div className="bg-white p-4 rounded-3xl shadow-2xl mb-3 animate-bounce">
                <Upload className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-green-600 font-bold text-lg">Drop to attach</p>
            </div>
          )}

          {/* Unified WhatsApp Action Bar */}
          <div className="p-3 md:p-4 border-t border-gray-100 bg-green-50/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                id="whatsapp-media-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFiles(e.target.files[0]);
                }}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 md:px-4 rounded-xl text-gray-500 hover:text-green-600 hover:bg-green-500/10 gap-2 transition-all"
                onClick={() => document.getElementById('whatsapp-media-upload')?.click()}
              >
                <ImageIcon className="w-4 h-4 text-green-500" />
                <span className="font-bold text-xs">Add Media</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 md:px-4 rounded-xl text-gray-400 hover:text-destructive hover:bg-destructive/5 gap-2 transition-all"
                onClick={() => {
                  setMessage('');
                  setImage(null);
                  setImagePreview(null);
                }}
                disabled={loading || (!message && !image)}
              >
                <span className="font-bold text-xs">Clear</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              <SchedulePopover
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
                disabled={loading}
                className="h-10 w-10 rounded-xl border-green-100 hover:border-green-200"
              />
              <Button
                size="lg"
                onClick={handleSend}
                disabled={loading || (!message && !image) || !number}
                className="flex-1 sm:flex-initial sm:px-8 font-bold gap-2 rounded-xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all h-10 text-sm border-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {scheduledDate ? 'Schedule' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between items-center">
        <span>Press Ctrl+Enter to send message immediately</span>
        {number.length > 0 && number.length < 10 && <span className="text-amber-500 font-medium">Enter 10-digit number</span>}
        {number.length >= 10 && <span className="text-green-500 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Valid format</span>}
      </div>
    </Card>
  );
};

export default WhatsAppComposer;
