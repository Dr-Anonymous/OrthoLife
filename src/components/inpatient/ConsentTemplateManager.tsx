import React, { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { ConsentTemplateContent } from './ConsentTemplateContent';

interface ConsentTemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ConsentTemplateManager: React.FC<ConsentTemplateManagerProps> = ({
    isOpen,
    onClose
}) => {
    // We keep this to maintain the same clearing behavior as before when modal is closed
    useEffect(() => {
        if (!isOpen) {
            // Logic moved to component's internal state if needed, 
            // but here we just manage the dialog state
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:w-full max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
                <ConsentTemplateContent />
            </DialogContent>
        </Dialog>
    );
};
