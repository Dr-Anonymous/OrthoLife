import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Printer, MoreVertical, FileText, PackagePlus, CloudOff, Send, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ConsultationActionsProps {
    isOnline: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSaveAndPrint: () => void;

    onSaveBundleClick: () => void;
    onMedicalCertificateClick: () => void;
    onReceiptClick: () => void;
    onManageMedicationsClick?: () => void;
    onManageKeywordsClick: () => void;
    onManageShortcutsClick: () => void;
    onManageReferralDoctorsClick: () => void;
    onSendCompletionClick: () => void;
    isAutoSendEnabled?: boolean;
    onToggleAutoSend?: () => void;
    showDoctorProfile?: boolean;
    onToggleDoctorProfile?: (checked: boolean) => void;
    showSignSeal?: boolean;
    onToggleSignSeal?: (checked: boolean) => void;
    onlyMedicationsAndFollowup?: boolean;
    onToggleOnlyMeds?: (checked: boolean) => void;
    isReadOnly?: boolean;
    isWhatsAppEnabled?: boolean;
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
    onManageReferralDoctorsClick,
    onSendCompletionClick,
    isAutoSendEnabled,
    onToggleAutoSend,
    showDoctorProfile,
    onToggleDoctorProfile,
    showSignSeal,
    onToggleSignSeal,
    onlyMedicationsAndFollowup,
    onToggleOnlyMeds,
    isReadOnly = false,
    isWhatsAppEnabled = true
}) => {
    return (
        <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-end gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isOnline && <CloudOff className="h-5 w-5 text-yellow-600" />}
                <Button type="button" size="lg" onClick={onSave} disabled={isSaving || isReadOnly}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    {isReadOnly ? 'Read Only' : 'Save Changes'}
                </Button>
            </div>
            <div className="flex w-full sm:w-auto gap-3">
                <Button type="button" size="lg" onClick={onSaveAndPrint} id="save-print-button">
                    <Printer className="w-5 h-5 mr-2" />
                    Print
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="outline" className="h-12 w-12" id="more-actions-button">
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
                            <DropdownMenuItem
                                onSelect={() => {
                                    if (isReadOnly) {
                                        toast({
                                            title: "Access Denied",
                                            description: "You cannot send messages from another doctor's profile.",
                                            variant: "destructive"
                                        });
                                        return;
                                    }
                                    onSendCompletionClick();
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50",
                                    isReadOnly && "opacity-50 cursor-not-allowed bg-muted/20"
                                )}
                            >
                                <Send className={cn("w-5 h-5", !isReadOnly ? "text-green-600" : "text-muted-foreground")} />
                                <span className={cn("text-xs font-medium", isReadOnly && "text-muted-foreground")}>
                                    {isReadOnly ? 'Restricted' : 'Send Msg'}
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onSaveBundleClick} className="flex flex-col items-center justify-center h-20 text-center gap-1 cursor-pointer border rounded-md hover:bg-accent/50 focus:bg-accent/50">
                                <PackagePlus className="w-5 h-5 text-orange-500" />
                                <span className="text-xs font-medium">Save Bundle</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <div className="space-y-1">
                            {onManageMedicationsClick && (
                                <DropdownMenuItem onSelect={onManageMedicationsClick} className="flex items-center p-2 cursor-pointer">
                                    <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">Manage Saved Medications</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={onManageKeywordsClick} className="flex items-center p-2 cursor-pointer">
                                <PackagePlus className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Keywords</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onManageShortcutsClick} className="flex items-center p-2 cursor-pointer">
                                <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Shortcuts</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={onManageReferralDoctorsClick} className="flex items-center p-2 cursor-pointer">
                                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                <span className="text-sm">Manage Referral Doctors</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <div
                            className="p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors mb-2"
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleDoctorProfile?.(!showDoctorProfile);
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Print Doctor Profile</span>
                                <Switch
                                    checked={showDoctorProfile}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Include doctor profile in print.
                            </p>
                        </div>

                        <div
                            className="p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors mb-2"
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleSignSeal?.(!showSignSeal);
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Print Sign & Seal</span>
                                <Switch
                                    checked={showSignSeal}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Add digital signature and seal.
                            </p>
                        </div>

                        <div
                            className="p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors mb-2"
                            onClick={(e) => {
                                e.preventDefault();
                                onToggleOnlyMeds?.(!onlyMedicationsAndFollowup);
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Print Meds & Follow-up Only</span>
                                <Switch
                                    checked={onlyMedicationsAndFollowup}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Hide medical notes, show only medications.
                            </p>
                        </div>



                        <div
                            className={cn(
                                "p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                isReadOnly && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                if (isReadOnly) return;
                                if (isWhatsAppEnabled) {
                                    onToggleAutoSend?.();
                                } else {
                                    toast({
                                        title: "Auto-send Unavailable",
                                        description: "WhatsApp bot registration is required. Contact admin to activate.",
                                    });
                                }
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className={cn("text-sm font-medium", (!isWhatsAppEnabled || isReadOnly) && "text-muted-foreground")}>Auto-send WhatsApp</span>
                                <Switch
                                    checked={isWhatsAppEnabled && isAutoSendEnabled && !isReadOnly}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {isReadOnly ? "Read-only mode: Settings cannot be changed." :
                                    isWhatsAppEnabled
                                        ? "Auto-send consultation completed notification."
                                        : "Personalize your patient experience. Contact admin to activate."}
                            </p>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
