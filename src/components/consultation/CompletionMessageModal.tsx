
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
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface CompletionMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientPhone: string;
    initialMessage: string;
    onMessageChange?: (message: string) => void;
}

export const CompletionMessageModal = ({ isOpen, onClose, patientPhone, initialMessage, onMessageChange }: CompletionMessageModalProps) => {
    const [message, setMessage] = useState(initialMessage);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            // Only update local message if it differs from initial (and maybe we want to keep edits if re-opening?)
            // Actually, the parent will control persistence. So if parent passes 'initialMessage' which IS the persisted message,
            // we should sync to it. 
            // BUT, if user is typing, we don't want to reset.
            // Simplified: Sync on open.
            setMessage(initialMessage);
        }
    }, [initialMessage, isOpen]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setMessage(newValue);
        if (onMessageChange) {
            onMessageChange(newValue);
        }
    };

    const handleSend = async () => {
        if (!patientPhone) {
            toast({ variant: "destructive", title: "Error", description: "Patient phone number missing." });
            return;
        }

        setIsSending(true);
        try {
            const { error } = await supabase.functions.invoke('send-whatsapp', {
                body: { number: patientPhone, message: message },
            });

            if (error) throw error;

            toast({ title: "Success", description: "Message sent successfully." });
            onClose();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send message." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Completion Message</DialogTitle>
                    <DialogDescription>
                        Review and edit the completion message before sending to <b>{patientPhone}</b>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        value={message}
                        onChange={handleTextChange}
                        className="min-h-[250px] font-mono text-sm"
                        placeholder="Type message here..."
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
                    <Button onClick={handleSend} disabled={isSending || !message.trim()} className="bg-green-600 hover:bg-green-700">
                        {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Send WhatsApp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
