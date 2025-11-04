import React, { useState } from 'react';
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
}

interface SaveBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  advice: string;
}

const SaveBundleModal: React.FC<SaveBundleModalProps> = ({ isOpen, onClose, medications, advice }) => {
  const [keywords, setKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
          medications,
          advice,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Prescription Bundle</DialogTitle>
          <DialogDescription>
            Save the current set of medications and advice as a reusable bundle.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Medications in this bundle:</h4>
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              {medications.map(med => <li key={med.id}>{med.name}</li>)}
            </ul>
          </div>
          {advice && (
            <div>
              <h4 className="font-medium mb-2">Advice in this bundle:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{advice}</p>
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
