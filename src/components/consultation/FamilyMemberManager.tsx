import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Search, Link as LinkIcon, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FamilyMemberManagerProps {
    currentPatientId: string;
    currentPatientName: string;
    onSelectPatient?: (patientId: any) => void;
    onViewHistory: (patientId: string, patientName?: string) => void;
}

interface Relationship {
    id: string;
    patient_id: string;
    related_patient_id: string;
    relationship_type: string;
    related_patient?: {
        name: string;
        phone: string;
        sex: string;
        dob: string;
    };
    // For incoming links
    patient?: {
        name: string;
        phone: string;
        sex: string;
        dob: string;
    };
}

export const FamilyMemberManager: React.FC<FamilyMemberManagerProps> = ({ currentPatientId, currentPatientName, onSelectPatient, onViewHistory }) => {
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [incomingRelationships, setIncomingRelationships] = useState<Relationship[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Add form state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedRelatedPatient, setSelectedRelatedPatient] = useState<any | null>(null);
    const [selectedType, setSelectedType] = useState<string>('');

    const relationshipTypes = [
        "Mother", "Father", "Wife", "Husband",
        "Son", "Daughter", "Brother", "Sister",
        "Grandparent", "Grandchild",
        "Friend", "Family", "Other"
    ];

    const fetchRelationships = async () => {
        setIsLoading(true);
        try {
            // Fetch outgoing: Who is this patient related TO? (e.g. This patient IS Mother OF X)
            const { data: outgoing, error: outError } = await supabase
                .from('patient_relationships')
                .select('*, related_patient:patients!related_patient_id(name, phone, sex, dob)')
                .eq('patient_id', currentPatientId);

            if (outError) throw outError;
            setRelationships(outgoing || []);

            // Fetch incoming: Who is related TO this patient? (e.g. Y IS Mother OF This patient)
            const { data: incoming, error: inError } = await supabase
                .from('patient_relationships')
                .select('*, patient:patients!patient_id(name, phone, sex, dob)')
                .eq('related_patient_id', currentPatientId);

            if (inError) throw inError;
            setIncomingRelationships(incoming || []);

        } catch (error) {
            console.error("Error fetching relationships:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentPatientId) {
            fetchRelationships();
        }
    }, [currentPatientId]);

    const [isViewingHistory, setIsViewingHistory] = useState(false);

    const handleViewHistory = (id: string, name: string) => {
        setIsViewingHistory(true);
        onViewHistory(id, name);
        // Reset after a short delay to allow the modal to settle without closing the popover
        setTimeout(() => setIsViewingHistory(false), 1000);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const { data, error } = await supabase.functions.invoke('search-patients', {
                body: { searchTerm: searchQuery, searchType: /^\d+$/.test(searchQuery) ? 'phone' : 'name' },
            });
            if (error) throw error;

            // Get IDs of patients already linked (both outgoing and incoming)
            const linkedIds = new Set([
                ...relationships.map(r => String(r.related_patient_id)),
                ...incomingRelationships.map(r => String(r.patient_id))
            ]);

            // Filter out self and already linked patients
            const filtered = (data || []).filter((p: any) =>
                String(p.id) !== String(currentPatientId) && !linkedIds.has(String(p.id))
            );
            setSearchResults(filtered);

            if (filtered.length === 0 && (data || []).length > 0) {
                toast({ title: "Note", description: "All matching patients are already linked." });
            }
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Search failed", description: "Could not find patients." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async () => {
        if (!selectedRelatedPatient || !selectedType) return;

        try {
            // Ensure the related patient exists in our SQL database. 
            // Patients from 'gdrive' source are legacy records not yet in the SQL table.
            if (selectedRelatedPatient.source === 'gdrive') {
                // Sanitize DOB for DB (date type expects YYYY-MM-DD)
                let formattedDob = null;
                if (selectedRelatedPatient.dob) {
                    try {
                        const d = new Date(selectedRelatedPatient.dob);
                        if (!isNaN(d.getTime())) {
                            formattedDob = format(d, 'yyyy-MM-dd');
                        }
                    } catch (e) {
                        console.error("Invalid DOB from Drive:", selectedRelatedPatient.dob);
                    }
                }

                const { error: patientError } = await supabase.from('patients').upsert({
                    id: String(selectedRelatedPatient.id),
                    name: selectedRelatedPatient.name,
                    dob: formattedDob,
                    sex: selectedRelatedPatient.sex,
                    phone: selectedRelatedPatient.phone,
                    drive_id: selectedRelatedPatient.drive_id,
                    is_dob_estimated: false
                });
                if (patientError) throw patientError;
            }

            const { error } = await supabase.from('patient_relationships').insert({
                patient_id: currentPatientId,
                related_patient_id: String(selectedRelatedPatient.id),
                relationship_type: selectedType
            });

            if (error) {
                if (error.code === '23505') {
                    toast({
                        variant: "destructive",
                        title: "Duplicate Relationship",
                        description: `${currentPatientName} is already linked to ${selectedRelatedPatient.name}.`
                    });
                    return;
                }
                throw error;
            }

            toast({ title: "Relationship Added", description: `Added ${selectedType} link.` });
            setIsAddOpen(false);
            setSelectedRelatedPatient(null);
            setSearchQuery('');
            setSearchResults([]);
            setSelectedType('');
            fetchRelationships();
        } catch (e: any) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not save relationship. Please try again." });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('patient_relationships').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Removed", description: "Relationship removed." });
            fetchRelationships();
        } catch (e) {
            console.error(e);
        }
    };

    // Calculate age helper
    const getAge = (dob: string) => {
        if (!dob) return '';
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        return `${age}Y`;
    };

    return (
        <div className="space-y-2 p-3 rounded-md border bg-secondary/5 border-secondary/20">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2 text-primary">
                    <LinkIcon className="w-4 h-4" />
                    Family & Relations
                </Label>
                <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-secondary/20">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-80 p-0 max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border-secondary/20"
                        align="end"
                        sideOffset={8}
                        avoidCollisions
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                            if (isViewingHistory) e.preventDefault();
                        }}
                    >
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">Add Relationship</h4>
                                    {selectedRelatedPatient && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary/80"
                                            onClick={() => {
                                                setSelectedRelatedPatient(null);
                                                setSelectedType('');
                                            }}
                                        >
                                            Change Patient
                                        </Button>
                                    )}
                                </div>

                                {!selectedRelatedPatient && (
                                    <div className="space-y-2">
                                        <div className="flex gap-1.5">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search name or phone..."
                                                    className="pl-8 h-9 text-sm bg-secondary/5"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                                />
                                            </div>
                                            <Button size="sm" variant="secondary" className="h-9 px-3" onClick={handleSearch} disabled={isSearching}>
                                                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                                            </Button>
                                        </div>

                                        {searchResults.length > 0 && (
                                            <ScrollArea className="h-44 border rounded-md p-1 bg-secondary/5">
                                                <div className="space-y-1">
                                                    {searchResults.map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="group text-sm p-2 rounded cursor-pointer hover:bg-accent border border-transparent hover:border-accent-foreground/10 transition-all flex items-center justify-between gap-2"
                                                            onClick={() => setSelectedRelatedPatient(p)}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium flex items-center justify-between">
                                                                    <span className="truncate">{p.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground shrink-0">{getAge(p.dob)} {p.sex}</span>
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground flex justify-between items-center">
                                                                    <span className="truncate">{p.phone}</span>
                                                                    {p.hometown && <span className="bg-muted/50 px-1 rounded-sm shrink-0 truncate max-w-[80px]">{p.hometown}</span>}
                                                                </div>
                                                            </div>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5 hover:bg-primary/20 text-primary"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewHistory(String(p.id), p.name);
                                                                            }}
                                                                        >
                                                                            <FileText className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>View Last Prescription</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </div>
                                )}

                                {selectedRelatedPatient && (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                        {/* Selected Patient Mini Card */}
                                        <div className="flex items-center gap-3 p-2.5 bg-primary/5 rounded-lg border border-primary/10 group relative">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-primary">{selectedRelatedPatient.name[0]}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-sm truncate">{selectedRelatedPatient.name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{selectedRelatedPatient.phone} • {getAge(selectedRelatedPatient.dob)} {selectedRelatedPatient.sex}</div>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary bg-primary/10 hover:bg-primary/20"
                                                            onClick={() => handleViewHistory(String(selectedRelatedPatient.id), selectedRelatedPatient.name)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View Prescription History</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div className="space-y-2 p-2.5 bg-secondary/10 rounded-lg border border-secondary/20">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Relationship Type</Label>
                                            <div className="text-xs text-muted-foreground leading-snug">
                                                {currentPatientName} is <span className="font-bold text-foreground">...</span> of {selectedRelatedPatient.name}
                                            </div>
                                            <Select value={selectedType} onValueChange={setSelectedType}>
                                                <SelectTrigger className="h-9 bg-background border-secondary/30">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {relationshipTypes.map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 border-t bg-secondary/5 mt-auto">
                            <Button
                                className="w-full h-10 shadow-md font-semibold transition-all active:scale-[0.98]"
                                disabled={!selectedRelatedPatient || !selectedType}
                                onClick={handleAdd}
                            >
                                Save Relationship
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {(relationships.length === 0 && incomingRelationships.length === 0) ? (
                <div className="text-xs text-muted-foreground px-1 italic">No relationships linked.</div>
            ) : (
                <div className="space-y-2">
                    {/* Outgoing: "Mother of X" */}
                    {relationships.map(r => (
                        <div key={r.id} className="flex items-center justify-between group text-sm p-1.5 rounded hover:bg-secondary/10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="font-medium shrink-0">{r.relationship_type} of</span>
                                <span
                                    className="truncate text-primary cursor-pointer hover:underline"
                                    onClick={() => onViewHistory(r.related_patient_id, r.related_patient?.name)}
                                    title="View History"
                                >
                                    {r.related_patient?.name}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(r.id)}
                            >
                                <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                        </div>
                    ))}

                    {/* Incoming: "Mother: Y" (Y is Mother of This) */}
                    {incomingRelationships.map(r => (
                        <div key={r.id} className="flex items-center justify-between group text-sm p-1.5 rounded hover:bg-secondary/10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <ArrowLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="font-medium shrink-0">{r.relationship_type}:</span>
                                <span
                                    className="truncate text-primary cursor-pointer hover:underline"
                                    onClick={() => onViewHistory(r.patient_id, r.patient?.name)}
                                    title="View History"
                                >
                                    {r.patient?.name}
                                </span>
                            </div>
                            {/* Delete incoming? Should be allowed. It deletes the row. */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(r.id)}
                            >
                                <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
