
import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Keyboard,
    Stethoscope,
    History,
    Smartphone,
    Activity,
    Info,
    CheckCircle2,
    BookOpen,
    Users
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface HandbookSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onShortcutsClick?: () => void;
    onProfileClick?: () => void;
}

export const HandbookSheet = ({ isOpen, onClose, onShortcutsClick, onProfileClick }: HandbookSheetProps) => {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl w-[90vw] p-0 flex flex-col h-full">
                <SheetHeader className="p-6 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <SheetTitle className="text-xl">Practice Handbook</SheetTitle>
                    </div>
                    <SheetDescription>
                        A quick reference for shortcuts, clinical logic, and software features.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-6 pb-20 space-y-8">
                            {/* 1. Global Keyboard Shortcuts */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Keyboard className="w-4 h-4" />
                                    <h4>Global Keyboard Shortcuts</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { keys: ['Ctrl', 'S'], action: 'Quick Save' },
                                        { keys: ['Ctrl', 'P'], action: 'Save & Print Prescription' },
                                        { keys: ['Ctrl', 'F'], action: 'Search Consultations' },
                                        { keys: ['Ctrl', 'D'], action: 'Focus Search Bar' },
                                        { keys: ['Ctrl', 'M'], action: 'Add New Medication row' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 rounded-md bg-secondary/5 border border-secondary/10">
                                            <span className="text-sm">{item.action}</span>
                                            <div className="flex gap-1">
                                                {item.keys.map(k => (
                                                    <kbd key={k} className="px-1.5 py-0.5 rounded border bg-white shadow-sm text-[10px] font-mono font-bold tracking-tighter">{k}</kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 2. Smart Vitals */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Activity className="w-4 h-4" />
                                    <h4>Smart Vitals</h4>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Track Weight, BP, and SpO2. Notice how the BP field automatically highlights categories:
                                    <span className="text-amber-600 font-bold ml-1">Amber (Stage 1)</span>,
                                    <span className="text-red-500 font-bold ml-1">Red (Stage 2)</span>, and
                                    <span className="text-rose-700 font-bold ml-1">Deep Red (Crisis)</span>.
                                </p>
                            </section>

                            {/* 3. Clinical Shorthand (Clinical Notes) */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Stethoscope className="w-4 h-4" />
                                    <h4>Example Clinical Shorthand</h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Used in <strong>Clinical Notes</strong>. Configure your personal abbreviations in{" "}
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onShortcutsClick?.();
                                        }}
                                        className="font-bold text-primary hover:underline underline-offset-2"
                                    >
                                        More Actions &gt; Shortcuts
                                    </button>
                                    . Type trigger + <span className="font-bold underline">period (.) and Space</span> to expand.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { trigger: 'ra.', label: 'Rheumatoid Arthritis' },
                                        { trigger: 'oa.', label: 'Osteoarthritis' },
                                        { trigger: 'lt.', label: 'Left' },
                                        { trigger: 'rt.', label: 'Right' },
                                        { trigger: 'acl.', label: 'ACL Tear' },
                                        { trigger: 'med1.', label: 'Custom User Shortcut' },
                                    ].map((item, i) => (
                                        <div key={i} className="p-2 rounded-md border border-dashed flex flex-col gap-1">
                                            <code className="text-primary font-bold text-xs">{item.trigger}</code>
                                            <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 4. Medication Protocols */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Info className="w-4 h-4" />
                                    <h4>Medication Bundles (Protocols)</h4>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
                                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-900 leading-relaxed">
                                        <strong>Bundle Trigger:</strong> Type <code className="font-bold">//</code> in the Medication name field to open the Protocols modal and load complete drug sets in one click.
                                    </p>
                                </div>
                            </section>

                            {/* 5. Bilingual Patient Advice */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Activity className="w-4 h-4" />
                                    <h4>Bilingual Patient Advice</h4>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    The EMR supports dual-language prescriptions. Use the <strong className="text-primary">EN/తె</strong> toggle in the <strong>Advice</strong> section to switch between English and Telugu instructions. Saved protocols will automatically load the instructions, medication and followup in the selected language.
                                </p>
                            </section>

                            {/* 6. Visit Type Logic */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <History className="w-4 h-4" />
                                    <h4>Visit Type Logic</h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-3 p-3 rounded-md bg-green-50/50 border border-green-100">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                                        <div className="text-xs space-y-1">
                                            <p className="font-bold text-green-900">Custom Free Review Period</p>
                                            <p className="text-green-800/80">
                                                If a patient visits within your specified review period (e.g., 14 days) of their last "Paid" visit, the system auto-assigns "Free" visit type. Configure this in{" "}
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        onProfileClick?.();
                                                    }}
                                                    className="font-bold text-primary hover:underline underline-offset-2"
                                                >
                                                    My Profile &gt; Locations
                                                </button>
                                                .
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 7. Family & Relations */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Users className="w-4 h-4" />
                                    <h4>Family & Relations</h4>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground"> Group patients together for clinical continuity. Link family members (parents, spouses, children) by clicking the <strong>+ icon</strong> in the <strong>Family & Relations</strong> section of the sidebar to view shared medical patterns.</p>
                            </section>

                            {/* 8. Digital Portal */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <Smartphone className="w-4 h-4" />
                                    <h4>Digital Prescription Portal</h4>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">Every prescription includes a QR code and a shareable link. Patients can access their history, download PDFs, and log vitals via:</p>
                                <div className="p-2 rounded bg-muted font-mono text-[10px] text-center">
                                    ortho.life/p/{"{patient_phone}"}
                                </div>
                            </section>
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
};
