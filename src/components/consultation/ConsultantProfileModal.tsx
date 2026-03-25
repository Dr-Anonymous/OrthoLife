import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultant } from '@/context/ConsultantContext';
import { useHospitals } from '@/context/HospitalsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, User, MapPin, Award, Stethoscope, Mail, Phone, FileSignature, ShieldCheck, Image as ImageIcon, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsultantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsultantProfileModal: React.FC<ConsultantProfileModalProps> = ({ isOpen, onClose }) => {
  const { consultant, refreshConsultant } = useConsultant();
  const { hospitals } = useHospitals();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Profile State
  const [formData, setFormData] = useState({
    name: consultant?.name || '',
    qualifications: consultant?.qualifications || '',
    specialization: consultant?.specialization || '',
    email: consultant?.email || '',
    photo_url: consultant?.photo_url || '',
    sign_url: consultant?.sign_url || '',
    seal_url: consultant?.seal_url || '',
  });

  // Locations State (fetched separately for editing)
  const [editableHospitals, setEditableHospitals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && consultant) {
      setFormData({
        name: consultant.name,
        qualifications: consultant.qualifications || '',
        specialization: consultant.specialization || '',
        email: consultant.email || '',
        photo_url: consultant.photo_url || '',
        sign_url: consultant.sign_url || '',
        seal_url: consultant.seal_url || '',
      });
      fetchConsultantHospitals();
    }
  }, [isOpen, consultant]);

  const fetchConsultantHospitals = async () => {
    if (!consultant) return;
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('consultant_id', consultant.id);
    
    if (data) setEditableHospitals(data);
  };

  const handeProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultant) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('consultants')
        .update({
          name: formData.name,
          qualifications: formData.qualifications,
          specialization: formData.specialization,
          email: formData.email,
          photo_url: formData.photo_url,
          sign_url: formData.sign_url,
          seal_url: formData.seal_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', consultant.id);

      if (error) throw error;
      
      await refreshConsultant();
      toast({ title: 'Profile Updated', description: 'Your professional profile has been saved successfully.' });
    } catch (err: any) {
      console.error('Update error:', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'sign' | 'seal') => {
    if (!consultant) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${consultant.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `consultants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('consultant-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('consultant-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [`${type}_url`]: publicUrl }));
      toast({ title: 'Upload Successful', description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully.` });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!consultant) return;

    const newHospital = {
      name: 'New Clinic/Hospital',
      consultant_id: consultant.id,
      logo_url: '/logo.png',
      lat: 17.3850,
      lng: 78.4867,
      settings: { op_fees: 0, free_visit_duration_days: 14 }
    };

    const { data, error } = await supabase
      .from('hospitals')
      .insert(newHospital)
      .select()
      .single();

    if (data) setEditableHospitals(prev => [...prev, data]);
    if (error) toast({ variant: 'destructive', title: 'Failed to add location', description: error.message });
  };

  const handleUpdateHospital = async (id: string, updates: any) => {
    const { error } = await supabase
      .from('hospitals')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } else {
      setEditableHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    }
  };

  const handleDeleteHospital = async (id: string) => {
    const { error } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      setEditableHospitals(prev => prev.filter(h => h.id !== id));
      toast({ title: 'Location Removed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            My Professional Profile
          </DialogTitle>
          <DialogDescription>
            Manage your credentials, clinic locations, and digital assets.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col mt-4">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile & Credentials</TabsTrigger>
              <TabsTrigger value="locations">Practice Locations</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow">
            <TabsContent value="profile" className="p-6 space-y-6 m-0">
              <form onSubmit={handeProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name (with Prefix)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-9"
                        placeholder="Dr. Samuel Manoj"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-9"
                        placeholder="info@ortho.life"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <div className="relative">
                      <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="qualifications"
                        value={formData.qualifications}
                        onChange={e => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                        className="pl-9"
                        placeholder="MBBS, MS Ortho"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization / Department</Label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="specialization"
                        value={formData.specialization}
                        onChange={e => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                        className="pl-9"
                        placeholder="Orthopaedic Surgeon"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Professional Photo
                    </Label>
                    <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground/30" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Upload</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'photo')} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <FileSignature className="w-4 h-4" /> Digital Signature
                    </Label>
                    <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                      {formData.sign_url ? (
                        <img src={formData.sign_url} alt="Signature" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <FileSignature className="w-12 h-12 text-muted-foreground/30" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Upload</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'sign')} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Official Seal
                    </Label>
                    <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                      {formData.seal_url ? (
                        <img src={formData.seal_url} alt="Seal" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <ShieldCheck className="w-12 h-12 text-muted-foreground/30" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Upload</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'seal')} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isSaving || isUploading}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="locations" className="p-6 space-y-6 m-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Practice Locations
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddLocation}>
                  <Plus className="w-4 h-4 mr-1" /> Add Location
                </Button>
              </div>

              <div className="space-y-4">
                {editableHospitals.map((hospital) => (
                  <div key={hospital.id} className="border rounded-xl p-4 space-y-4 bg-secondary/5 relative group">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteHospital(hospital.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Location Name</Label>
                        <Input 
                          value={hospital.name} 
                          onChange={e => handleUpdateHospital(hospital.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo URL / Path</Label>
                        <Input 
                          value={hospital.logo_url} 
                          onChange={e => handleUpdateHospital(hospital.id, { logo_url: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div className="space-y-2">
                        <Label>OP Fees (₹)</Label>
                        <Input 
                          type="number"
                          value={hospital.settings?.op_fees || 0} 
                          onChange={e => handleUpdateHospital(hospital.id, { 
                            settings: { ...hospital.settings, op_fees: parseInt(e.target.value) } 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Free Visit (Days)</Label>
                        <Input 
                          type="number"
                          value={hospital.settings?.free_visit_duration_days || 14} 
                          onChange={e => handleUpdateHospital(hospital.id, { 
                            settings: { ...hospital.settings, free_visit_duration_days: parseInt(e.target.value) } 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lat</Label>
                        <Input 
                          type="number" step="any"
                          value={hospital.lat || 0} 
                          onChange={e => handleUpdateHospital(hospital.id, { lat: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lng</Label>
                        <Input 
                          type="number" step="any"
                          value={hospital.lng || 0} 
                          onChange={e => handleUpdateHospital(hospital.id, { lng: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {editableHospitals.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <MapPin className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                    <p className="mt-2 text-muted-foreground">No practice locations added yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
