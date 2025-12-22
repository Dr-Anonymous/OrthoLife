import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Plus, Edit, Save } from 'lucide-react';

interface TextShortcut {
  id: string;
  shortcut: string;
  expansion: string;
}

interface TextShortcutManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Callback to refresh shortcuts in the parent component
}

/**
 * TextShortcutManagementModal Component
 * 
 * CRUD interface for text expansion shortcuts (e.g., "ra" -> "Rheumatoid Arthritis").
 * Features:
 * - Add/Edit/Delete shortcuts.
 * - Used globally across text areas in the application.
 */
const TextShortcutManagementModal: React.FC<TextShortcutManagementModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [shortcuts, setShortcuts] = useState<TextShortcut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({ shortcut: '', expansion: '' });
  const [editingShortcut, setEditingShortcut] = useState<TextShortcut | null>(null);

  const fetchShortcuts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('text_shortcuts')
      .select('*')
      .order('shortcut', { ascending: true });

    if (error) {
      toast.error('Error fetching shortcuts', { description: error.message });
    } else {
      setShortcuts(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchShortcuts();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = () => {
    setEditingShortcut(null);
    setFormState({ shortcut: '', expansion: '' });
  };

  const handleSaveShortcut = async () => {
    if (!formState.shortcut.trim() || !formState.expansion.trim()) {
      toast.error('Invalid input', { description: 'Please provide both a shortcut and an expansion.' });
      return;
    }

    setIsSaving(true);

    try {
      let error;
      if (editingShortcut) {
        // Update existing shortcut
        ({ error } = await supabase
          .from('text_shortcuts')
          .update({ shortcut: formState.shortcut.trim(), expansion: formState.expansion.trim() })
          .eq('id', editingShortcut.id));
      } else {
        // Create new shortcut
        ({ error } = await supabase
          .from('text_shortcuts')
          .insert({ shortcut: formState.shortcut.trim(), expansion: formState.expansion.trim() }));
      }

      if (error) throw error;

      toast.success(`Shortcut ${editingShortcut ? 'updated' : 'added'} successfully`);
      resetForm();
      fetchShortcuts(); // Refresh the list
      onUpdate(); // Notify parent component to refresh

    } catch (error: any) {
      toast.error(`Error ${editingShortcut ? 'updating' : 'adding'} shortcut`, { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShortcut = async (id: string) => {
    try {
      const { error } = await supabase
        .from('text_shortcuts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Shortcut deleted successfully');
      fetchShortcuts(); // Refresh the list
      onUpdate(); // Notify parent component to refresh
      if (editingShortcut?.id === id) {
        resetForm();
      }
    } catch (error: any) {
      toast.error('Error deleting shortcut', { description: error.message });
    }
  };

  const handleEdit = (shortcut: TextShortcut) => {
    setEditingShortcut(shortcut);
    setFormState({ shortcut: shortcut.shortcut, expansion: shortcut.expansion });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Text Shortcuts</DialogTitle>
          <DialogDescription>
            Create and manage shortcuts that expand into full text in the Complaints and Diagnosis fields.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">{editingShortcut ? 'Edit Shortcut' : 'Add New Shortcut'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut (e.g., "ra")</Label>
                <Input id="shortcut" value={formState.shortcut} onChange={handleInputChange} placeholder="ra" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expansion">Expansion (e.g., "Rheumatoid Arthritis")</Label>
                <Input id="expansion" value={formState.expansion} onChange={handleInputChange} placeholder="Rheumatoid Arthritis" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveShortcut} size="sm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingShortcut ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingShortcut ? 'Save Changes' : 'Add Shortcut'}
              </Button>
              {editingShortcut && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Existing Shortcuts</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                {shortcuts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No shortcuts found.</p>}
                {shortcuts.map(sc => (
                  <div key={sc.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-semibold">{sc.shortcut}</p>
                      <p className="text-sm text-muted-foreground">{sc.expansion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(sc)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteShortcut(sc.id)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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

export default TextShortcutManagementModal;