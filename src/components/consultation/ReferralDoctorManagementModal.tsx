
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Edit, Save, Search } from 'lucide-react';

interface ReferralDoctor {
  id: number;
  name: string;
  specialization?: string;
  phone?: string;
  address?: string;
}

interface ReferralDoctorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void; // Optional callback to refresh the parent's list
}

/**
 * ReferralDoctorManagementModal Component
 * 
 * Manages the list of referral doctors available in the consultation system.
 * Features:
 * - List all referral doctors with search filtering.
 * - Add new referral doctors with name, specialty, and phone.
 * - Edit existing referral doctor details.
 * - Delete referral doctors.
 */
const ReferralDoctorManagementModal: React.FC<ReferralDoctorManagementModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [doctors, setDoctors] = useState<ReferralDoctor[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<ReferralDoctor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('referral_doctors')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error fetching doctors', 
        description: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setSpecialization('');
    setPhone('');
    setAddress('');
    setEditingDoctor(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Validation Error', 
        description: 'Doctor name is required.' 
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        specialization: specialization.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null
      };

      if (editingDoctor) {
        const { error } = await supabase
          .from('referral_doctors')
          .update(payload)
          .eq('id', editingDoctor.id);
        
        if (error) throw error;
        toast({ title: 'Doctor updated successfully' });
      } else {
        const { error } = await supabase
          .from('referral_doctors')
          .insert([payload]);
        
        if (error) throw error;
        toast({ title: 'Doctor added successfully' });
      }

      resetForm();
      fetchDoctors();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error saving doctor', 
        description: error.message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this referral doctor?')) return;

    try {
      const { error } = await supabase
        .from('referral_doctors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Doctor deleted successfully' });
      fetchDoctors();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error deleting doctor', 
        description: error.message 
      });
    }
  };

  const handleEdit = (doctor: ReferralDoctor) => {
    setEditingDoctor(doctor);
    setName(doctor.name || '');
    setSpecialization(doctor.specialization || '');
    setPhone(doctor.phone || '');
    setAddress(doctor.address || '');
    
    // Smooth scroll to top/form and focus name
    setTimeout(() => {
      nameInputRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doctor.specialization && doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doctor.address && doctor.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredDoctors.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % filteredDoctors.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + filteredDoctors.length) % filteredDoctors.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredDoctors[activeSuggestionIndex];
      if (selected) handleEdit(selected);
    }
  };

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Referral Doctors</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Form Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {editingDoctor ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingDoctor ? 'Edit Doctor Details' : 'Add New Referral Doctor'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Doctor Name *</Label>
                <Input 
                  id="doc-name" 
                  ref={nameInputRef}
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Dr. Smith" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-specialization">Specialization</Label>
                <Input 
                  id="doc-specialization" 
                  value={specialization} 
                  onChange={(e) => setSpecialization(e.target.value)} 
                  placeholder="e.g., Orthopedic Surgeon" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-phone">Phone Number</Label>
                <Input 
                  id="doc-phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="e.g., +91 9876543210" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="doc-address">Address</Label>
                <Input 
                  id="doc-address" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="e.g., Hospital Location, City" 
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              {editingDoctor && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} size="sm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingDoctor ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
              </Button>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Existing Referral Doctors</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-9 w-48 pl-8"
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredDoctors.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
                    No doctors found.
                  </p>
                ) : (
                  filteredDoctors.map((doctor, idx) => (
                    <div 
                      key={doctor.id} 
                      className={`flex items-center justify-between p-3 border rounded-md transition-colors ${idx === activeSuggestionIndex ? 'bg-primary/10 border-primary shadow-sm' : 'hover:bg-accent/10'}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doctor.name}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {doctor.specialization && <span>{doctor.specialization}</span>}
                          {doctor.phone && <span>{doctor.phone}</span>}
                          {doctor.address && <span>{doctor.address}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(doctor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doctor.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDoctorManagementModal;
