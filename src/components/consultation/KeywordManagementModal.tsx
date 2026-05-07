import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Edit, Save, Search } from 'lucide-react';
import { normalizeSearchText } from '@/lib/utils';

interface Keyword {
  id: number;
  keywords: string[];
  medication_ids: number[];
  advice?: string;
  advice_te?: string;
  investigations?: string;
  followup?: string;
  followup_te?: string;
  orthotics?: string;
  orthotics_te?: string;
}

interface Medication {
  id: number;
  composition: string;
  brand_metadata?: { name: string }[];
}

export interface KeywordPrefillData {
  medications?: { composition: string }[];
  advice?: string;
  advice_te?: string;
  investigations?: string;
  followup?: string;
  followup_te?: string;
  orthotics?: string;
  orthotics_te?: string;
}

interface KeywordManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledData?: KeywordPrefillData | null;
  consultantId?: string | number;
}

/**
 * KeywordManagementModal Component
 * 
 * Manages "Autofill Keywords" (bundles/protocols).
 * Features:
 * - Create/Edit protocols that trigger on specific keywords.
 * - Associate medications, advice, investigations, and follow-up with keywords.
 * - "Save as Bundle" functionality pre-filled from current consultation data.
 * - Supports Telugu translation for advice/follow-up.
 */
const KeywordManagementModal: React.FC<KeywordManagementModalProps> = ({ isOpen, onClose, prefilledData, consultantId }) => {
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
  const [orthotics, setOrthotics] = useState('');
  const [orthoticsTe, setOrthoticsTe] = useState('');
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const displayedMeds = React.useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    let filtered = medications.filter(med =>
      normalizeSearchText(med.composition).includes(normalizedQuery) ||
      (med.brand_metadata || []).some(b => normalizeSearchText(b.name).includes(normalizedQuery))
    );

    return filtered.sort((a, b) => {
      const aSelected = selectedMeds.includes(a.id);
      const bSelected = selectedMeds.includes(b.id);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      return a.composition.localeCompare(b.composition);
    });
  }, [medications, searchQuery, selectedMeds]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (displayedMeds.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % displayedMeds.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + displayedMeds.length) % displayedMeds.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeMed = displayedMeds[activeSuggestionIndex];
      if (activeMed) {
        const id = activeMed.id;
        setSelectedMeds(prev => {
          if (prev.includes(id)) {
            return prev.filter(mid => mid !== id);
          } else {
            return [...prev, id];
          }
        });
      }
    }
  };

  const fetchKeywords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('autofill_keywords').select('*').eq('consultant_id', consultantId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching keywords', description: error.message });
    } else {
      setKeywords(data);
    }
    setIsLoading(false);
  };

  const fetchMedications = async () => {
    const { data, error } = await supabase.from('saved_medications').select('id, composition, brand_metadata');
    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching medications', description: error.message });
    } else {
      setMedications(data || []);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeywords();
      fetchMedications();

      // Handle Prefill
      if (prefilledData) {
        setEditingKeyword(null); // Ensure we are in "Add New" mode
        setNewKeywords('');

        if (prefilledData.advice) setAdvice(prefilledData.advice);
        if (prefilledData.advice_te) setAdviceTe(prefilledData.advice_te);
        if (prefilledData.investigations) setInvestigations(prefilledData.investigations);
        if (prefilledData.followup) setFollowup(prefilledData.followup);
        if (prefilledData.followup_te) setFollowupTe(prefilledData.followup_te);
        if (prefilledData.orthotics) setOrthotics(prefilledData.orthotics);
        if (prefilledData.orthotics_te) setOrthoticsTe(prefilledData.orthotics_te);
      }
    }
  }, [isOpen]);

  const hasPrefilledRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasPrefilledRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && prefilledData && medications.length > 0 && !hasPrefilledRef.current) {
      const prefilledNames = prefilledData.medications?.map(m => m.composition.toLowerCase()) || [];
      const matchedIds = medications
        .filter(m => prefilledNames.includes(m.composition.toLowerCase()))
        .map(m => m.id);

      setSelectedMeds(matchedIds);
      hasPrefilledRef.current = true;
    }
  }, [isOpen, prefilledData, medications]);


  const handleSaveKeyword = async () => {
    const keywordsArray = newKeywords.split(',').map(kw => kw.trim().toLowerCase()).filter(Boolean);
    if (keywordsArray.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid input', description: 'Please provide at least one keyword.' });
      return;
    }

    try {
      if (editingKeyword) {
        const payload = {
          keywords: keywordsArray,
          medication_ids: selectedMeds,
          advice,
          advice_te: adviceTe,
          investigations,
          followup,
          followup_te: followupTe,
          orthotics,
          orthotics_te: orthoticsTe
        };
        const { error } = await supabase.functions.invoke('update-autofill-keyword', {
          body: { id: editingKeyword.id, payload },
        });
        if (error) throw error;
      } else {
        const selectedMedicationObjects = selectedMeds.map(id => {
          const med = medications.find(m => m.id === id);
          return { id: med?.id, composition: med?.composition };
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
            orthotics: orthotics,
            orthotics_te: orthoticsTe,
            consultant_id: consultantId
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
      setOrthotics('');
      setOrthoticsTe('');
      setEditingKeyword(null);
      fetchKeywords();

    } catch (error) {
      toast({ variant: 'destructive', title: `Error ${editingKeyword ? 'updating' : 'adding'} keyword`, description: (error as Error).message });
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this clinical protocol?')) return;
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
    setOrthotics(keyword.orthotics || '');
    setOrthoticsTe(keyword.orthotics_te || '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Keyword-Based Protocols</DialogTitle>
          <DialogDescription>
            Automatically populate medications and advice based on complaints, diagnosis or procedure names. When you type matching keywords, relevant clinical protocols will be suggested for one-click entry.
          </DialogDescription>
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
                      onKeyDown={handleKeyDown}
                      className="h-8 w-40 pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {displayedMeds.map((med, idx) => (
                    <div
                      key={med.id}
                      className={`flex items-center gap-2 p-1 rounded-sm transition-colors ${idx === activeSuggestionIndex ? 'bg-primary/10' : ''}`}
                    >
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
                      <Label htmlFor={`med-${med.id}`} className="cursor-pointer">
                        <div className="font-medium">{med.composition}</div>
                        {(med.brand_metadata || []).length > 0 && (
                          <div className="text-[10px] text-muted-foreground leading-tight">
                            {(med.brand_metadata || []).map(b => b.name).join(', ')}
                          </div>
                        )}
                      </Label>
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
              <Textarea
                id="advice-te"
                value={adviceTe}
                onChange={(e) => setAdviceTe(e.target.value)}
                placeholder="e.g., Drink plenty of fluids"
              />
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
              <Textarea
                id="followup-te"
                value={followupTe}
                onChange={(e) => setFollowupTe(e.target.value)}
                placeholder="e.g., Review after 1 week"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orthotics">Braces / Splints / Plaster (Orthotics)</Label>
              <Textarea
                id="orthotics"
                value={orthotics}
                onChange={(e) => setOrthotics(e.target.value)}
                placeholder="e.g., Apply forearm Splint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orthotics-te">Orthotics (Telugu)</Label>
              <Textarea
                id="orthotics-te"
                value={orthoticsTe}
                onChange={(e) => setOrthoticsTe(e.target.value)}
                placeholder="e.g., forearm స్ప్లింట్ వేయండి"
              />
            </div>
            <Button onClick={handleSaveKeyword} size="sm">
              {editingKeyword ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingKeyword ? 'Save Changes' : 'Add Keyword'}
            </Button>
            {editingKeyword && (
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingKeyword(null);
                setNewKeywords('');
                setSelectedMeds([]);
                setAdvice('');
                setAdviceTe('');
                setInvestigations('');
                setFollowup('');
                setFollowupTe('');
                setOrthotics('');
                setOrthoticsTe('');
              }}>
                Cancel Edit
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Existing Keywords</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search protocols..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="h-9 w-48 pl-8"
                />
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                {keywords.filter(kw => {
                  const query = normalizeSearchText(listSearchQuery);
                  if (!query) return true;
                  
                  const hasKeywordMatch = (kw.keywords || []).some(k => normalizeSearchText(k).includes(query));
                  const hasAdviceMatch = normalizeSearchText(kw.advice).includes(query) || normalizeSearchText(kw.advice_te).includes(query);
                  const hasMedMatch = (kw.medication_ids || []).some(id => {
                    const med = medications.find(m => m.id === id);
                    const hasCompMatch = normalizeSearchText(med?.composition).includes(query);
                    const hasBrandMatch = (med?.brand_metadata || []).some(b => normalizeSearchText(b.name).includes(query));
                    return hasCompMatch || hasBrandMatch;
                  });
                  const hasInvestMatch = normalizeSearchText(kw.investigations).includes(query);
                  const hasFollowupMatch = normalizeSearchText(kw.followup).includes(query) || normalizeSearchText(kw.followup_te).includes(query);
                  const hasOrthoticsMatch = normalizeSearchText(kw.orthotics).includes(query) || normalizeSearchText(kw.orthotics_te).includes(query);

                  return hasKeywordMatch || hasAdviceMatch || hasMedMatch || hasInvestMatch || hasFollowupMatch || hasOrthoticsMatch;
                }).map(kw => (
                  <div key={kw.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-semibold">{(kw.keywords || []).join(', ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Meds: {(kw.medication_ids || []).map(id => {
                          const med = medications.find(m => m.id === id);
                          if (!med) return null;
                          const brandStr = (med.brand_metadata || []).length > 0 
                            ? ` (${med.brand_metadata?.map(b => b.name).join(', ')})` 
                            : '';
                          return med.composition + brandStr;
                        }).filter(Boolean).join(', ')}
                      </p>
                      {kw.advice && <p className="text-sm text-muted-foreground mt-1">Advice: {kw.advice}</p>}
                      {kw.investigations && <p className="text-sm text-muted-foreground mt-1">Investigations: {kw.investigations}</p>}
                      {kw.followup && <p className="text-sm text-muted-foreground mt-1">Follow-up: {kw.followup}</p>}
                      {kw.orthotics && <p className="text-sm text-muted-foreground mt-1">Orthotics: {kw.orthotics}</p>}
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
