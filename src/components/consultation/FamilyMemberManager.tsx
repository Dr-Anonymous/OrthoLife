import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Search, Link as LinkIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FamilyMemberManagerProps {
    currentPatientId: string;
    currentPatientName: string;
    onSelectPatient?: (patientId: any) => void;
    onViewHistory: (patientId: string) => void;
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

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const { data, error } = await supabase.functions.invoke('search-patients', {
                body: { searchTerm: searchQuery, searchType: /^\d+$/.test(searchQuery) ? 'phone' : 'name' },
            });
            if (error) throw error;
            // Filter out self
            const filtered = (data || []).filter((p: any) => String(p.id) !== String(currentPatientId));
            setSearchResults(filtered);
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
            const { error } = await supabase.from('patient_relationships').insert({
                patient_id: currentPatientId,
                related_patient_id: selectedRelatedPatient.id,
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
                        className="w-80 p-4 max-h-[60vh] overflow-y-auto"
                        align="end"
                        avoidCollisions
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <div className="space-y-4">
                            <h4 className="font-medium leading-none">Add Relationship</h4>
                            <div className="space-y-2">
                                <Label>Search Patient</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Name or Phone"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button size="icon" variant="secondary" onClick={handleSearch} disabled={isSearching}>
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {searchResults.length > 0 && (
                                <ScrollArea className="h-32 border rounded-md p-2">
                                    <div className="space-y-1">
                                        {searchResults.map(p => (
                                            <div
                                                key={p.id}
                                                className={cn(
                                                    "text-sm p-2 rounded cursor-pointer hover:bg-accent",
                                                    selectedRelatedPatient?.id === p.id && "bg-accent text-accent-foreground"
                                                )}
                                                onClick={() => setSelectedRelatedPatient(p)}
                                            >
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.phone} • {getAge(p.dob)} {p.sex}</div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            {selectedRelatedPatient && (
                                <div className="space-y-2">
                                    <Label>Relationship</Label>
                                    <div className="text-sm text-muted-foreground mb-1">
                                        {currentPatientName} is <span className="font-medium text-foreground">...</span> of {selectedRelatedPatient.name}
                                    </div>
                                    <Select value={selectedType} onValueChange={setSelectedType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {relationshipTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button className="w-full" disabled={!selectedRelatedPatient || !selectedType} onClick={handleAdd}>
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
                                    onClick={() => onViewHistory(r.related_patient_id)}
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
                                    onClick={() => onViewHistory(r.patient_id)}
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
