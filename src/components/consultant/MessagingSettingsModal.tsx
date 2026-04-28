import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useConsultant } from '@/context/ConsultantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Clock, MessageSquare, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MessagingSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'discharge' | 'followup' | 'npo' | 'pharmacy' | 'diagnostics';
}

export const MessagingSettingsModal: React.FC<MessagingSettingsModalProps> = ({ isOpen, onClose, initialTab = 'discharge' }) => {
    const { consultant, refreshConsultant } = useConsultant();
    const [isSaving, setIsSaving] = useState(false);

    const DEFAULT_MESSAGES = {
        discharge: {
            en: "Hello {{patient_name}}, hope you are doing well. Please take a moment to review your recent discharge experience at OrthoLife.",
            te: "నమస్కారం {{patient_name}} గారు, మీరు త్వరగా కోలుకోవాలని కోరుకుంటున్నాము. దయచేసి ఆర్థోలైఫ్ ఆసుపత్రిలో మీ అనుభవాన్ని రివ్యూ చేయండి."
        },
        followup: {
            en: "Hello {{patient_name}}, this is a reminder for your follow-up consultation scheduled for tomorrow.",
            te: "నమస్కారం {{patient_name}} గారు, రేపు మీకు డాక్టరుగారితో ఫాలో-అప్ కన్సల్టేషన్ ఉంది. దయచేసి సమయానికి రాగలరు."
        },
        npo: {
            en: "Hello {{patient_name}}, this is a gentle reminder to maintain NPO (nothing by mouth) starting tonight for your surgery tomorrow.",
            te: "నమస్కారం {{patient_name}} గారు, రేపు మీకు సర్జరీ ఉన్నందున దయచేసి ఈ రోజు రాత్రి నుంచి ఏమీ తినవద్దు లేదా త్రాగవద్దు (NPO)."
        },
        pharmacy: {
            en: "Hello {{patient_name}}, it's time to reorder your medications. Please reply to this message to confirm your order.",
            te: "నమస్కారం {{patient_name}} గారు, మీ మందులను మళ్లీ ఆర్డర్ చేయడానికి సమయం అయింది. దయచేసి ఈ మెసేజ్‌కి రిప్లై ఇవ్వడం ద్వారా మీ ఆర్డర్‌ను ధృవీకరించండి."
        },
        diagnostics: {
            en: "Hello {{patient_name}}, it's time for your periodic lab tests. Please contact us to confirm the collection time.",
            te: "నమస్కారం {{patient_name}} గారు, మీ ఆవర్తన ల్యాబ్ పరీక్షలకు సమయం అయింది. దయచేసి సేకరణ సమయాన్ని ధృవీకరించడానికి మమ్మల్ని సంప్రదించండి."
        }
    };

    // Form State
    const [dischargeConfig, setDischargeConfig] = useState({
        enabled: false,
        delay_days: 3,
        message_en: DEFAULT_MESSAGES.discharge.en,
        message_te: DEFAULT_MESSAGES.discharge.te
    });

    const [followupConfig, setFollowupConfig] = useState({
        enabled: false,
        days_before: 1,
        message_en: DEFAULT_MESSAGES.followup.en,
        message_te: DEFAULT_MESSAGES.followup.te
    });

    const [npoConfig, setNpoConfig] = useState({
        enabled: false,
        hours_before: 12,
        message_en: DEFAULT_MESSAGES.npo.en,
        message_te: DEFAULT_MESSAGES.npo.te
    });

    const [pharmacyConfig, setPharmacyConfig] = useState({
        enabled: false,
        frequency_days: 30,
        message_en: DEFAULT_MESSAGES.pharmacy.en,
        message_te: DEFAULT_MESSAGES.pharmacy.te
    });

    const [diagnosticsConfig, setDiagnosticsConfig] = useState({
        enabled: false,
        frequency_days: 90,
        message_en: DEFAULT_MESSAGES.diagnostics.en,
        message_te: DEFAULT_MESSAGES.diagnostics.te
    });

    useEffect(() => {
        if (consultant?.messaging_settings) {
            const settings = consultant.messaging_settings as any;
            
            setDischargeConfig({
                enabled: settings.auto_discharge_config?.enabled ?? settings.auto_discharge_review ?? false,
                delay_days: settings.auto_discharge_config?.delay_days ?? 3,
                message_en: settings.auto_discharge_config?.message_en || DEFAULT_MESSAGES.discharge.en,
                message_te: settings.auto_discharge_config?.message_te || DEFAULT_MESSAGES.discharge.te
            });

            setFollowupConfig({
                enabled: settings.auto_followup_config?.enabled ?? settings.auto_followup ?? false,
                days_before: settings.auto_followup_config?.days_before ?? 1,
                message_en: settings.auto_followup_config?.message_en || DEFAULT_MESSAGES.followup.en,
                message_te: settings.auto_followup_config?.message_te || DEFAULT_MESSAGES.followup.te
            });

            setNpoConfig({
                enabled: settings.auto_npo_config?.enabled ?? settings.auto_npo_reminder ?? false,
                hours_before: settings.auto_npo_config?.hours_before ?? 12,
                message_en: settings.auto_npo_config?.message_en || DEFAULT_MESSAGES.npo.en,
                message_te: settings.auto_npo_config?.message_te || DEFAULT_MESSAGES.npo.te
            });

            setPharmacyConfig({
                enabled: settings.auto_pharmacy_config?.enabled ?? settings.auto_pharmacy ?? false,
                frequency_days: settings.auto_pharmacy_config?.frequency_days ?? 30,
                message_en: settings.auto_pharmacy_config?.message_en || DEFAULT_MESSAGES.pharmacy.en,
                message_te: settings.auto_pharmacy_config?.message_te || DEFAULT_MESSAGES.pharmacy.te
            });

            setDiagnosticsConfig({
                enabled: settings.auto_diagnostics_config?.enabled ?? settings.auto_diagnostics ?? false,
                frequency_days: settings.auto_diagnostics_config?.frequency_days ?? 90,
                message_en: settings.auto_diagnostics_config?.message_en || DEFAULT_MESSAGES.diagnostics.en,
                message_te: settings.auto_diagnostics_config?.message_te || DEFAULT_MESSAGES.diagnostics.te
            });
        }
    }, [consultant, isOpen]);

    const handleSave = async () => {
        if (!consultant) return;
        setIsSaving(true);

        try {
            const newSettings = {
                ...(consultant.messaging_settings || {}),
                auto_discharge_config: dischargeConfig,
                auto_followup_config: followupConfig,
                auto_npo_config: npoConfig,
                auto_pharmacy_config: pharmacyConfig,
                auto_diagnostics_config: diagnosticsConfig,
                // Sync booleans
                auto_discharge_review: dischargeConfig.enabled,
                auto_followup: followupConfig.enabled,
                auto_npo_reminder: npoConfig.enabled,
                auto_pharmacy: pharmacyConfig.enabled,
                auto_diagnostics: diagnosticsConfig.enabled
            };

            const { error } = await supabase
                .from('consultants')
                .update({ messaging_settings: newSettings })
                .eq('id', consultant.id);

            if (error) throw error;

            await refreshConsultant();
            toast.success("Messaging settings saved successfully");
            onClose();
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Bot className="text-primary" />
                        Granular Messaging Controls
                    </DialogTitle>
                    <DialogDescription>
                        Customize when and what automated messages are sent to your patients.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={initialTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-5 mb-6">
                        <TabsTrigger value="discharge" className="gap-1 text-[10px] px-1">
                            Discharge
                        </TabsTrigger>
                        <TabsTrigger value="followup" className="gap-1 text-[10px] px-1">
                            Follow-up
                        </TabsTrigger>
                        <TabsTrigger value="npo" className="gap-1 text-[10px] px-1">
                            NPO
                        </TabsTrigger>
                        <TabsTrigger value="pharmacy" className="gap-1 text-[10px] px-1">
                            Pharmacy
                        </TabsTrigger>
                        <TabsTrigger value="diagnostics" className="gap-1 text-[10px] px-1">
                            Tests
                        </TabsTrigger>
                    </TabsList>

                    {/* DISCHARGE REVIEW TAB */}
                    <TabsContent value="discharge" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Enable Auto-Discharge Review</Label>
                                <p className="text-xs text-muted-foreground">Sends a WhatsApp message after patient is discharged.</p>
                            </div>
                            <Switch 
                                checked={dischargeConfig.enabled} 
                                onCheckedChange={(v) => setDischargeConfig(prev => ({ ...prev, enabled: v }))} 
                            />
                        </div>

                        <div className={dischargeConfig.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={14} /> Send After (Days)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        max={30} 
                                        value={dischargeConfig.delay_days}
                                        onChange={(e) => setDischargeConfig(prev => ({ ...prev, delay_days: parseInt(e.target.value) || 1 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">days after discharge status is set.</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">Message Templates</Label>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        <Info size={10} /> Use {'{{patient_name}}'} as placeholder
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">English Template</Label>
                                    <Textarea 
                                        placeholder="e.g. Hello {{patient_name}}, how are you feeling today?..."
                                        value={dischargeConfig.message_en}
                                        onChange={(e) => setDischargeConfig(prev => ({ ...prev, message_en: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Telugu Template</Label>
                                    <Textarea 
                                        placeholder="నమస్కారం {{patient_name}} గారు..."
                                        value={dischargeConfig.message_te}
                                        onChange={(e) => setDischargeConfig(prev => ({ ...prev, message_te: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* FOLLOW-UP TAB */}
                    <TabsContent value="followup" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Enable Follow-up Reminders</Label>
                                <p className="text-xs text-muted-foreground">Sends a reminder message before a scheduled visit.</p>
                            </div>
                            <Switch 
                                checked={followupConfig.enabled} 
                                onCheckedChange={(v) => setFollowupConfig(prev => ({ ...prev, enabled: v }))} 
                            />
                        </div>

                        <div className={followupConfig.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={14} /> Send Before (Days)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        max={7} 
                                        value={followupConfig.days_before}
                                        onChange={(e) => setFollowupConfig(prev => ({ ...prev, days_before: parseInt(e.target.value) || 1 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">days before the appointment date.</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">Message Templates</Label>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        <Info size={10} /> Use {'{{patient_name}}'} as placeholder
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">English Template</Label>
                                    <Textarea 
                                        placeholder="e.g. Hello {{patient_name}}, this is a reminder for your follow-up visit tomorrow..."
                                        value={followupConfig.message_en}
                                        onChange={(e) => setFollowupConfig(prev => ({ ...prev, message_en: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Telugu Template</Label>
                                    <Textarea 
                                        placeholder="నమస్కారం {{patient_name}} గారు, రేపు మీ హాస్పిటల్ విజిట్ ఉంది..."
                                        value={followupConfig.message_te}
                                        onChange={(e) => setFollowupConfig(prev => ({ ...prev, message_te: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* NPO TAB */}
                    <TabsContent value="npo" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Enable NPO Reminders</Label>
                                <p className="text-xs text-muted-foreground">Sends a fasting reminder before surgical procedures.</p>
                            </div>
                            <Switch 
                                checked={npoConfig.enabled} 
                                onCheckedChange={(v) => setNpoConfig(prev => ({ ...prev, enabled: v }))} 
                            />
                        </div>

                        <div className={npoConfig.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={14} /> Send Before (Hours)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        max={48} 
                                        value={npoConfig.hours_before}
                                        onChange={(e) => setNpoConfig(prev => ({ ...prev, hours_before: parseInt(e.target.value) || 12 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">hours before the surgery time.</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">Message Templates</Label>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        <Info size={10} /> Use {'{{patient_name}}'} as placeholder
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">English Template</Label>
                                    <Textarea 
                                        placeholder="e.g. Hello {{patient_name}}, this is a gentle reminder to maintain NPO starting tonight..."
                                        value={npoConfig.message_en}
                                        onChange={(e) => setNpoConfig(prev => ({ ...prev, message_en: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Telugu Template</Label>
                                    <Textarea 
                                        placeholder="నమస్కారం {{patient_name}} గారు, సర్జరీ ఉన్నందున ఏమీ తినవద్దు..."
                                        value={npoConfig.message_te}
                                        onChange={(e) => setNpoConfig(prev => ({ ...prev, message_te: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* PHARMACY TAB */}
                    <TabsContent value="pharmacy" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Enable Pharmacy Reorders</Label>
                                <p className="text-xs text-muted-foreground">Sends a reminder to reorder medications.</p>
                            </div>
                            <Switch 
                                checked={pharmacyConfig.enabled} 
                                onCheckedChange={(v) => setPharmacyConfig(prev => ({ ...prev, enabled: v }))} 
                            />
                        </div>

                        <div className={pharmacyConfig.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={14} /> Frequency (Days)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        max={365} 
                                        value={pharmacyConfig.frequency_days}
                                        onChange={(e) => setPharmacyConfig(prev => ({ ...prev, frequency_days: parseInt(e.target.value) || 30 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">days between reorder reminders.</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-bold">Message Templates</Label>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">English Template</Label>
                                    <Textarea 
                                        placeholder="e.g. Hello {{patient_name}}, it's time to reorder your medications..."
                                        value={pharmacyConfig.message_en}
                                        onChange={(e) => setPharmacyConfig(prev => ({ ...prev, message_en: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Telugu Template</Label>
                                    <Textarea 
                                        placeholder="నమస్కారం {{patient_name}} గారు, మందులు మళ్ళీ ఆర్డర్ చేయడానికి సమయం అయింది..."
                                        value={pharmacyConfig.message_te}
                                        onChange={(e) => setPharmacyConfig(prev => ({ ...prev, message_te: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* DIAGNOSTICS TAB */}
                    <TabsContent value="diagnostics" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Enable Lab Test Reminders</Label>
                                <p className="text-xs text-muted-foreground">Sends a reminder for recurring lab tests.</p>
                            </div>
                            <Switch 
                                checked={diagnosticsConfig.enabled} 
                                onCheckedChange={(v) => setDiagnosticsConfig(prev => ({ ...prev, enabled: v }))} 
                            />
                        </div>

                        <div className={diagnosticsConfig.enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={14} /> Frequency (Days)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        max={365} 
                                        value={diagnosticsConfig.frequency_days}
                                        onChange={(e) => setDiagnosticsConfig(prev => ({ ...prev, frequency_days: parseInt(e.target.value) || 90 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">days between test reminders.</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-bold">Message Templates</Label>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">English Template</Label>
                                    <Textarea 
                                        placeholder="e.g. Hello {{patient_name}}, it's time for your periodic lab tests..."
                                        value={diagnosticsConfig.message_en}
                                        onChange={(e) => setDiagnosticsConfig(prev => ({ ...prev, message_en: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Telugu Template</Label>
                                    <Textarea 
                                        placeholder="నమస్కారం {{patient_name}} గారు, ల్యాబ్ పరీక్షలు చేయించుకోవడానికి సమయం అయింది..."
                                        value={diagnosticsConfig.message_te}
                                        onChange={(e) => setDiagnosticsConfig(prev => ({ ...prev, message_te: e.target.value }))}
                                        className="min-h-[100px] text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-8 border-t pt-6">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? "Saving..." : "Save Configuration"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
