import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Edit, Save } from 'lucide-react';

interface Keyword {
  id: number;
  keywords: string[];
  medication_ids: number[];
  advice?: string;
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
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);

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
    if (keywordsArray.length === 0 || selectedMeds.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid input', description: 'Please provide at least one keyword and select at least one medication.' });
      return;
    }

    const payload = { keywords: keywordsArray, medication_ids: selectedMeds, advice };

    let error;
    if (editingKeyword) {
      ({ error } = await supabase.from('autofill_keywords').update(payload).eq('id', editingKeyword.id));
    } else {
      ({ error } = await supabase.from('autofill_keywords').insert(payload));
    }

    if (error) {
      toast({ variant: 'destructive', title: `Error ${editingKeyword ? 'updating' : 'adding'} keyword`, description: error.message });
    } else {
      toast({ title: `Keyword ${editingKeyword ? 'updated' : 'added'} successfully` });
      setNewKeywords('');
      setSelectedMeds([]);
      setAdvice('');
      setEditingKeyword(null);
      fetchKeywords();
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    const { error } = await supabase.from('autofill_keywords').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error deleting keyword', description: error.message });
    } else {
      toast({ title: 'Keyword deleted successfully' });
      fetchKeywords();
    }
  };

  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setNewKeywords(keyword.keywords.join(', '));
    setSelectedMeds(keyword.medication_ids);
    setAdvice(keyword.advice || '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
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
                <Label>Medications</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {medications.map(med => (
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
            <Button onClick={handleSaveKeyword} size="sm">
              {editingKeyword ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingKeyword ? 'Save Changes' : 'Add Keyword'}
            </Button>
            {editingKeyword && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingKeyword(null); setNewKeywords(''); setSelectedMeds([]); setAdvice(''); }}>
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