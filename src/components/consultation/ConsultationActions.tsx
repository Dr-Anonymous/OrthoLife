import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Printer, MoreVertical, FileText, PackagePlus, CloudOff, Send, Users, Bot, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { PrintOptions } from '@/types/consultation';
import { useConsultant } from '@/context/ConsultantContext';
import { supabase } from '@/integrations/supabase/client';

interface ConsultationActionsProps {
    isOnline: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSaveAndPrint: () => void;
    currentLocation?: string;
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
    printOptions?: PrintOptions;
    onUpdatePrintOptions?: (options: PrintOptions) => void;
    isReadOnly?: boolean;
    isWhatsAppEnabled?: boolean;
    hasChanges?: boolean;
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
    currentLocation,
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
    printOptions,
    onUpdatePrintOptions,
    isReadOnly = false,
    isWhatsAppEnabled = true,
    hasChanges = false
}) => {
    const { consultant, refreshConsultant } = useConsultant();

    const isAutoFollowupEnabled = (() => {
        if (!consultant || !currentLocation) return false;
        const settings = consultant.messaging_settings as any;
        const locationOverride = settings?.location_followup_overrides?.[currentLocation];
        if (locationOverride !== undefined) return locationOverride;
        return settings?.auto_followup ?? false;
    })();

    const isDoctorProfileEnabled = (() => {
        if (!consultant || !currentLocation) return showDoctorProfile ?? true;
        const settings = consultant.messaging_settings as any;
        const locationOverride = settings?.location_print_overrides?.[currentLocation]?.show_profile;
        if (locationOverride !== undefined) return locationOverride;
        return showDoctorProfile ?? true;
    })();

    const isSignSealEnabled = (() => {
        if (!consultant || !currentLocation) return showSignSeal ?? true;
        const settings = consultant.messaging_settings as any;
        const locationOverride = settings?.location_print_overrides?.[currentLocation]?.show_sign_seal;
        if (locationOverride !== undefined) return locationOverride;
        return showSignSeal ?? true;
    })();

    const updateLocationSetting = async (key: 'followup' | 'profile' | 'sign_seal', value: boolean) => {
        if (!consultant || !currentLocation || isReadOnly) return;

        try {
            const currentSettings = consultant.messaging_settings || {};
            let newSettings = { ...currentSettings };

            if (key === 'followup') {
                newSettings.location_followup_overrides = {
                    ...(currentSettings.location_followup_overrides || {}),
                    [currentLocation]: value
                };
            } else {
                const printOverrides = currentSettings.location_print_overrides || {};
                const locationPrint = printOverrides[currentLocation] || {};
                
                newSettings.location_print_overrides = {
                    ...printOverrides,
                    [currentLocation]: {
                        ...locationPrint,
                        [key === 'profile' ? 'show_profile' : 'show_sign_seal']: value
                    }
                };
            }

            const { error } = await supabase
                .from('consultants')
                .update({ messaging_settings: newSettings })
                .eq('id', consultant.id);

            if (error) throw error;
            
            await refreshConsultant();
            
            // Call the parent toggle handlers if they exist to keep local state in sync
            if (key === 'profile') onToggleDoctorProfile?.(value);
            if (key === 'sign_seal') onToggleSignSeal?.(value);

            toast({
                title: "Settings Updated",
                description: `Preference saved for ${currentLocation}`
            });
        } catch (error) {
            console.error("Error updating setting:", error);
            toast({
                title: "Error",
                description: "Failed to update preference",
                variant: "destructive"
            });
        }
    };

    const toggleAutoFollowup = () => updateLocationSetting('followup', !isAutoFollowupEnabled);
    const toggleProfile = () => updateLocationSetting('profile', !isDoctorProfileEnabled);
    const toggleSignSeal = () => updateLocationSetting('sign_seal', !isSignSealEnabled);

    return (
        <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-end gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isOnline && <CloudOff className="h-5 w-5 text-yellow-600" />}
                <Button type="button" size="lg" onClick={onSave} disabled={isSaving || isReadOnly || !hasChanges}>
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
                                toggleProfile();
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Print Doctor Profile</span>
                                <Switch
                                    checked={isDoctorProfileEnabled}
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
                                toggleSignSeal();
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Print Sign & Seal</span>
                                <Switch
                                    checked={isSignSealEnabled}
                                    onCheckedChange={() => { }} // Handled by parent div click
                                    className="scale-75"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Add digital signature and seal.
                            </p>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-md border border-primary/10 mb-2">
                            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Include in Print</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { id: 'vitals', label: 'Vitals' },
                                    { id: 'clinicalNotes', label: 'Clinical Notes' },
                                    { id: 'investigations', label: 'Investigations' },
                                    { id: 'diagnosis', label: 'Diagnosis' },
                                    { id: 'procedure', label: 'Procedure' },
                                    { id: 'advice', label: 'Advice' },
                                    { id: 'medications', label: 'Medications' },
                                    { id: 'orthotics', label: 'Orthotics' },
                                    { id: 'referrals', label: 'Referrals' },
                                    { id: 'followup', label: 'Follow-up' }
                                ].map((field) => {
                                    const isSelected = printOptions?.[field.id as keyof PrintOptions];
                                    return (
                                        <Badge
                                            key={field.id}
                                            variant={isSelected ? "default" : "outline"}
                                            className={cn(
                                                "cursor-pointer px-2 py-0.5 text-[10px] transition-all",
                                                isSelected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                                            )}
                                            onClick={() => {
                                                if (printOptions && onUpdatePrintOptions) {
                                                    onUpdatePrintOptions({
                                                        ...printOptions,
                                                        [field.id]: !isSelected
                                                    });
                                                }
                                            }}
                                        >
                                            {field.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
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

                            <div
                                className={cn(
                                    "p-2 bg-primary/5 border border-primary/10 rounded-md cursor-pointer hover:bg-primary/10 transition-colors",
                                    (!currentLocation || isReadOnly) && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleAutoFollowup();
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot size={14} className="text-primary" />
                                        <span className="text-sm font-medium text-primary">Auto follow-up reminders</span>
                                    </div>
                                    <Switch
                                        checked={isAutoFollowupEnabled && !isReadOnly}
                                        onCheckedChange={() => { }} // Handled by parent div click
                                        className="scale-75 data-[state=checked]:bg-primary"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <p className="text-[10px] text-primary/60 mt-1">
                                    {currentLocation ? `Automated reminders for ${currentLocation}.` : "Select a location to enable."}
                                </p>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
