import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Printer, User, ListChecks, Type, FileText, AlignLeft, AlignCenter, AlignRight, Save, RotateCcw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { PrintOptions } from '@/types/consultation';

const DEFAULT_PRINT_OPTIONS: PrintOptions = {
    vitals: true,
    clinicalNotes: true,
    diagnosis: true,
    investigations: true,
    medications: true,
    advice: true,
    followup: true,
    procedure: true,
    referrals: true,
    orthotics: true,
    letterheadMode: false,
    fontSize: 'standard',
    signatureAlignment: 'right'
};

interface PrintSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDoctorProfileEnabled: boolean;
    isSignSealEnabled: boolean;
    printOptions: PrintOptions | undefined;
    onToggleProfile: (checked: boolean) => void;
    onToggleSignSeal: (checked: boolean) => void;
    onUpdatePrintOptions: (options: PrintOptions) => void;
    onSaveAll?: (profile: boolean, signSeal: boolean, options: PrintOptions, allPending?: Record<string, { profile: boolean, signSeal: boolean, options: PrintOptions }>) => void;
    isReadOnly?: boolean;
    currentLocation?: string;
    mode?: 'op' | 'ip';
    hospitals?: any[];
    onLocationChange?: (location: string) => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
    isOpen,
    onClose,
    isDoctorProfileEnabled,
    isSignSealEnabled,
    printOptions,
    onToggleProfile,
    onToggleSignSeal,
    onUpdatePrintOptions,
    isReadOnly = false,
    currentLocation,
    onSaveAll,
    mode = 'op',
    hospitals = [],
    onLocationChange
}) => {
    // Local state to hold changes before saving
    const [localProfile, setLocalProfile] = useState(isDoctorProfileEnabled);
    const [localSignSeal, setLocalSignSeal] = useState(isSignSealEnabled);
    const [localOptions, setLocalOptions] = useState<PrintOptions>(printOptions || DEFAULT_PRINT_OPTIONS);
    
    // Store changes for other locations to allow batch save
    const [pendingChanges, setPendingChanges] = useState<Record<string, { profile: boolean, signSeal: boolean, options: PrintOptions }>>({});

    // Compute if anything has changed
    const isDirty = useMemo(() => {
        const profileChanged = localProfile !== isDoctorProfileEnabled;
        const signSealChanged = localSignSeal !== isSignSealEnabled;
        const optionsChanged = JSON.stringify(localOptions) !== JSON.stringify(printOptions);
        
        const hasCurrentChanges = profileChanged || signSealChanged || optionsChanged;
        const hasPendingChanges = Object.keys(pendingChanges).length > 0;
        
        return hasCurrentChanges || hasPendingChanges;
    }, [localProfile, isDoctorProfileEnabled, localSignSeal, isSignSealEnabled, localOptions, printOptions, pendingChanges]);

    // Sync local state ONLY when modal opens OR location changes
    useEffect(() => {
        if (isOpen) {
            // Check if we have pending changes for this location first
            if (currentLocation && pendingChanges[currentLocation]) {
                const pc = pendingChanges[currentLocation];
                setLocalProfile(pc.profile);
                setLocalSignSeal(pc.signSeal);
                setLocalOptions(pc.options);
            } else {
                setLocalProfile(isDoctorProfileEnabled);
                setLocalSignSeal(isSignSealEnabled);
                setLocalOptions(printOptions || DEFAULT_PRINT_OPTIONS);
            }
        }
    }, [isOpen, isDoctorProfileEnabled, isSignSealEnabled, printOptions, currentLocation, pendingChanges]); 

    const fields = [
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
    ];

    const toggleField = (fieldId: string) => {
        if (!localOptions || isReadOnly) return;
        setLocalOptions({
            ...localOptions,
            [fieldId]: !localOptions[fieldId as keyof PrintOptions]
        });
    };

    const updateOption = (key: keyof PrintOptions, value: any) => {
        if (!localOptions || isReadOnly) return;
        setLocalOptions({
            ...localOptions,
            [key]: value
        });
    };

    const handleSave = () => {
        if (isReadOnly || !localOptions) return;
        
        // Use batch save if available to avoid multiple toasts/refreshes
        if (onSaveAll) {
            // Combine current view changes with all pending changes from other locations
            const finalChanges = {
                ...pendingChanges,
                [currentLocation || 'OrthoLife']: { profile: localProfile, signSeal: localSignSeal, options: localOptions }
            };
            onSaveAll(localProfile, localSignSeal, localOptions, finalChanges);
        } else {
            // Fallback to individual handlers for compatibility
            if (localProfile !== isDoctorProfileEnabled) onToggleProfile(localProfile);
            if (localSignSeal !== isSignSealEnabled) onToggleSignSeal(localSignSeal);
            onUpdatePrintOptions(localOptions);
        }
        
        onClose();
    };

    const handleDiscard = () => {
        setLocalProfile(isDoctorProfileEnabled);
        setLocalSignSeal(isSignSealEnabled);
        setLocalOptions(printOptions);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && isDirty) {
                if (!window.confirm('You have unsaved print settings. Close anyway?')) return;
            }
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Printer className="text-primary" size={24} />
                        Print Preferences
                    </DialogTitle>
                    <DialogDescription>
                        Configure how your records are printed. Settings are saved individually for each hospital location.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Location Selection (if enabled) */}
                    {onLocationChange && hospitals.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase">Configure for Branch</Label>
                            <Select
                                value={currentLocation}
                                onValueChange={(newLoc) => {
                                    // Checkpoint current changes before switching
                                    if (currentLocation) {
                                        setPendingChanges(prev => ({
                                            ...prev,
                                            [currentLocation]: { profile: localProfile, signSeal: localSignSeal, options: localOptions }
                                        }));
                                    }
                                    onLocationChange(newLoc);
                                }}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full bg-primary/5 border-primary/20">
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {hospitals.map(h => (
                                        <SelectItem key={h.name} value={h.name}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* 1. Header & Branding Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <User size={16} /> Header & Branding
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div
                                className={cn(
                                    "flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent transition-all cursor-pointer hover:bg-muted/50",
                                    isReadOnly && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => !isReadOnly && updateOption('letterheadMode', !localOptions?.letterheadMode)}
                            >
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-muted-foreground" />
                                        <p className="text-sm font-medium">Letterhead Mode</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Hide digital header/footer for pre-printed paper.</p>
                                </div>
                                <Switch
                                    checked={localOptions?.letterheadMode || false}
                                    onCheckedChange={() => { }} // Handled by parent div
                                    disabled={isReadOnly}
                                />
                            </div>

                            {mode === 'op' && (
                                <div
                                    className={cn(
                                        "flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent transition-all cursor-pointer hover:bg-muted/50",
                                        isReadOnly && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => !isReadOnly && setLocalProfile(!localProfile)}
                                >
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">Doctor Profile</p>
                                        <p className="text-xs text-muted-foreground">Include consultant/ team marketing details following prescription.</p>
                                    </div>
                                    <Switch
                                        checked={localProfile}
                                        onCheckedChange={() => { }} // Handled by parent div
                                        disabled={isReadOnly}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Clinical Content Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <ListChecks size={16} /> Clinical Content
                        </h3>

                        <div className="space-y-4 p-3 bg-muted/30 rounded-lg border border-transparent">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground uppercase">Font Size</Label>
                                <Tabs 
                                    value={localOptions?.fontSize || 'standard'} 
                                    onValueChange={(v) => updateOption('fontSize', v)}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-3 h-8">
                                        <TabsTrigger value="compact" className="text-[10px]">Compact</TabsTrigger>
                                        <TabsTrigger value="standard" className="text-[10px]">Standard</TabsTrigger>
                                        <TabsTrigger value="large" className="text-[10px]">Large</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {mode === 'op' && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase">Include in Print</Label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {fields.map((field) => {
                                            const isSelected = localOptions?.[field.id as keyof PrintOptions];
                                            return (
                                                <Badge
                                                    key={field.id}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className={cn(
                                                        "cursor-pointer px-2 py-0.5 text-[10px] transition-all hover:scale-105 active:scale-95",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground shadow-md"
                                                            : "text-muted-foreground hover:bg-background border-muted-foreground/30",
                                                        isReadOnly && "opacity-50 cursor-not-allowed"
                                                    )}
                                                    onClick={() => toggleField(field.id)}
                                                >
                                                    {field.label}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Authentication Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <Type size={16} /> Authentication & Footer
                        </h3>

                        <div className="space-y-4 p-3 bg-muted/30 rounded-lg border border-transparent">
                            <div
                                className={cn(
                                    "flex items-center justify-between transition-all cursor-pointer",
                                    isReadOnly && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => !isReadOnly && setLocalSignSeal(!localSignSeal)}
                            >
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Digital Sign & Seal</p>
                                    <p className="text-xs text-muted-foreground">Add digital signature to all documents.</p>
                                </div>
                                <Switch
                                    checked={localSignSeal}
                                    onCheckedChange={() => { }} // Handled by parent div
                                    disabled={isReadOnly}
                                />
                            </div>

                            {localSignSeal && (
                                <div className="space-y-2 pt-2 border-t border-muted-foreground/10 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase">Signature Alignment</Label>
                                    <Tabs
                                        value={localOptions?.signatureAlignment || 'right'}
                                        onValueChange={(v) => updateOption('signatureAlignment', v)}
                                        className="w-full"
                                    >
                                        <TabsList className="grid w-full grid-cols-3 h-8">
                                            <TabsTrigger value="left" className="gap-1.5 text-[10px]">
                                                <AlignLeft size={12} /> Left
                                            </TabsTrigger>
                                            <TabsTrigger value="center" className="gap-1.5 text-[10px]">
                                                <AlignCenter size={12} /> Center
                                            </TabsTrigger>
                                            <TabsTrigger value="right" className="gap-1.5 text-[10px]">
                                                <AlignRight size={12} /> Right
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                        {isDirty ? (
                            <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100 py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-medium uppercase tracking-wider">Unsaved Changes</span>
                            </Badge>
                        ) : (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2">Settings Synced</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onClose}
                            className="text-xs h-8"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            {isDirty ? "Discard" : "Close"}
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={!isDirty || isReadOnly}
                            className="text-xs h-8 shadow-sm font-semibold"
                        >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Save Settings
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
