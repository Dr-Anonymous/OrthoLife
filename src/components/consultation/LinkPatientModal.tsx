import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Patient } from '@/types/consultation';

interface LinkPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPatientId: string;
    onLinkSuccess: () => void;
}

export const LinkPatientModal: React.FC<LinkPatientModalProps> = ({ isOpen, onClose, currentPatientId, onLinkSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isLinking, setIsLinking] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        setSelectedPatient(null);

        try {
            // Determine search type based on input (numeric = phone, else name)
            const searchType = /^\d+$/.test(searchTerm) ? 'phone' : 'name';

            const { data, error } = await supabase.functions.invoke('search-patients', {
                body: { searchTerm, searchType },
            });

            if (error) throw error;

            // Filter out the current patient from results to avoid self-linking
            const filteredResults = (data || []).filter((p: Patient) => String(p.id) !== String(currentPatientId));
            setSearchResults(filteredResults);

            if (filteredResults.length === 0) {
                toast({ title: 'No patients found', description: 'Try a different name or phone number.' });
            }
        } catch (error) {
            console.error('Search error:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to search patients.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleLink = async () => {
        if (!selectedPatient) return;

        setIsLinking(true);
        try {
            // Logic: The CURRENT patient (the one we are viewing) will become the PRIMARY.
            // The SELECTED patient will be linked TO the current patient (become secondary).
            // Wait, usually users might want to merge INTO an older record.
            // Let's assume current view is the "Target" (Primary).
            // Actually, if I just registered a Duplicate (Patient B), and I realize it, 
            // I am viewing Patient B. I search for Patient A (original).
            // I want B to be linked TO A. So A is Primary, B is Secondary.
            // So if I select "Patient A" from search, A should be the Primary.

            const primaryId = selectedPatient.id;
            const secondaryId = currentPatientId;

            const { error } = await supabase.rpc('link_patients', {
                primary_id: primaryId,
                secondary_id: secondaryId
            });

            if (error) throw error;

            toast({ title: 'Success', description: 'Patients linked successfully.' });
            onLinkSuccess();
            onClose();
        } catch (error: any) {
            console.error('Link error:', error);
            toast({ variant: 'destructive', title: 'Linking Failed', description: error.message });
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Link Duplicate Patient</DialogTitle>
                    <DialogDescription>
                        Search for the <b>original/primary</b> patient record. The current patient profile will be linked to it, and their histories will be merged.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Search Patient (Name or Phone)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {searchResults.map(patient => (
                            <div
                                key={patient.id}
                                className={`p-3 border rounded cursor-pointer hover:bg-slate-50 ${selectedPatient?.id === patient.id ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                onClick={() => setSelectedPatient(patient)}
                            >
                                <div className="font-medium">{patient.name}</div>
                                <div className="text-sm text-muted-foreground">{patient.phone} • {patient.sex} • {patient.dob}</div>
                            </div>
                        ))}
                    </div>

                    {selectedPatient && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div>
                                <strong>Warning:</strong> You are about to link the current patient to <b>{selectedPatient.name}</b>.
                                <br />
                                The current patient will be treated as a secondary record. Future consultations will appear under {selectedPatient.name}.
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleLink} disabled={!selectedPatient || isLinking || isSearching} variant="default">
                        {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
