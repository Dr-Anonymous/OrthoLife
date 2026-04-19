
import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Keyboard, 
    Stethoscope, 
    History, 
    Smartphone, 
    Activity,
    Info,
    CheckCircle2,
    BookOpen
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface HandbookSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onShortcutsClick?: () => void;
}

export const HandbookSheet = ({ isOpen, onClose, onShortcutsClick }: HandbookSheetProps) => {
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

                <Tabs defaultValue="en" className="flex-1 flex flex-col">
                    <div className="px-6 py-2 bg-muted/30 border-b">
                        <TabsList className="grid w-32 grid-cols-2 h-8">
                            <TabsTrigger value="en" className="text-xs">English</TabsTrigger>
                            <TabsTrigger value="te" className="text-xs">తెలుగు</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6 pb-20 space-y-8">
                            <TabsContent value="en" className="m-0 space-y-8">
                                {/* Keyboard Shortcuts */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <Keyboard className="w-4 h-4" />
                                        <h4>Keyboard Shortcuts</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { keys: ['Ctrl', 'S'], action: 'Quick Save' },
                                            { keys: ['Ctrl', 'P'], action: 'Save & Print Prescription' },
                                            { keys: ['Ctrl', 'F'], action: 'Search Consultations' },
                                            { keys: ['Cmd', 'D'], action: 'Focus Search Bar' },
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

                                {/* Shorthand/Text Triggers */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <Stethoscope className="w-4 h-4" />
                                        <h4>Example Clinical Shorthand</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Configure these in{" "}
                                        <button 
                                            onClick={() => {
                                                onClose();
                                                onShortcutsClick?.();
                                            }}
                                            className="font-bold text-primary hover:underline underline-offset-2"
                                        >
                                            More Actions &gt; Shortcuts
                                        </button>
                                        . Type your trigger followed by a <span className="font-bold underline">period (.) and Space</span> to expand.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { trigger: 'ra.', label: 'Rheumatoid Arthritis' },
                                            { trigger: 'oa.', label: 'Osteoarthritis' },
                                            { trigger: 'lt.', label: 'Left' },
                                            { trigger: 'rt.', label: 'Right' },
                                            { trigger: '2w.', label: 'after 2 weeks...' },
                                            { trigger: 'med1.', label: 'Custom User Shortcut' },
                                        ].map((item, i) => (
                                            <div key={i} className="p-2 rounded-md border border-dashed flex flex-col gap-1">
                                                <code className="text-primary font-bold text-xs">{item.trigger}</code>
                                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
                                        <Info className="w-5 h-5 text-amber-600 shrink-0" />
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                            <strong>Bundle Trigger:</strong> Type <code className="font-bold">//</code> in the Medication field to open the Protocols modal and load saved drug bundles.
                                        </p>
                                    </div>
                                </section>

                                {/* Visit Logic */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <History className="w-4 h-4" />
                                        <h4>Visit Type Logic</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3 p-3 rounded-md bg-green-50/50 border border-green-100">
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                                            <div className="text-xs space-y-1">
                                                <p className="font-bold text-green-900">14-Day Free Review</p>
                                                <p className="text-green-800/80">If a patient visits within 14 days of their last "Paid" visit, the system auto-assigns "Free" visit type.</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Digital Portal */}
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
                            </TabsContent>

                            <TabsContent value="te" className="m-0 space-y-8">
                                {/* Telugu content follows same structure */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <Keyboard className="w-4 h-4" />
                                        <h4>కీబోర్డ్ షార్ట్‌కట్‌లు</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { keys: ['Ctrl', 'S'], action: 'త్వరగా సేవ్ చేయండి' },
                                            { keys: ['Ctrl', 'P'], action: 'సేవ్ & ప్రింట్ ప్రిస్క్రిప్షన్' },
                                            { keys: ['Ctrl', 'F'], action: 'కన్సల్టేషన్ సెర్చ్' },
                                            { keys: ['Cmd', 'D'], action: 'సెర్చ్ బార్ ఫోకస్' },
                                            { keys: ['Ctrl', 'M'], action: 'కొత్త మందుల వరుస' },
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

                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <Stethoscope className="w-4 h-4" />
                                        <h4>షార్ట్‌హ్యాండ్ (Shorthand) ఉదాహరణలు</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        వీటిని{" "}
                                        <button 
                                            onClick={() => {
                                                onClose();
                                                onShortcutsClick?.();
                                            }}
                                            className="font-bold text-primary hover:underline underline-offset-2"
                                        >
                                            More Actions &gt; Shortcuts
                                        </button>
                                        {" "}లో సేవ్ చేసుకోవచ్చు. ట్రిగ్గర్ టైప్ చేసి <span className="font-bold underline">చుక్క (.) మరియు స్పేస్</span> ఇవ్వండి.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { trigger: 'ra.', label: 'Rheumatoid Arthritis' },
                                            { trigger: 'oa.', label: 'Osteoarthritis' },
                                            { trigger: 'lt.', label: 'ఎడమ వైపు' },
                                            { trigger: 'rt.', label: 'కుడి వైపు' },
                                            { trigger: '2w.', label: '2 వారాల తర్వాత...' },
                                            { trigger: 'med1.', label: 'మీరు సేవ్ చేసిన షార్ట్‌కట్' },
                                        ].map((item, i) => (
                                            <div key={i} className="p-2 rounded-md border border-dashed flex flex-col gap-1">
                                                <code className="text-primary font-bold text-xs">{item.trigger}</code>
                                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <History className="w-4 h-4" />
                                        <h4>విజిట్ రకం లాజిక్</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3 p-3 rounded-md bg-green-50/50 border border-green-100">
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                                            <div className="text-xs space-y-1">
                                                <p className="font-bold text-green-900">14-రోజుల ఉచిత సమీక్ష</p>
                                                <p className="text-green-800/80">పేషెంట్ చివరగా "Paid" విజిట్ చేసిన 14 రోజులలోపు మళ్ళీ వస్తే, సిస్టమ్ ఆటోమేటిక్‌గా "Free" విజిట్‌గా గుర్తిస్తుంది.</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </div>
            </Tabs>
            </SheetContent>
        </Sheet>
    );
};
