
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ExternalLink, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { formatWhatsAppLink } from '@/lib/phone-utils';
import { SchedulePopover } from '@/components/SchedulePopover';
import { scheduleService } from '@/utils/scheduleService';
import { getLocalDateTime } from '@/utils/dateUtils';

interface CompletionMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientPhone: string;
    initialMessage: string;
    onMessageChange?: (message: string) => void;
    consultantId?: string;
    isWhatsAppIntegrated?: boolean;
}

export const CompletionMessageModal = ({
    isOpen,
    onClose,
    patientPhone,
    initialMessage,
    onMessageChange,
    consultantId,
    isWhatsAppIntegrated = false
}: CompletionMessageModalProps) => {
    const [message, setMessage] = useState(initialMessage);
    const [editablePhone, setEditablePhone] = useState(patientPhone);
    const [isSending, setIsSending] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date>();
    const [scheduledTime, setScheduledTime] = useState("09:00");
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setMessage(initialMessage);
            setEditablePhone(patientPhone);
            setScheduledDate(undefined);
            setScheduledTime("09:00");
        }
    }, [initialMessage, patientPhone, isOpen]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setMessage(newValue);
        if (onMessageChange) {
            onMessageChange(newValue);
        }
    };

    const handleSend = async () => {
        const targetPhone = editablePhone || patientPhone;
        if (!targetPhone) {
            toast({ variant: "destructive", title: "Error", description: "Phone number missing." });
            return;
        }

        if (!isWhatsAppIntegrated) {
            // Manual/Browser-based send
            const formattedPhone = formatWhatsAppLink(targetPhone);
            const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
            toast({ title: "WhatsApp Opened", description: "The message has been drafted in WhatsApp." });
            onClose();
            return;
        }

        // Automated/Integrated send
        setIsSending(true);
        try {
            const scheduledDateTime = scheduledDate ? getLocalDateTime(scheduledDate, scheduledTime) : null;
            
            if (scheduledDateTime) {
                const { success, error } = await scheduleService.scheduleTask({
                    task_type: 'whatsapp_message',
                    scheduled_for: scheduledDateTime.toISOString(),
                    payload: {
                        number: targetPhone,
                        message: message,
                        consultant_id: consultantId
                    },
                    source: 'manual_completion_whatsapp',
                    consultant_id: consultantId
                });
                
                if (!success) throw error || new Error("Failed to schedule message.");
                toast({ title: "Success", description: "Message scheduled successfully." });
            } else {
                const { error } = await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: targetPhone,
                        message: message,
                        consultant_id: consultantId
                    },
                });

                if (error) throw error;
                toast({ title: "Success", description: "Message sent successfully via automation." });
            }

            onClose();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send message via automation. Try manual send if available." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isWhatsAppIntegrated ? 'Send Completion Message' : 'Send Message (Manual)'}</DialogTitle>
                    <DialogDescription>
                        {isWhatsAppIntegrated
                            ? `Review and edit the details before sending via automation.`
                            : `Review details and open WhatsApp to send manually.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            To (Phone Number):
                        </label>
                        <Input
                            value={editablePhone}
                            onChange={(e) => setEditablePhone(e.target.value)}
                            placeholder="Patient's phone number"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Message:</label>
                        <Textarea
                            value={message}
                            onChange={handleTextChange}
                            className="min-h-[250px] font-mono text-sm"
                            placeholder="Type message here..."
                        />
                    </div>
                </div>

                <DialogFooter className="flex items-center gap-2">
                    {isWhatsAppIntegrated && (
                        <SchedulePopover
                            scheduledDate={scheduledDate}
                            scheduledTime={scheduledTime}
                            onDateChange={setScheduledDate}
                            onTimeChange={setScheduledTime}
                            disabled={isSending}
                            className="h-10 w-10 shrink-0"
                        />
                    )}
                    <div className="flex-1" />
                    <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !message.trim()}
                        className={isWhatsAppIntegrated ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            isWhatsAppIntegrated ? <Send className="w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        {scheduledDate 
                            ? 'Schedule Message' 
                            : (isWhatsAppIntegrated ? 'Send via Automation' : 'Open in WhatsApp')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
