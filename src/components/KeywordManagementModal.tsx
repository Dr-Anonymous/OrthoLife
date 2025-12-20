import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Edit, Save, Search } from 'lucide-react';

interface Keyword {
  id: number;
  keywords: string[];
  medication_ids: number[];
  advice?: string;
  advice_te?: string;
  investigations?: string;
  followup?: string;
  followup_te?: string;
}

interface Medication {
  id: number;
  name: string;
}

interface KeywordManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeywordManagementModal: React.FC<KeywordManagementModalProps> = ({ isOpen, onClose }) => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [selectedMeds, setSelectedMeds] = useState<number[]>([]);
  const [advice, setAdvice] = useState('');
  const [adviceTe, setAdviceTe] = useState('');
  const [investigations, setInvestigations] = useState('');
  const [followup, setFollowup] = useState('');
  const [followupTe, setFollowupTe] = useState('');
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const debouncedAdvice = useDebounce(advice, 500);
  const debouncedFollowup = useDebounce(followup, 500);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const translateAdvice = async () => {
      if (!advice || !advice.trim()) {
        setAdviceTe('');
        return;
      };
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: { text: advice, targetLanguage: 'te' },
        });
        if (error) throw error;
        setAdviceTe(data?.translatedText || '');
      } catch (err) {
        console.error('Translation error:', err);
        toast({ variant: 'destructive', title: 'Translation Error', description: (err as Error).message });
      } finally {
        setIsTranslating(false);
      }
    };

    if (editingKeyword) {
      if (!adviceTe) { // Only auto-translate when editing if Te field is empty
        translateAdvice();
      }
    } else { // Always auto-translate when creating new
      if (debouncedAdvice) {
        translateAdvice();
      }
    }
  }, [debouncedAdvice, editingKeyword]);

  useEffect(() => {
    const translateFollowup = async () => {
      if (!followup || !followup.trim()) {
        setFollowupTe('');
        return;
      };
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: { text: followup, targetLanguage: 'te' },
        });
        if (error) throw error;
        setFollowupTe(data?.translatedText || '');
      } catch (err) {
        console.error('Translation error:', err);
        toast({ variant: 'destructive', title: 'Translation Error', description: (err as Error).message });
      } finally {
        setIsTranslating(false);
      }
    };

    if (editingKeyword) {
      if (!followupTe) { // Only auto-translate when editing if Te field is empty
        translateFollowup();
      }
    } else { // Always auto-translate when creating new
      if (debouncedFollowup) {
        translateFollowup();
      }
    }
  }, [debouncedFollowup, editingKeyword]);

  const fetchKeywords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('autofill_keywords').select('*');
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching keywords', description: error.message });
    } else {
      setKeywords(data);
    }
    setIsLoading(false);
  };

  const fetchMedications = async () => {
    const { data, error } = await supabase.from('saved_medications').select('id, name');
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching medications', description: error.message });
    } else {
      setMedications(data);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeywords();
      fetchMedications();
    }
  }, [isOpen]);

  const handleSaveKeyword = async () => {
    const keywordsArray = newKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);
    if (keywordsArray.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid input', description: 'Please provide at least one keyword.' });
      return;
    }

    try {
      if (editingKeyword) {
        const payload = { keywords: keywordsArray, medication_ids: selectedMeds, advice, advice_te: adviceTe, investigations, followup, followup_te: followupTe };
        const { error } = await supabase.functions.invoke('update-autofill-keyword', {
          body: { id: editingKeyword.id, payload },
        });
        if (error) throw error;
      } else {
        const selectedMedicationObjects = selectedMeds.map(id => {
          const med = medications.find(m => m.id === id);
          return { id: med?.id, name: med?.name };
        });

        const { error } = await supabase.functions.invoke('save-autofill-bundle', {
          body: {
            keywords: keywordsArray,
            medications: selectedMedicationObjects,
            advice: advice,
            advice_te: adviceTe,
            investigations: investigations,
            followup: followup,
            followup_te: followupTe,
          },
        });
        if (error) throw error;
      }

      toast({ title: `Keyword ${editingKeyword ? 'updated' : 'added'} successfully` });
      setNewKeywords('');
      setSelectedMeds([]);
      setAdvice('');
      setAdviceTe('');
      setInvestigations('');
      setFollowup('');
      setFollowupTe('');
      setEditingKeyword(null);
      fetchKeywords();

    } catch (error) {
      toast({ variant: 'destructive', title: `Error ${editingKeyword ? 'updating' : 'adding'} keyword`, description: (error as Error).message });
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    try {
      const { error } = await supabase.functions.invoke('delete-autofill-keyword', {
        body: { id },
      });
      if (error) throw error;
      toast({ title: 'Keyword deleted successfully' });
      fetchKeywords();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error deleting keyword', description: (error as Error).message });
    }
  };


  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setNewKeywords(keyword.keywords.join(', '));
    setSelectedMeds(keyword.medication_ids);
    setAdvice(keyword.advice || '');
    setAdviceTe(keyword.advice_te || '');
    setInvestigations(keyword.investigations || '');
    setFollowup(keyword.followup || '');
    setFollowupTe(keyword.followup_te || '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Autofill Keywords</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{editingKeyword ? 'Edit' : 'Add New'} Keyword</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-keywords">Keywords (comma-separated)</Label>
                <Input id="new-keywords" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} placeholder="e.g., fever, headache" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Medications</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search meds..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-40 pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {medications
                    .filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(med => (
                      <div key={med.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`med-${med.id}`}
                          checked={selectedMeds.includes(med.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMeds(prev => [...prev, med.id]);
                            } else {
                              setSelectedMeds(prev => prev.filter(id => id !== med.id));
                            }
                          }}
                        />
                        <Label htmlFor={`med-${med.id}`}>{med.name}</Label>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advice">Advice</Label>
              <Textarea id="advice" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="e.g., Drink plenty of fluids" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advice-te">Advice (Telugu)</Label>
              <Textarea id="advice-te" value={adviceTe} onChange={(e) => setAdviceTe(e.target.value)} placeholder="e.g., Drink plenty of fluids" disabled={isTranslating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investigations">Investigations</Label>
              <Textarea id="investigations" value={investigations} onChange={(e) => setInvestigations(e.target.value)} placeholder="e.g., X-ray, Blood Test" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup">Follow-up</Label>
              <Textarea id="followup" value={followup} onChange={(e) => setFollowup(e.target.value)} placeholder="e.g., Review after 1 week" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-te">Follow-up (Telugu)</Label>
              <Textarea id="followup-te" value={followupTe} onChange={(e) => setFollowupTe(e.target.value)} placeholder="e.g., Review after 1 week" disabled={isTranslating} />
            </div>
            <Button onClick={handleSaveKeyword} size="sm">
              {editingKeyword ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingKeyword ? 'Save Changes' : 'Add Keyword'}
            </Button>
            {editingKeyword && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingKeyword(null); setNewKeywords(''); setSelectedMeds([]); setAdvice(''); setAdviceTe(''); setInvestigations(''); setFollowup(''); setFollowupTe(''); }}>
                Cancel Edit
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Existing Keywords</h3>
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {keywords.map(kw => (
                  <div key={kw.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-semibold">{(kw.keywords || []).join(', ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Meds: {(kw.medication_ids || []).map(id => medications.find(m => m.id === id)?.name).join(', ')}
                      </p>
                      {kw.advice && <p className="text-sm text-muted-foreground mt-1">Advice: {kw.advice}</p>}
                      {kw.investigations && <p className="text-sm text-muted-foreground mt-1">Investigations: {kw.investigations}</p>}
                      {kw.followup && <p className="text-sm text-muted-foreground mt-1">Follow-up: {kw.followup}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(kw)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteKeyword(kw.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeywordManagementModal;
