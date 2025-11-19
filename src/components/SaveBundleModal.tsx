import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
  instructions_te?: string;
  frequency_te?: string;
  notes_te?: string;
}

interface SaveBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  advice: string;
}

const SaveBundleModal: React.FC<SaveBundleModalProps> = ({ isOpen, onClose, medications, advice }) => {
  const [keywords, setKeywords] = useState('');
  const [adviceTe, setAdviceTe] = useState('');
  const [translatedMedications, setTranslatedMedications] = useState<Medication[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (isOpen && (advice || medications.length > 0)) {
      const translateAll = async () => {
        setIsTranslating(true);
        try {
          const translate = async (text: string) => {
            if (!text || !text.trim()) return '';
            const { data, error } = await supabase.functions.invoke('translate-content', {
              body: { text, targetLanguage: 'te' },
            });
            if (error) throw error;
            return data?.translatedText || '';
          };

          if (advice) {
            const translatedAdvice = await translate(advice);
            setAdviceTe(translatedAdvice);
          }

          const newTranslatedMedications = await Promise.all(
            medications.map(async (med) => ({
              ...med,
              instructions_te: await translate(med.instructions),
              frequency_te: await translate(med.frequency),
              notes_te: await translate(med.notes),
            }))
          );
          setTranslatedMedications(newTranslatedMedications);

        } catch (err) {
          console.error('Translation error:', err);
          toast({ variant: 'destructive', title: 'Translation Error', description: (err as Error).message });
        } finally {
          setIsTranslating(false);
        }
      };
      translateAll();
    }
  }, [isOpen, advice, medications]);

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    setTranslatedMedications(prev => {
      const newMeds = [...prev];
      newMeds[index][field] = value as never;
      return newMeds;
    });
  };

  const handleSave = async () => {
    const keywordsArray = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
    if (keywordsArray.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Keywords are required',
        description: 'Please enter at least one keyword for this bundle.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-autofill-bundle', {
        body: {
          keywords: keywordsArray,
          medications: translatedMedications,
          advice,
          advice_te: adviceTe,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Bundle Saved',
        description: 'The new prescription bundle has been saved successfully.',
      });
      setKeywords('');
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving bundle',
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Save as Prescription Bundle</DialogTitle>
          <DialogDescription>
            Save the current set of medications and advice as a reusable bundle.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Medications in this bundle:</h4>
            <div className="space-y-4">
              {translatedMedications.map((med, index) => (
                <div key={med.id} className="p-4 border rounded-md">
                  <h5 className="font-semibold">{med.name}</h5>
                  <div className="space-y-2 mt-2">
                    <Label htmlFor={`med-instructions-te-${index}`}>Instructions (Telugu)</Label>
                    <Input id={`med-instructions-te-${index}`} value={med.instructions_te} onChange={(e) => handleMedicationChange(index, 'instructions_te', e.target.value)} disabled={isTranslating} />
                  </div>
                  <div className="space-y-2 mt-2">
                    <Label htmlFor={`med-frequency-te-${index}`}>Frequency (Telugu)</Label>
                    <Input id={`med-frequency-te-${index}`} value={med.frequency_te} onChange={(e) => handleMedicationChange(index, 'frequency_te', e.target.value)} disabled={isTranslating} />
                  </div>
                  <div className="space-y-2 mt-2">
                    <Label htmlFor={`med-notes-te-${index}`}>Notes (Telugu)</Label>
                    <Input id={`med-notes-te-${index}`} value={med.notes_te} onChange={(e) => handleMedicationChange(index, 'notes_te', e.target.value)} disabled={isTranslating} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {advice && (
            <div>
              <h4 className="font-medium mb-2">Advice in this bundle:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{advice}</p>
            </div>
          )}
          {advice && (
            <div className="space-y-2">
              <Label htmlFor="bundle-advice-te">Advice in Telugu</Label>
              <Textarea
                id="bundle-advice-te"
                value={adviceTe}
                onChange={(e) => setAdviceTe(e.target.value)}
                placeholder="Telugu advice..."
                disabled={isTranslating}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="bundle-keywords">Keywords (comma-separated)</Label>
            <Textarea
              id="bundle-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., OA knee, post-op cleanup"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveBundleModal;
