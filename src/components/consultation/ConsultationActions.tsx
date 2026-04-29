import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Printer, MoreVertical, FileText, PackagePlus, CloudOff, Send, Users, Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { PrintOptions } from '@/types/consultation';
import { useConsultant } from '@/context/ConsultantContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown } from 'lucide-react';
import { MessagingSettingsModal } from '@/components/consultant/MessagingSettingsModal';
import { PrintSettingsModal } from './PrintSettingsModal';

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
    const [showScrollHint, setShowScrollHint] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMessagingSettingsModalOpen, setIsMessagingSettingsModalOpen] = useState(false);
    const [isPrintSettingsModalOpen, setIsPrintSettingsModalOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) {
            setShowScrollHint(true); // Reset when closed
            return;
        }

        // Small timeout to ensure the portal content is rendered
        const timeoutId = setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (!viewport) return;

            const handleScroll = () => {
                const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
                // Hide hint if we're within 20px of the bottom
                if (scrollTop + clientHeight >= scrollHeight - 20) {
                    setShowScrollHint(false);
                } else {
                    setShowScrollHint(true);
                }
            };

            handleScroll();
            viewport.addEventListener('scroll', handleScroll);
            return () => viewport.removeEventListener('scroll', handleScroll);
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [isMenuOpen, consultant]);

    const isAutoFollowupEnabled = (() => {
        if (!consultant || !currentLocation) return false;
        const settings = consultant.messaging_settings as any;
        const locationOverride = settings?.location_followup_overrides?.[currentLocation];
        if (locationOverride !== undefined) return locationOverride;
        return settings?.auto_followup_config?.enabled ?? settings?.auto_followup ?? false;
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

    const updateLocationSetting = async (key: 'followup' | 'profile' | 'sign_seal' | 'print_options' | 'auto_send', value: boolean | PrintOptions) => {
        if (!consultant || !currentLocation || isReadOnly) return;

        try {
            const currentSettings = consultant.messaging_settings || {};
            let newSettings = { ...currentSettings };

            if (key === 'followup') {
                newSettings.location_followup_overrides = {
                    ...(currentSettings.location_followup_overrides || {}),
                    [currentLocation]: value as boolean
                };
            } else if (key === 'auto_send') {
                newSettings.location_auto_send_overrides = {
                    ...(currentSettings.location_auto_send_overrides || {}),
                    [currentLocation]: value as boolean
                };
            } else if (key === 'print_options') {
                newSettings.location_print_options = {
                    ...(currentSettings.location_print_options || {}),
                    [currentLocation]: value as PrintOptions
                };
            } else {
                const printOverrides = currentSettings.location_print_overrides || {};
                const locationPrint = printOverrides[currentLocation] || {};

                newSettings.location_print_overrides = {
                    ...printOverrides,
                    [currentLocation]: {
                        ...locationPrint,
                        [key === 'profile' ? 'show_profile' : 'show_sign_seal']: value as boolean
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
            if (key === 'profile') onToggleDoctorProfile?.(value as boolean);
            if (key === 'sign_seal') onToggleSignSeal?.(value as boolean);
            if (key === 'print_options') onUpdatePrintOptions?.(value as PrintOptions);

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

    const batchUpdatePrintSettings = async (profile: boolean, signSeal: boolean, options: PrintOptions, multiChanges?: Record<string, any>) => {
        if (!consultant || !currentLocation || isReadOnly) return;

        try {
            const currentSettings = consultant.messaging_settings || {};
            let newSettings = { ...currentSettings };

            // Update print options
            newSettings.location_print_options = {
                ...(currentSettings.location_print_options || {}),
                [currentLocation]: options
            };

            // Update overrides
            const printOverrides = currentSettings.location_print_overrides || {};
            newSettings.location_print_overrides = {
                ...printOverrides,
                [currentLocation]: {
                    ...(printOverrides[currentLocation] || {}),
                    show_profile: profile,
                    show_sign_seal: signSeal
                }
            };

            const { error } = await supabase
                .from('consultants')
                .update({ messaging_settings: newSettings })
                .eq('id', consultant.id);

            if (error) throw error;

            await refreshConsultant();

            // Sync parent states
            onToggleDoctorProfile?.(profile);
            onToggleSignSeal?.(signSeal);
            onUpdatePrintOptions?.(options);

            toast({
                title: "Settings Updated",
                description: `All preferences saved for ${currentLocation}`
            });
        } catch (error) {
            console.error("Error batch updating settings:", error);
            toast({
                title: "Error",
                description: "Failed to save settings",
                variant: "destructive"
            });
        }
    };

    const toggleAutoFollowup = async () => {
        await updateLocationSetting('followup', !isAutoFollowupEnabled);
    };
    const toggleProfile = (val: boolean) => updateLocationSetting('profile', val);
    const toggleSignSeal = (val: boolean) => updateLocationSetting('sign_seal', val);

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
                <DropdownMenu onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="outline" className="h-12 w-12" id="more-actions-button">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[310px] p-0 flex flex-col">
                        <ScrollArea ref={scrollAreaRef} className="h-[520px] max-h-[85vh]">
                            <div className="p-2 space-y-2">
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

                                <DropdownMenuSeparator className="my-1" />

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

                                <div className="space-y-2">
                                    <div 
                                        onClick={() => setIsPrintSettingsModalOpen(true)} 
                                        className="flex items-center justify-between p-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
                                    >
                                        <div className="flex flex-col w-full">
                                            <div className="flex items-center gap-2">
                                                <Printer className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">Print Settings</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Configure profile, signature, and printable fields.
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                                            (!currentLocation || isReadOnly) && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (!currentLocation || isReadOnly) return;
                                            if (isWhatsAppEnabled) {
                                                updateLocationSetting('auto_send', !isAutoSendEnabled);
                                            } else {
                                                toast({
                                                    title: "Auto-send Unavailable",
                                                    description: "WhatsApp bot registration is required. Contact admin to activate.",
                                                });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Send size={14} className="text-muted-foreground" />
                                                <span className="text-sm">Auto-send WhatsApp</span>
                                            </div>
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
                                                    ? (currentLocation ? `Auto-send completion message for ${currentLocation}.` : "Select a location to enable.")
                                                    : "Personalize your patient experience. Contact admin to activate."}
                                        </p>
                                    </div>

                                    <div
                                        className={cn(
                                            "p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                                            (!currentLocation || !isWhatsAppEnabled || isReadOnly) && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (!currentLocation || isReadOnly) return;
                                            if (isWhatsAppEnabled) {
                                                toggleAutoFollowup();
                                            } else {
                                                toast({
                                                    title: "Automated Reminders Unavailable",
                                                    description: "WhatsApp bot registration is required. Contact admin to activate.",
                                                });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Bot size={14} className="text-muted-foreground" />
                                                <span className="text-sm">Auto follow-up reminders</span>
                                            </div>
                                            <Switch
                                                checked={isWhatsAppEnabled && isAutoFollowupEnabled && !isReadOnly}
                                                onCheckedChange={() => { }} // Handled by parent div click
                                                className="scale-75 data-[state=checked]:bg-primary"
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {isReadOnly ? "Read-only mode: Settings cannot be changed." :
                                                !isWhatsAppEnabled ? "Contact admin to activate automated reminders." :
                                                    currentLocation ? `Automated reminders for ${currentLocation}.` : "Select a location to enable."}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-[10px] h-7 mt-2 text-primary hover:text-primary hover:bg-primary/5 border border-primary/20 border-dashed"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsMessagingSettingsModalOpen(true);
                                            }}
                                        >
                                            Customize Timing & Messages
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        {showScrollHint && (
                            <div className="flex items-center justify-center py-2 bg-primary/5 border-t border-primary/10 transition-all duration-300">
                                <span className="text-[10px] font-bold text-primary/70 flex items-center gap-2 uppercase tracking-tighter">
                                    Scroll for More Actions <ChevronDown size={12} className="animate-bounce" />
                                </span>
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <MessagingSettingsModal
                isOpen={isMessagingSettingsModalOpen}
                onClose={() => setIsMessagingSettingsModalOpen(false)}
                initialTab="followup"
            />
            <PrintSettingsModal
                isOpen={isPrintSettingsModalOpen}
                onClose={() => setIsPrintSettingsModalOpen(false)}
                isDoctorProfileEnabled={isDoctorProfileEnabled}
                isSignSealEnabled={isSignSealEnabled}
                printOptions={printOptions}
                onToggleProfile={toggleProfile}
                onToggleSignSeal={toggleSignSeal}
                onUpdatePrintOptions={(options) => updateLocationSetting('print_options', options)}
                onSaveAll={batchUpdatePrintSettings}
                isReadOnly={isReadOnly}
                currentLocation={currentLocation}
            />
        </div>
    );
};
