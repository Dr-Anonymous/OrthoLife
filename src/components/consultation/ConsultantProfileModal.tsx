import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { compressImage } from '@/lib/image-utils';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, User, MapPin, Award, Stethoscope, Mail, Phone, FileSignature, ShieldCheck, Image as ImageIcon, UserCog, Globe, ListChecks, LogOut, Lock, Eye, EyeOff, Bone, Activity, Syringe, ChevronUp, ChevronDown, Heart, Brain, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('front');
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
    password: consultant?.password || '',
    reception_phone: (consultant as any)?.reception_phone || '',
    reception_password: (consultant as any)?.reception_password || '',
    profile_layout: consultant?.profile_layout || 'single',
    team_members: consultant?.team_members || [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showReceptionPassword, setShowReceptionPassword] = useState(false);

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
        password: consultant.password || '',
        reception_phone: (consultant as any).reception_phone || '',
        reception_password: (consultant as any).reception_password || '',
        profile_layout: consultant.profile_layout || 'single',
        team_members: consultant.team_members || [],
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
          services: formData.services.filter((s: any) => s.title?.en?.trim() || s.title?.te?.trim()),
          password: formData.password,
          reception_phone: formData.reception_phone,
          reception_password: formData.reception_password,
          profile_layout: formData.profile_layout,
          team_members: formData.team_members,
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
      // 1. Capture old URL for cleanup after successful upload
      const oldUrl = formData[`${type}_url` as keyof typeof formData] as string;

      // 2. Compress image before upload
      const compressionToastId = toast({
        title: 'Processing...',
        description: 'Optimizing image for better performance.'
      });

      const compressedFile = await compressImage(file, {
        maxSizeKB: 100,
        maxWidthOrHeight: 1024
      });

      compressionToastId.dismiss();

      // 3. Prepare upload
      const fileExt = file.name.split('.').pop();
      const fileName = `${consultant.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `consultants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('consultant-assets')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // 4. Get new public URL
      const { data: { publicUrl } } = supabase.storage
        .from('consultant-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [`${type}_url`]: publicUrl }));

      // 5. Cleanup old file NOW that new one is safe
      if (oldUrl && oldUrl.includes('consultant-assets/')) {
        const oldFileName = oldUrl.split('consultant-assets/').pop();
        if (oldFileName) {
          // Fire and forget cleanup - don't let it block completion
          supabase.storage.from('consultant-assets').remove([oldFileName]).catch(console.error);
        }
      }

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
      name: 'My Hospital',
      consultant_id: consultant.id,
      logo_url: '/logo.png',
      lat: 16.9836,
      lng: 82.2527,
      is_new: true,
      settings: { op_fees: 400, consultant_cut: 400, free_visit_duration_days: 14 }
    };
    setEditableHospitals(prev => [...prev, newHospital]);
  };

  const handleUpdateHospitalUI = (id: string, updates: any) => {
    setEditableHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleHospitalLogoUpload = async (file: File, hospitalId: string) => {
    if (!consultant) return;

    setIsUploading(true);
    try {
      const compressedFile = await compressImage(file, { maxSizeKB: 100, maxWidthOrHeight: 1024 });
      const fileExt = file.name.split('.').pop();
      const fileName = `${consultant.id}/hosp_${hospitalId.replace('temp_', '')}_${Date.now()}.${fileExt}`;
      const filePath = `consultants/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('consultant-assets').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('consultant-assets').getPublicUrl(filePath);

      handleUpdateHospitalUI(hospitalId, { logo_url: publicUrl });

      toast({ title: 'Upload Successful', description: 'Hospital logo updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
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
      // Reload on the same page to let the Gate take over
      window.location.reload();
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

  const moveService = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.services.length - 1) return;

    const newServices = [...formData.services];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newServices[index], newServices[targetIndex]] = [newServices[targetIndex], newServices[index]];

    setFormData(prev => ({ ...prev, services: newServices }));
  };

  // --- Team Management ---
  const addTeamMember = () => {
    if (formData.team_members.length >= 4) {
      toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can add up to 4 team members.' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      team_members: [
        ...prev.team_members,
        {
          name: { en: '', te: '' },
          qualifications: { en: '', te: '' },
          specialization: { en: '', te: '' }
        }
      ]
    }));
  };

  const updateTeamMember = (index: number, field: string, value: string, lang?: 'en' | 'te') => {
    const newMembers = [...formData.team_members];
    const member = newMembers[index] as any;
    if (lang) {
      member[field][lang] = value;
    } else {
      member[field] = value;
    }
    setFormData(prev => ({ ...prev, team_members: newMembers }));
  };

  const deleteTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const handleTeamPhotoUpload = async (file: File, index: number) => {
    if (!consultant) return;

    setIsUploading(true);
    try {
      const compressedFile = await compressImage(file, { maxSizeKB: 100, maxWidthOrHeight: 1024 });
      const fileExt = file.name.split('.').pop();
      const fileName = `${consultant.id}/team_${index}_${Date.now()}.${fileExt}`;
      const filePath = `consultants/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('consultant-assets').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('consultant-assets').getPublicUrl(filePath);

      const newMembers = [...formData.team_members];
      newMembers[index].photo_url = publicUrl;
      setFormData(prev => ({ ...prev, team_members: newMembers }));

      toast({ title: 'Upload Successful', description: 'Team member photo updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] md:max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            My Professional Profile
          </DialogTitle>
          <DialogDescription>
            Manage your credentials, professional bio, and practice locations.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col mt-4 overflow-hidden">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="front">Prescription Front</TabsTrigger>
              <TabsTrigger value="marketing">Marketing Page</TabsTrigger>
              <TabsTrigger value="locations">Practice Locations</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow">
            <TabsContent value="front" className="p-6 space-y-8 m-0 outline-none">
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
                  <div className="space-y-2">
                    <Label htmlFor="gate-password">Workspace Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="gate-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-9 pr-10"
                        placeholder="123456"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Used for workspace login. Recommended 6 digits.</p>
                  </div>
                </div>

                {/* Receptionist Access Section */}
                <div className="space-y-6 pt-6 border-t bg-secondary/10 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> Receptionist / Assistant Access
                  </h3>
                  <p className="text-xs text-muted-foreground -mt-4">
                    Allow staff to log in with their own phone number and password to book/manage consultations and followups for your profile.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reception_phone">Receptionist Phone (Login)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reception_phone"
                          value={formData.reception_phone}
                          onChange={e => setFormData(prev => ({ ...prev, reception_phone: e.target.value }))}
                          className="pl-9"
                          placeholder="Reception Phone Number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reception_password">Receptionist Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reception_password"
                          type={showReceptionPassword ? "text" : "password"}
                          value={formData.reception_password}
                          onChange={e => setFormData(prev => ({ ...prev, reception_password: e.target.value }))}
                          className="pl-9 pr-10"
                          placeholder="Default: 123456"
                          maxLength={10}
                        />
                        <button
                          type="button"
                          onClick={() => setShowReceptionPassword(!showReceptionPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground outline-none"
                        >
                          {showReceptionPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
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
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="name_en" value={formData.name.en} onChange={e => setFormData(prev => ({ ...prev, name: { ...prev.name, en: e.target.value } }))} className="pl-9" placeholder="Dr. Samuel Manoj" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quals_en">Qualifications (English)</Label>
                      <div className="relative">
                        <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="quals_en" value={formData.qualifications.en} onChange={e => setFormData(prev => ({ ...prev, qualifications: { ...prev.qualifications, en: e.target.value } }))} className="pl-9" placeholder="MBBS, MS Ortho (Manipal)" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spec_en">Primary Specialization (English)</Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="spec_en" value={formData.specialization.en} onChange={e => setFormData(prev => ({ ...prev, specialization: { ...prev.specialization, en: e.target.value } }))} className="pl-9" placeholder="Orthopaedic Surgeon" />
                      </div>
                    </div>
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
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="name_te" value={formData.name.te} onChange={e => setFormData(prev => ({ ...prev, name: { ...prev.name, te: e.target.value } }))} className="pl-9" placeholder="డాక్టర్ మనోజ్ గారు" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quals_te">Qualifications (Telugu)</Label>
                      <div className="relative">
                        <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="quals_te" value={formData.qualifications.te} onChange={e => setFormData(prev => ({ ...prev, qualifications: { ...prev.qualifications, te: e.target.value } }))} className="pl-9" placeholder="MBBS, MS Ortho (మణిపాల్)" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spec_te">Primary Specialization (Telugu)</Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="spec_te" value={formData.specialization.te} onChange={e => setFormData(prev => ({ ...prev, specialization: { ...prev.specialization, te: e.target.value } }))} className="pl-9" placeholder="ఆర్థోపెడిక్ సర్జన్" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Digital Assets (Front Page Only) */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold">Front Page Assets (Sign & Seal)</h3>
                    <p className="text-[10px] text-muted-foreground italic bg-secondary/10 px-2 py-0.5 rounded-full">
                      These appear on the bottom right of the prescription.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><FileSignature className="w-4 h-4" /> Digital Signature</Label>
                      <div className="border rounded-lg p-2 aspect-video flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                        {formData.sign_url ? <img src={formData.sign_url} alt="Signature" className="max-w-full max-h-full object-contain" /> : <FileSignature className="w-12 h-12 text-muted-foreground/30" />}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Upload New</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'sign')} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Official Seal</Label>
                      <div className="border rounded-lg p-2 aspect-video flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                        {formData.seal_url ? <img src={formData.seal_url} alt="Seal" className="max-w-full max-h-full object-contain" /> : <ShieldCheck className="w-12 h-12 text-muted-foreground/30" />}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">Upload New</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'seal')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-3 pt-6 border-t sticky bottom-0 bg-background py-4 z-20 mt-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold h-10 px-4 shrink-0 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </Button>
                  <Button type="submit" disabled={isSaving || isUploading} className="flex-grow shadow-lg h-10 px-6 font-semibold">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Front Page Changes
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="marketing" className="p-6 space-y-8 m-0 outline-none">
              <form onSubmit={handeProfileSubmit} className="space-y-8">
                {/* 1. Layout Selection */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4" /> Prescription Profile Layout
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={formData.profile_layout === 'single' ? 'default' : 'outline'}
                      className={cn("h-24 flex flex-col gap-2", formData.profile_layout === 'single' && "ring-2 ring-primary")}
                      onClick={() => setFormData(prev => ({ ...prev, profile_layout: 'single' }))}
                    >
                      <User className="h-6 w-6" />
                      <div className="text-left w-full">
                        <p className="font-bold">Single Doctor</p>
                        <p className="text-[10px] opacity-70">Focuses on your individual profile and services.</p>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.profile_layout === 'team' ? 'default' : 'outline'}
                      className={cn("h-24 flex flex-col gap-2", formData.profile_layout === 'team' && "ring-2 ring-primary")}
                      onClick={() => setFormData(prev => ({ ...prev, profile_layout: 'team' }))}
                    >
                      <UserCog className="h-6 w-6" />
                      <div className="text-left w-full">
                        <p className="font-bold">Hospital Team</p>
                        <p className="text-[10px] opacity-70">Showcases 2-4 doctors practicing together.</p>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* 2. Profile Photo (Top of Single Layout) */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Profile Photo
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="border rounded-xl p-2 w-32 h-32 flex items-center justify-center bg-secondary/10 relative overflow-hidden group">
                      {formData.photo_url ? <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-muted-foreground/30" />}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-xs font-medium">Upload New</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'photo')} />
                      </label>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">Main Profile Photo</p>
                      <p>This photo appears prominently on your single doctor layout.</p>
                    </div>
                  </div>
                </div>

                {/* 3. Biography Section (Middle) */}
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

                {/* 4. Experience Tagline (Banner below Bio) */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
                    <Award className="w-4 h-4" /> Experience Banner Tagline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="exp_en">Experience (English)</Label>
                      <Input id="exp_en" value={formData.experience.en} onChange={e => setFormData(prev => ({ ...prev, experience: { ...prev.experience, en: e.target.value } }))} placeholder="8+ years and 5000+ surgeries experience" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp_te">Experience (Telugu)</Label>
                      <Input id="exp_te" value={formData.experience.te} onChange={e => setFormData(prev => ({ ...prev, experience: { ...prev.experience, te: e.target.value } }))} placeholder="8+ ఏళ్ల అనుభవం..." />
                    </div>
                  </div>
                </div>

                {/* 5. Team Members Section (Visible only for Team Layout) */}
                {formData.profile_layout === 'team' && (
                  <div className="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-primary" /> Team Members (up to 4)
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={addTeamMember} disabled={formData.team_members.length >= 4}>
                        <Plus className="h-4 w-4 mr-1" /> Add Member
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {formData.team_members.map((member: any, idx: number) => (
                        <div key={idx} className="border rounded-xl p-4 bg-muted/20 relative group">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteTeamMember(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6">
                            <div className="space-y-2">
                              <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-background relative overflow-hidden group/photo">
                                {member.photo_url ? (
                                  <img src={member.photo_url} alt={member.name?.en} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                )}
                                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold text-center p-2">
                                  Upload Photo
                                  <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleTeamPhotoUpload(e.target.files[0], idx)} />
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Name (EN/TE)</Label>
                                <Input value={member.name?.en} onChange={e => updateTeamMember(idx, 'name', e.target.value, 'en')} placeholder="English Name" className="h-8 text-sm" />
                                <Input value={member.name?.te} onChange={e => updateTeamMember(idx, 'name', e.target.value, 'te')} placeholder="Telugu Name" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Quals (EN/TE)</Label>
                                <Input value={member.qualifications?.en} onChange={e => updateTeamMember(idx, 'qualifications', e.target.value, 'en')} placeholder="English Quals" className="h-8 text-sm" />
                                <Input value={member.qualifications?.te} onChange={e => updateTeamMember(idx, 'qualifications', e.target.value, 'te')} placeholder="Telugu Quals" className="h-8 text-sm" />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Specialization (EN/TE)</Label>
                                <Input value={member.specialization?.en} onChange={e => updateTeamMember(idx, 'specialization', e.target.value, 'en')} placeholder="English Spec" className="h-8 text-sm" />
                                <Input value={member.specialization?.te} onChange={e => updateTeamMember(idx, 'specialization', e.target.value, 'te')} placeholder="Telugu Spec" className="h-8 text-sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Services Section (Bottom Content) */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Specializations & Services</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {formData.services.map((service: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-secondary/5 relative group transition-all hover:bg-secondary/10">
                        {/* Reorder/Delete Toolbar */}
                        <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-md border shadow-sm z-20">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveService(idx, 'up')}><ChevronUp className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === formData.services.length - 1} onClick={() => moveService(idx, 'down')}><ChevronDown className="h-4 w-4" /></Button>
                          <div className="w-px h-4 bg-border mx-0.5" />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteService(idx)}><Trash2 className="h-4 w-4" /></Button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 mb-3 border-b border-primary/10">
                          <Label className="text-[10px] uppercase text-muted-foreground font-bold whitespace-nowrap">Service Icon</Label>
                          <div className="flex flex-wrap gap-1 p-0.5 w-full">
                            {['Bone', 'Activity', 'User', 'Stethoscope', 'Syringe', 'Heart', 'Brain', 'Eye', 'Pill', 'FlaskConical', 'Thermometer', 'Baby', 'BriefcaseMedical'].map((key) => {
                              const IconComp = { Bone, Activity, User, Stethoscope, Syringe, Heart, Brain, Eye, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical }[key] as any;
                              return (
                                <Button key={key} type="button" variant={service.icon === key ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateService(idx, 'icon', key)}>
                                  <IconComp className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground font-bold">Title (EN)</Label><Input value={service.title.en} onChange={e => updateService(idx, 'title', e.target.value, 'en')} className="h-8 text-sm" /></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground font-bold">Title (TE)</Label><Input value={service.title.te} onChange={e => updateService(idx, 'title', e.target.value, 'te')} className="h-8 text-sm" /></div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground font-bold">Description (EN)</Label><Textarea value={service.description.en} onChange={e => updateService(idx, 'description', e.target.value, 'en')} className="h-20 text-sm py-2" /></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground font-bold">Description (TE)</Label><Textarea value={service.description.te} onChange={e => updateService(idx, 'description', e.target.value, 'te')} className="h-20 text-sm py-2" /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full border-dashed border-2 py-8 flex flex-col gap-2 rounded-xl group" onClick={addService}>
                      <Plus className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-primary">Add Another Service</span>
                    </Button>
                  </div>
                </div>

                {/* 7. Hospital Address (Footer) */}
                <div className="space-y-6 pt-6 border-t bg-secondary/5 p-4 rounded-xl">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
                    <MapPin className="w-4 h-4" /> Hospital Address (Footer)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="addr_en">Address (English)</Label>
                      <Textarea
                        id="addr_en"
                        className="h-20"
                        value={formData.address.en}
                        onChange={e => setFormData(prev => ({ ...prev, address: { ...prev.address, en: e.target.value } }))}
                        placeholder="OrthoLife, Kakinada..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr_te">Address (Telugu)</Label>
                      <Textarea
                        id="addr_te"
                        className="h-20"
                        value={formData.address.te}
                        onChange={e => setFormData(prev => ({ ...prev, address: { ...prev.address, te: e.target.value } }))}
                        placeholder="ఆర్థోలైఫ్, రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-3 pt-6 border-t sticky bottom-0 bg-background py-4 z-20 mt-auto">
                  <Button type="button" variant="ghost" className="text-destructive font-bold h-10 px-4" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </Button>
                  <Button type="submit" disabled={isSaving || isUploading} className="flex-grow shadow-lg h-10 px-6 font-semibold">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Marketing Page Changes
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
                      <div className="space-y-2">
                        <Label>Hospital Logo</Label>
                        <div className="flex gap-2">
                          <Input value={hospital.logo_url} onChange={e => handleUpdateHospitalUI(hospital.id, { logo_url: e.target.value })} placeholder="Logo URL or Upload -->" />
                          <div className="relative">
                            <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={isUploading}>
                              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                            </Button>
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              accept="image/*"
                              onChange={e => e.target.files?.[0] && handleHospitalLogoUpload(e.target.files[0], hospital.id)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2"><Label>OP Fees (₹)</Label><Input type="number" value={hospital.settings?.op_fees || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, op_fees: parseInt(e.target.value) } })} /></div>
                      <div className="space-y-2"><Label>Consultant Cut (₹)</Label><Input type="number" value={hospital.settings?.consultant_cut || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, consultant_cut: parseInt(e.target.value) } })} /></div>
                      <div className="space-y-2"><Label>Free Visit (Days)</Label><Input type="number" value={hospital.settings?.free_visit_duration_days || 14} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, free_visit_duration_days: parseInt(e.target.value) } })} /></div>
                      <div className="space-y-2"><Label>Lat</Label><Input type="number" step="any" value={hospital.lat || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lat: parseFloat(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>Lng</Label><Input type="number" step="any" value={hospital.lng || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lng: parseFloat(e.target.value) })} /></div>
                    </div>
                  </div>
                ))}

                {editableHospitals.length > 0 && (
                  <div className="flex flex-col-reverse md:flex-row justify-between items-stretch md:items-center gap-3 pt-6 border-t sticky bottom-0 bg-background py-4 z-20 mt-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold h-10 px-4 shrink-0 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </Button>
                    <Button type="button" onClick={handleSaveAllLocations} disabled={isSaving} className="flex-grow bg-primary text-primary-foreground shadow-lg h-10 px-6 font-semibold">
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
