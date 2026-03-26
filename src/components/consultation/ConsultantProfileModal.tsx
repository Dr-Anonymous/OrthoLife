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
import { Loader2, Plus, Trash2, Save, User, MapPin, Award, Stethoscope, Mail, Phone, FileSignature, ShieldCheck, Image as ImageIcon, UserCog, Globe, ListChecks, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ConsultantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsultantProfileModal: React.FC<ConsultantProfileModalProps> = ({ isOpen, onClose }) => {
  const { consultant, refreshConsultant } = useConsultant();
  const { refreshHospitals } = useHospitals();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Profile State
  const [formData, setFormData] = useState({
    name: consultant?.name || { en: '', te: '' },
    phone: consultant?.phone || '',
    qualifications: consultant?.qualifications || { en: '', te: '' },
    specialization: consultant?.specialization || { en: '', te: '' },
    address: consultant?.address || { en: '', te: '' },
    experience: (consultant as any)?.experience || { en: '', te: '' },
    email: consultant?.email || '',
    photo_url: consultant?.photo_url || '',
    sign_url: consultant?.sign_url || '',
    seal_url: consultant?.seal_url || '',
    bio: consultant?.bio || { en: '', te: '' },
    services: consultant?.services || [],
  });

  // Locations State (fetched separately for editing)
  const [editableHospitals, setEditableHospitals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && consultant) {
      setFormData({
        name: consultant.name || { en: '', te: '' },
        phone: consultant.phone,
        qualifications: consultant.qualifications || { en: '', te: '' },
        specialization: consultant.specialization || { en: '', te: '' },
        address: consultant.address || { en: '', te: '' },
        experience: (consultant as any).experience || { en: '', te: '' },
        email: consultant.email || '',
        photo_url: consultant.photo_url || '',
        sign_url: consultant.sign_url || '',
        seal_url: consultant.seal_url || '',
        bio: consultant.bio || { en: '', te: '' },
        services: consultant.services || [],
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
          phone: formData.phone,
          qualifications: formData.qualifications,
          specialization: formData.specialization,
          address: formData.address,
          experience: formData.experience,
          email: formData.email,
          photo_url: formData.photo_url,
          sign_url: formData.sign_url,
          seal_url: formData.seal_url,
          bio: formData.bio,
          services: formData.services,
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

  // --- Location Management (Local Only) ---
  const handleAddLocationUI = () => {
    if (!consultant) return;
    const tempId = `temp_${Date.now()}`;
    const newHospital = {
      id: tempId,
      name: 'New Clinic/Hospital',
      consultant_id: consultant.id,
      logo_url: '/logo.png',
      lat: 17.3850,
      lng: 78.4867,
      is_new: true,
      settings: { op_fees: 0, free_visit_duration_days: 14 }
    };
    setEditableHospitals(prev => [...prev, newHospital]);
  };

  const handleUpdateHospitalUI = (id: string, updates: any) => {
    setEditableHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleDeleteHospitalUI = async (id: string) => {
    if (typeof id === 'string' && id.startsWith('temp_')) {
        setEditableHospitals(prev => prev.filter(h => h.id !== id));
        return;
    }

    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      setEditableHospitals(prev => prev.filter(h => h.id !== id));
      toast({ title: 'Location Removed from DB' });
      await refreshHospitals();
    }
  };

  const handleSaveAllLocations = async () => {
    setIsSaving(true);
    try {
      for (const hospital of editableHospitals) {
        const { id, is_new, ...data } = hospital;
        if (is_new) {
          const { error } = await supabase.from('hospitals').insert(data);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('hospitals').update(data).eq('id', id);
          if (error) throw error;
        }
      }
      toast({ title: 'Success', description: 'All location changes saved successfully.' });
      await fetchConsultantHospitals();
      await refreshHospitals();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      toast({ title: 'Logged Out', description: 'Consultant session ended.' });
      navigate('/auth?login=doctor');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Logout Failed', description: err.message });
    }
  };

  // --- Services Management ---
  const addService = () => {
    setFormData(prev => ({
        ...prev,
        services: [...prev.services, { title: { en: '', te: '' }, description: { en: '', te: '' }, icon: 'Bone' }]
    }));
  };

  const updateService = (index: number, field: string, value: string, lang?: 'en' | 'te') => {
    const newServices = [...formData.services];
    // Cast to any to handle dynamic keys safely
    const currentService = newServices[index] as any;
    if (lang && (field === 'title' || field === 'description')) {
        currentService[field][lang] = value;
    } else {
        currentService[field] = value;
    }
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const deleteService = (index: number) => {
    setFormData(prev => ({
        ...prev,
        services: prev.services.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              My Professional Profile
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold border border-destructive/20"
                onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
          </DialogTitle>
          <DialogDescription>
            Manage your credentials, professional bio, and practice locations.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col mt-4 overflow-hidden">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile & Credentials</TabsTrigger>
              <TabsTrigger value="locations">Practice Locations</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow">
            <TabsContent value="profile" className="p-6 space-y-8 m-0 outline-none">
              <form onSubmit={handeProfileSubmit} className="space-y-8">
                {/* Contact Info (Permanent) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Login)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="pl-9" placeholder="9866812555" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="pl-9" placeholder="info@ortho.life" />
                    </div>
                  </div>
                </div>

                {/* English Profile Section */}
                <div className="space-y-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
                    <Globe className="w-4 h-4" /> English Professional Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name_en">Full Name (English)</Label>
                      <Input id="name_en" value={formData.name.en} onChange={e => setFormData(prev => ({ ...prev, name: { ...prev.name, en: e.target.value } }))} placeholder="Dr. Samuel Manoj" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quals_en">Qualifications (English)</Label>
                      <Input id="quals_en" value={formData.qualifications.en} onChange={e => setFormData(prev => ({ ...prev, qualifications: { ...prev.qualifications, en: e.target.value } }))} placeholder="MBBS, MS Ortho (Manipal)" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spec_en">Primary Specialization (English)</Label>
                      <Input id="spec_en" value={formData.specialization.en} onChange={e => setFormData(prev => ({ ...prev, specialization: { ...prev.specialization, en: e.target.value } }))} placeholder="Orthopaedic Surgeon" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp_en">Experience Tagline (English)</Label>
                      <Input id="exp_en" value={formData.experience.en} onChange={e => setFormData(prev => ({ ...prev, experience: { ...prev.experience, en: e.target.value } }))} placeholder="8+ years and 5000+ surgeries experience" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr_en">Complete Address (English)</Label>
                    <Textarea 
                      id="addr_en" 
                      className="h-20" 
                      value={formData.address.en} 
                      onChange={e => setFormData(prev => ({ ...prev, address: { ...prev.address, en: e.target.value } }))}
                      placeholder="OrthoLife, Kakinada..."
                    />
                  </div>
                </div>

                {/* Telugu Profile Section */}
                <div className="space-y-6 pt-6 border-t bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary-light uppercase tracking-wider">
                    <Globe className="w-4 h-4" /> Telugu Professional Identity / తెలుగు వివరాలు
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name_te">Full Name (Telugu)</Label>
                      <Input id="name_te" value={formData.name.te} onChange={e => setFormData(prev => ({ ...prev, name: { ...prev.name, te: e.target.value } }))} placeholder="డాక్టర్ మనోజ్ గారు" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quals_te">Qualifications (Telugu)</Label>
                      <Input id="quals_te" value={formData.qualifications.te} onChange={e => setFormData(prev => ({ ...prev, qualifications: { ...prev.qualifications, te: e.target.value } }))} placeholder="MBBS, MS Ortho (మణిపాల్)" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spec_te">Primary Specialization (Telugu)</Label>
                      <Input id="spec_te" value={formData.specialization.te} onChange={e => setFormData(prev => ({ ...prev, specialization: { ...prev.specialization, te: e.target.value } }))} placeholder="ఆర్థోపెడిక్ సర్జన్" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp_te">Experience Tagline (Telugu)</Label>
                      <Input id="exp_te" value={formData.experience.te} onChange={e => setFormData(prev => ({ ...prev, experience: { ...prev.experience, te: e.target.value } }))} placeholder="8+ ఏళ్ల అనుభవం..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr_te">Complete Address (Telugu)</Label>
                    <Textarea 
                      id="addr_te" 
                      className="h-20" 
                      value={formData.address.te} 
                      onChange={e => setFormData(prev => ({ ...prev, address: { ...prev.address, te: e.target.value } }))}
                      placeholder="ఆర్థోలైఫ్, రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్..."
                    />
                  </div>
                </div>

                {/* Biography Section */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Professional Biography</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Bio (English)</Label>
                            <Textarea 
                                className="h-32 text-sm leading-relaxed" 
                                value={formData.bio.en} 
                                onChange={e => setFormData(prev => ({ ...prev, bio: { ...prev.bio, en: e.target.value } }))}
                                placeholder="Write your professional bio in English..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bio (Telugu / తెలుగు)</Label>
                            <Textarea 
                                className="h-32 text-sm leading-relaxed" 
                                value={formData.bio.te} 
                                onChange={e => setFormData(prev => ({ ...prev, bio: { ...prev.bio, te: e.target.value } }))}
                                placeholder="మీ వృత్తిపరమైన వివరాలను తెలుగులో వ్రాయండి..."
                            />
                        </div>
                    </div>
                </div>

                {/* Services Section */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Specializations & Services</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addService}><Plus className="w-4 h-4 mr-1" /> Add Service</Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {formData.services.map((service: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4 bg-secondary/5 relative group">
                                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteService(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Title (EN)</Label>
                                            <Input value={service.title.en} onChange={e => updateService(idx, 'title', e.target.value, 'en')} className="h-8 text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Title (TE)</Label>
                                            <Input value={service.title.te} onChange={e => updateService(idx, 'title', e.target.value, 'te')} className="h-8 text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Description (EN)</Label>
                                            <Input value={service.description.en} onChange={e => updateService(idx, 'description', e.target.value, 'en')} className="h-8 text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Description (TE)</Label>
                                            <Input value={service.description.te} onChange={e => updateService(idx, 'description', e.target.value, 'te')} className="h-8 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assets Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold">Digital Assets (Sign, Seal, Photo)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Profile Photo</Label>
                      <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                        {formData.photo_url ? <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-muted-foreground/30" />}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Upload New</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'photo')} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><FileSignature className="w-4 h-4" /> Digital Signature</Label>
                      <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                        {formData.sign_url ? <img src={formData.sign_url} alt="Signature" className="max-w-full max-h-full object-contain" /> : <FileSignature className="w-12 h-12 text-muted-foreground/30" />}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Upload New</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'sign')} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Official Seal</Label>
                      <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                        {formData.seal_url ? <img src={formData.seal_url} alt="Seal" className="max-w-full max-h-full object-contain" /> : <ShieldCheck className="w-12 h-12 text-muted-foreground/30" />}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Upload New</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'seal')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t sticky bottom-0 bg-background/95 backdrop-blur py-4 z-10">
                  <Button type="submit" disabled={isSaving || isUploading} className="w-full md:w-auto">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save All Profile Changes
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="locations" className="p-6 space-y-6 m-0 outline-none">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Practice Locations
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddLocationUI}>
                  <Plus className="w-4 h-4 mr-1" /> Add Location
                </Button>
              </div>

              <div className="space-y-6">
                {editableHospitals.map((hospital) => (
                  <div key={hospital.id} className="border rounded-xl p-6 space-y-6 bg-secondary/5 relative group">
                    <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteHospitalUI(hospital.id)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Location Name</Label><Input value={hospital.name} onChange={e => handleUpdateHospitalUI(hospital.id, { name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Logo URL / Path</Label><Input value={hospital.logo_url} onChange={e => handleUpdateHospitalUI(hospital.id, { logo_url: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       <div className="space-y-2"><Label>OP Fees (₹)</Label><Input type="number" value={hospital.settings?.op_fees || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, op_fees: parseInt(e.target.value) }})} /></div>
                       <div className="space-y-2"><Label>Free Visit (Days)</Label><Input type="number" value={hospital.settings?.free_visit_duration_days || 14} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, free_visit_duration_days: parseInt(e.target.value) }})} /></div>
                       <div className="space-y-2"><Label>Lat</Label><Input type="number" step="any" value={hospital.lat || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lat: parseFloat(e.target.value) })} /></div>
                       <div className="space-y-2"><Label>Lng</Label><Input type="number" step="any" value={hospital.lng || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lng: parseFloat(e.target.value) })} /></div>
                    </div>
                  </div>
                ))}
                
                {editableHospitals.length > 0 && (
                    <div className="flex justify-end pt-6 sticky bottom-0 bg-background/95 backdrop-blur py-4 z-10">
                        <Button type="button" onClick={handleSaveAllLocations} disabled={isSaving} className="w-full md:w-auto bg-primary text-primary-foreground shadow-lg">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save All Location Changes
                        </Button>
                    </div>
                )}

                {editableHospitals.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl"><MapPin className="w-12 h-12 text-muted-foreground/20 mx-auto" /><p className="mt-2 text-muted-foreground">No practice locations added yet.</p></div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
