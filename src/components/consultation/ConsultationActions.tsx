import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Printer, MoreVertical, FileText, PackagePlus, CloudOff, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ConsultationActionsProps {
    isOnline: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSaveAndPrint: () => void;

    onSaveBundleClick: () => void;
    onMedicalCertificateClick: () => void;
    onReceiptClick: () => void;
    onManageMedicationsClick: () => void;
    onManageKeywordsClick: () => void;
    onManageShortcutsClick: () => void;
    onSendCompletionClick: () => void;
    isAutoSendEnabled?: boolean;
    onToggleAutoSend?: () => void;
}

/**
 * ConsultationActions Component
 * 
 * The bottom action bar for the consultation page.
 * Features:
 * - Primary Save and Print buttons.
 * - "More" dropdown menu for secondary actions:
 *   - Medical Certificate, Receipt
 *   - Management options (Keywords, Shortcuts, Saved Meds)
 * - Offline status indicator.
 */
export const ConsultationActions: React.FC<ConsultationActionsProps> = ({
    isOnline,
    isSaving,
    onSave,
    onSaveAndPrint,
    onSaveBundleClick,
    onMedicalCertificateClick,
    onReceiptClick,
    onManageMedicationsClick,
    onManageKeywordsClick,
    onManageShortcutsClick,
    onSendCompletionClick,
    isAutoSendEnabled,
    onToggleAutoSend
}) => {
    return (
        <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-end gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isOnline && <CloudOff className="h-5 w-5 text-yellow-600" />}
                <Button type="button" size="lg" onClick={onSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    Save Changes
                </Button>
            </div>
            <div className="flex w-full sm:w-auto gap-3">
                <Button type="button" size="lg" onClick={onSaveAndPrint}>
                    <Printer className="w-5 h-5 mr-2" />
                    Print
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="outline" className="h-12 w-12">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px] p-2">
                        <div className="grid grid-cols-2 gap-2">
                            <DropdownMenuItem onSelect={onMedicalCertificateClick} className="flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50">
                                <FileText className="w-5 h-5 text-primary" />
                                <span className="text-xs font-medium">Medical Cert.</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onReceiptClick} className="flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50">
                                <FileText className="w-5 h-5 text-primary" />
                                <span className="text-xs font-medium">Receipt</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onSendCompletionClick} className="flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50">
                                <Send className="w-5 h-5 text-green-600" />
                                <span className="text-xs font-medium">Send Msg</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onSaveBundleClick} className="flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50">
                                <PackagePlus className="w-5 h-5 text-orange-500" />
                                <span className="text-xs font-medium">Save Bundle</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <div className="space-y-1">
                            <DropdownMenuItem onSelect={onManageMedicationsClick} className="flex items-center p-2 cursor-pointer">
                                <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Saved Medications</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onManageKeywordsClick} className="flex items-center p-2 cursor-pointer">
                                <PackagePlus className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Keywords</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onManageShortcutsClick} className="flex items-center p-2 cursor-pointer">
                                <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Shortcuts</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <div
                            className="p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleAutoSend?.();
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Auto-send WhatsApp</span>
                                <Switch
                                    checked={isAutoSendEnabled}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Auto-send consultation completed notification.
                            </p>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
