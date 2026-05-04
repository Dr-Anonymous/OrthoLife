import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useConsultant } from '@/context/ConsultantContext';
import { useHospitals } from '@/context/HospitalsContext';
import { supabase } from '@/integrations/supabase/client';
import { compressImage, processTransparentImage } from '@/lib/image-utils';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, User, Users, MapPin, Award, Stethoscope, Mail, Phone, FileSignature, ShieldCheck, Image as ImageIcon, UserCog, Globe, ListChecks, LogOut, Lock, Eye, EyeOff, Bone, Activity, Syringe, ChevronUp, ChevronDown, Heart, Brain, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical, Dna, Microscope, Shield, Droplet, Ear, Hand, Bandage, IdCard, Building2, RotateCcw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ConsultantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Bilingual = { en: string; te: string };

// --- Local helpers --------------------------------------------------------

interface BilingualFieldProps {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: Bilingual;
  onChange: (next: Bilingual) => void;
  placeholderEn?: string;
  placeholderTe?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  bothMode: boolean;
  required?: boolean;
}

const BilingualField: React.FC<BilingualFieldProps> = ({
  id, label, icon: Icon, value, onChange, placeholderEn, placeholderTe, as = 'input', rows = 3, bothMode, required
}) => {
  const [lang, setLang] = useState<'en' | 'te'>('en');

  const renderField = (l: 'en' | 'te', placeholder?: string) => {
    const sharedProps = {
      value: value[l] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ ...value, [l]: e.target.value }),
      placeholder,
      required: required && l === 'en',
    };
    if (as === 'textarea') {
      return <Textarea rows={rows} className="text-sm leading-relaxed" {...sharedProps} />;
    }
    return (
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
        <Input id={id} className={cn(Icon && 'pl-9')} {...sharedProps} />
      </div>
    );
  };

  if (bothMode) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label} <span className="text-[10px]">(EN)</span></Label>
          {renderField('en', placeholderEn)}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label} <span className="text-[10px]">(తెలుగు)</span></Label>
          {renderField('te', placeholderTe)}
        </div>
      </div>
    );
  }

  const enFilled = !!value.en?.trim();
  const teFilled = !!value.te?.trim();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={cn(
              'px-2 py-0.5 rounded flex items-center gap-1 transition-colors',
              lang === 'en' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
            )}
          >
            EN
            {enFilled && <span className={cn('w-1.5 h-1.5 rounded-full', lang === 'en' ? 'bg-primary' : 'bg-muted-foreground/50')} />}
          </button>
          <button
            type="button"
            onClick={() => setLang('te')}
            className={cn(
              'px-2 py-0.5 rounded flex items-center gap-1 transition-colors',
              lang === 'te' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'
            )}
          >
            తె
            {teFilled && <span className={cn('w-1.5 h-1.5 rounded-full', lang === 'te' ? 'bg-primary' : 'bg-muted-foreground/50')} />}
          </button>
        </div>
      </div>
      {renderField(lang, lang === 'en' ? placeholderEn : placeholderTe)}
    </div>
  );
};

// Section card wrapper used inside accordions
const SectionAccordion: React.FC<{
  value: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ value, title, description, icon: Icon, children }) => (
  <AccordionItem value={value} className="border rounded-xl bg-card data-[state=open]:shadow-sm overflow-hidden">
    <AccordionTrigger className="px-4 py-3 hover:no-underline group">
      <div className="flex items-center gap-3 text-left min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {description && <div className="text-[11px] text-muted-foreground font-normal truncate">{description}</div>}
        </div>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 pb-4 pt-1">
      <div className="min-w-0">
        {children}
      </div>
    </AccordionContent>
  </AccordionItem>
);

// --- Main component -------------------------------------------------------

export const ConsultantProfileModal: React.FC<ConsultantProfileModalProps> = ({ isOpen, onClose }) => {
  const { consultant, refreshConsultant } = useConsultant();
  const { refreshHospitals } = useHospitals();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bothLangs, setBothLangs] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Profile State
  const buildInitialFormData = (c: any) => ({
    name: c?.name || { en: '', te: '' },
    phone: c?.phone || '',
    qualifications: c?.qualifications || { en: '', te: '' },
    specialization: c?.specialization || { en: '', te: '' },
    experience: c?.experience || { en: '', te: '' },
    email: c?.email || '',
    photo_url: c?.photo_url || '',
    sign_url: c?.sign_url || '',
    seal_url: c?.seal_url || '',
    bio: c?.bio || { en: '', te: '' },
    services: c?.services || [],
    lead_services_en: c?.lead_services?.map((s: any) => s.en).join(', ') || '',
    lead_services_te: c?.lead_services?.map((s: any) => s.te).join(', ') || '',
    team_members: c?.team_members?.map((m: any) => ({
      ...m,
      services_en: m.services?.map((s: any) => s.en).join(', ') || '',
      services_te: m.services?.map((s: any) => s.te).join(', ') || ''
    })) || [],
    password: c?.password || '',
    reception_phone: c?.reception_phone || '',
    reception_password: c?.reception_password || '',
    profile_layout: c?.profile_layout || 'single',
  });

  const [formData, setFormData] = useState(buildInitialFormData(consultant));
  const [showPassword, setShowPassword] = useState(false);
  const [showReceptionPassword, setShowReceptionPassword] = useState(false);

  // Wrap setFormData to mark dirty
  const updateForm = (updater: (prev: any) => any) => {
    setIsDirty(true);
    setFormData(updater);
  };

  // Locations State
  const [editableHospitals, setEditableHospitals] = useState<any[]>([]);
  const originalHospitalsRef = useRef<string>('[]');

  const updateHospitals = (updater: (prev: any[]) => any[]) => {
    setIsDirty(true);
    setEditableHospitals(updater);
  };

  useEffect(() => {
    if (isOpen && consultant) {
      setFormData(buildInitialFormData(consultant));
      fetchConsultantHospitals();
      setIsDirty(false);
    }
  }, [isOpen, consultant]);

  const fetchConsultantHospitals = async () => {
    if (!consultant) return;
    const { data } = await supabase
      .from('hospitals')
      .select('*')
      .eq('consultant_id', consultant.id);

    if (data) {
      setEditableHospitals(data);
      originalHospitalsRef.current = JSON.stringify(data);
    }
  };

  // Unified save: writes consultant row, then any hospital changes
  const handleUnifiedSave = async () => {
    if (!consultant) return;

    if (!formData.name.en?.trim() || !formData.phone?.trim()) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Please provide at least your English Name and Phone number.' });
      return;
    }

    setIsSaving(true);
    try {
      // Zip Lead Services
      const leadEnArr = formData.lead_services_en.split(',').map((s: string) => s.trim()).filter(Boolean);
      const leadTeArr = formData.lead_services_te.split(',').map((s: string) => s.trim()).filter(Boolean);
      const leadMaxLen = Math.max(leadEnArr.length, leadTeArr.length);
      const lead_services = Array.from({ length: leadMaxLen }).map((_, i) => ({
        en: leadEnArr[i] || '',
        te: leadTeArr[i] || ''
      }));

      // Zip Team Services
      const team_members = formData.team_members.map((m: any) => {
        const enArr = m.services_en.split(',').map((s: string) => s.trim()).filter(Boolean);
        const teArr = m.services_te.split(',').map((s: string) => s.trim()).filter(Boolean);
        const maxLen = Math.max(enArr.length, teArr.length);
        const services = Array.from({ length: maxLen }).map((_, i) => ({
          en: enArr[i] || '',
          te: teArr[i] || ''
        }));
        const { services_en, services_te, ...cleanMember } = m;
        return { ...cleanMember, services };
      });

      const { error } = await supabase
        .from('consultants')
        .update({
          name: formData.name,
          phone: formData.phone,
          qualifications: formData.qualifications,
          specialization: formData.specialization,
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
          team_members,
          lead_services,
          updated_at: new Date().toISOString()
        })
        .eq('id', consultant.id);

      if (error) throw error;

      // Save hospital changes if any
      const hospitalsChanged = JSON.stringify(editableHospitals) !== originalHospitalsRef.current;
      if (hospitalsChanged) {
        for (const hospital of editableHospitals) {
          const { id, is_new, ...data } = hospital;
          if (is_new) {
            const { error: hErr } = await supabase.from('hospitals').insert(data);
            if (hErr) throw hErr;
          } else {
            const { error: hErr } = await supabase.from('hospitals').update(data).eq('id', id);
            if (hErr) throw hErr;
          }
        }
        await fetchConsultantHospitals();
        await refreshHospitals();
      }

      await refreshConsultant();
      setIsDirty(false);
      toast({ title: 'Profile Saved', description: 'All changes have been saved successfully.' });
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!consultant) return;
    setFormData(buildInitialFormData(consultant));
    fetchConsultantHospitals();
    setIsDirty(false);
    toast({ title: 'Changes Discarded', description: 'Reverted to last saved values.' });
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'sign' | 'seal') => {
    if (!consultant) return;
    setIsUploading(true);
    try {
      const oldUrl = formData[`${type}_url` as keyof typeof formData] as string;
      const compressionToastId = toast({ title: 'Processing...', description: 'Optimizing image for better performance.' });

      let processedFile: Blob | File;
      let fileExt = file.name.split('.').pop();
      if (type === 'sign' || type === 'seal') {
        processedFile = await processTransparentImage(file, { threshold: 115, maxWidthOrHeight: 1024 });
        fileExt = 'png';
      } else {
        processedFile = await compressImage(file, { maxSizeKB: 100, maxWidthOrHeight: 1024 });
      }

      compressionToastId.dismiss();

      const fileName = `${consultant.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `consultants/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('consultant-assets').upload(filePath, processedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('consultant-assets').getPublicUrl(filePath);
      updateForm(prev => ({ ...prev, [`${type}_url`]: publicUrl }));

      if (oldUrl && oldUrl.includes('consultant-assets/')) {
        const oldFileName = oldUrl.split('consultant-assets/').pop();
        if (oldFileName) {
          supabase.storage.from('consultant-assets').remove([oldFileName]).catch(console.error);
        }
      }

      toast({ title: 'Upload Successful', description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded.` });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Location Management ---
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
    updateHospitals(prev => [...prev, newHospital]);
  };

  const handleUpdateHospitalUI = (id: string, updates: any) => {
    setIsDirty(true);
    updateHospitals(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
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
      updateHospitals(prev => prev.filter(h => h.id !== id));
      return;
    }
    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      setEditableHospitals(prev => {
        const filtered = prev.filter(h => h.id !== id);
        originalHospitalsRef.current = JSON.stringify(filtered);
        return filtered;
      });
      toast({ title: 'Location Removed' });
      await refreshHospitals();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      toast({ title: 'Logged Out', description: 'Consultant session ended.' });
      window.location.reload();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Logout Failed', description: err.message });
    }
  };

  // --- Services Management ---
  const addService = () => {
    updateForm(prev => ({
      ...prev,
      services: [...prev.services, { title: { en: '', te: '' }, description: { en: '', te: '' }, icon: 'Bone' }]
    }));
  };

  const updateService = (index: number, field: string, value: string, lang?: 'en' | 'te') => {
    const newServices = [...formData.services];
    const currentService = { ...newServices[index] } as any;
    if (lang && (field === 'title' || field === 'description')) {
      currentService[field] = { ...currentService[field], [lang]: value };
    } else {
      currentService[field] = value;
    }
    newServices[index] = currentService;
    updateForm(prev => ({ ...prev, services: newServices }));
  };

  const updateServiceBilingual = (index: number, field: 'title' | 'description', value: Bilingual) => {
    const newServices = [...formData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    updateForm(prev => ({ ...prev, services: newServices }));
  };

  const deleteService = (index: number) => {
    updateForm(prev => ({ ...prev, services: prev.services.filter((_: any, i: number) => i !== index) }));
  };

  const moveService = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.services.length - 1) return;
    const newServices = [...formData.services];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newServices[index], newServices[targetIndex]] = [newServices[targetIndex], newServices[index]];
    updateForm(prev => ({ ...prev, services: newServices }));
  };

  // --- Team Management ---
  const addTeamMember = () => {
    if (formData.team_members.length >= 4) {
      toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can add up to 4 team members.' });
      return;
    }
    updateForm(prev => ({
      ...prev,
      team_members: [
        ...prev.team_members,
        { name: { en: '', te: '' }, qualifications: { en: '', te: '' }, specialization: { en: '', te: '' }, services_en: '', services_te: '' }
      ]
    }));
  };

  const updateTeamMemberBilingual = (index: number, field: 'name' | 'qualifications' | 'specialization', value: Bilingual) => {
    const newMembers = [...formData.team_members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    updateForm(prev => ({ ...prev, team_members: newMembers }));
  };

  const deleteTeamMember = (index: number) => {
    updateForm(prev => ({ ...prev, team_members: prev.team_members.filter((_: any, i: number) => i !== index) }));
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
      newMembers[index] = { ...newMembers[index], photo_url: publicUrl };
      updateForm(prev => ({ ...prev, team_members: newMembers }));
      toast({ title: 'Upload Successful', description: 'Team member photo updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Image upload tile (visible button + click anywhere) ---
  const ImageUploadTile: React.FC<{
    src?: string;
    fallbackIcon: React.ComponentType<{ className?: string }>;
    onFile: (file: File) => void;
    label: string;
    aspect?: 'video' | 'square';
    className?: string;
  }> = ({ src, fallbackIcon: Icon, onFile, label, aspect = 'video', className }) => (
    <div className={cn('space-y-2', className)}>
      <div className={cn(
        'border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/10 relative overflow-hidden',
        aspect === 'video' ? 'aspect-video' : 'aspect-square'
      )}>
        {src ? (
          <img src={src} alt={label} className={cn('max-w-full max-h-full', aspect === 'square' ? 'w-full h-full object-cover' : 'object-contain')} />
        ) : (
          <Icon className="w-10 h-10 text-muted-foreground/30" />
        )}
        <label className="absolute inset-0 cursor-pointer">
          <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </div>
      <label className="cursor-pointer">
        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        <div className={cn(
          'w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-md border bg-background px-3 py-1.5 hover:bg-accent transition-colors',
          isUploading && 'opacity-50 pointer-events-none'
        )}>
          {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {src ? `Change ${label}` : `Upload ${label}`}
        </div>
      </label>
    </div>
  );

  const iconList = ['Bone', 'Activity', 'User', 'Stethoscope', 'Syringe', 'Heart', 'Brain', 'Eye', 'Pill', 'FlaskConical', 'Thermometer', 'Baby', 'BriefcaseMedical', 'Dna', 'Microscope', 'Shield', 'Droplet', 'Ear', 'Hand', 'Bandage'];
  const iconMap: Record<string, any> = { Bone, Activity, User, Stethoscope, Syringe, Heart, Brain, Eye, Pill, FlaskConical, Thermometer, Baby, BriefcaseMedical, Dna, Microscope, Shield, Droplet, Ear, Hand, Bandage };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && isDirty) {
        if (!window.confirm('You have unsaved changes. Close anyway?')) return;
      }
      if (!open) onClose();
    }}>
      <DialogContent className="w-[98vw] md:max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-2">
          {/* pr-10 reserves space for the auto-rendered close X button */}
          <div className="pr-10">
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              My Professional Profile
            </DialogTitle>
            <DialogDescription className="mt-1">
              Manage your credentials, professional bio, and practice locations.
            </DialogDescription>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            <span>Show both languages</span>
            <Switch checked={bothLangs} onCheckedChange={setBothLangs} />
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <div className="px-6 pt-3 pb-2 border-b bg-muted/20">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="identity" className="gap-1.5"><IdCard className="w-3.5 h-3.5" /><span>Identity</span></TabsTrigger>
              <TabsTrigger value="practice" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /><span>Practice</span></TabsTrigger>
              <TabsTrigger value="access" className="gap-1.5"><Lock className="w-3.5 h-3.5" /><span>Access</span></TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow [&>div>div]:!block min-w-0">
            {/* IDENTITY TAB */}
            <TabsContent value="identity" className="p-4 md:p-6 m-0 outline-none w-full max-w-full">
              <Accordion type="multiple" defaultValue={['basic', 'assets']} className="space-y-3">
                <SectionAccordion value="basic" title="Basic Information" description="Name, qualifications, specialization" icon={User}>
                  <div className="space-y-4">
                    <BilingualField
                      label="Full Name"
                      icon={User}
                      value={formData.name}
                      onChange={v => updateForm(p => ({ ...p, name: v }))}
                      placeholderEn="Dr. Samuel Manoj"
                      placeholderTe="డాక్టర్ మనోజ్ గారు"
                      bothMode={bothLangs}
                      required
                    />
                    <BilingualField
                      label="Qualifications"
                      icon={Award}
                      value={formData.qualifications}
                      onChange={v => updateForm(p => ({ ...p, qualifications: v }))}
                      placeholderEn="MBBS, MS Ortho (Manipal)"
                      placeholderTe="MBBS, MS Ortho (మణిపాల్)"
                      bothMode={bothLangs}
                    />
                    <BilingualField
                      label="Primary Specialization"
                      icon={Stethoscope}
                      value={formData.specialization}
                      onChange={v => updateForm(p => ({ ...p, specialization: v }))}
                      placeholderEn="Orthopaedic Surgeon"
                      placeholderTe="ఆర్థోపెడిక్ సర్జన్"
                      bothMode={bothLangs}
                    />
                  </div>
                </SectionAccordion>

                <SectionAccordion value="assets" title="Photo & Branding Assets" description="Profile photo, signature, and seal" icon={ImageIcon}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5 mb-2"><User className="w-3.5 h-3.5" /> Profile Photo</Label>
                      <ImageUploadTile
                        src={formData.photo_url}
                        fallbackIcon={User}
                        onFile={f => handleFileUpload(f, 'photo')}
                        label="Photo"
                        aspect="square"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1.5 mb-2"><FileSignature className="w-3.5 h-3.5" /> Digital Signature</Label>
                      <ImageUploadTile
                        src={formData.sign_url}
                        fallbackIcon={FileSignature}
                        onFile={f => handleFileUpload(f, 'sign')}
                        label="Signature"
                        aspect="video"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5" /> Official Seal</Label>
                      <ImageUploadTile
                        src={formData.seal_url}
                        fallbackIcon={ShieldCheck}
                        onFile={f => handleFileUpload(f, 'seal')}
                        label="Seal"
                        aspect="video"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Signature and seal appear on the bottom-right of every prescription.
                  </p>
                </SectionAccordion>

                <SectionAccordion value="bio" title="Biography & Experience" description="Public-facing bio and tagline" icon={Globe}>
                  <div className="space-y-4">
                    <BilingualField
                      label="Professional Biography"
                      value={formData.bio}
                      onChange={v => updateForm(p => ({ ...p, bio: v }))}
                      placeholderEn="Write your professional bio in English..."
                      placeholderTe="మీ వృత్తిపరమైన వివరాలను తెలుగులో వ్రాయండి..."
                      as="textarea"
                      rows={5}
                      bothMode={bothLangs}
                    />
                    <BilingualField
                      label="Experience Tagline"
                      icon={Award}
                      value={formData.experience}
                      onChange={v => updateForm(p => ({ ...p, experience: v }))}
                      placeholderEn="8+ years and 5000+ surgeries experience"
                      placeholderTe="8+ ఏళ్ల అనుభవం..."
                      bothMode={bothLangs}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The bio is shown on the marketing page; the tagline appears as a banner on the single-doctor layout.
                    </p>
                  </div>
                </SectionAccordion>
              </Accordion>
            </TabsContent>

            {/* PRACTICE TAB */}
            <TabsContent value="practice" className="p-4 md:p-6 m-0 outline-none w-full max-w-full">
              <Accordion type="multiple" defaultValue={['layout', 'team', 'services', 'locations']} className="space-y-3">
                <SectionAccordion value="layout" title="Marketing Page Layout" description="How your profile appears on prescriptions" icon={ImageIcon}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateForm(p => ({ ...p, profile_layout: 'single' }))}
                      className={cn(
                        'border rounded-xl p-4 text-left transition-all hover:bg-accent/40',
                        formData.profile_layout === 'single' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <User className="h-5 w-5 mb-2 text-primary" />
                      <div className="font-semibold text-sm">Single Doctor</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Focus on your individual profile and services.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm(p => ({ ...p, profile_layout: 'team' }))}
                      className={cn(
                        'border rounded-xl p-4 text-left transition-all hover:bg-accent/40',
                        formData.profile_layout === 'team' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <Users className="h-5 w-5 mb-2 text-primary" />
                      <div className="font-semibold text-sm">Hospital Team</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Showcase 2–4 doctors practising together.</div>
                    </button>
                  </div>
                </SectionAccordion>

                {formData.profile_layout === 'team' && (
                  <SectionAccordion
                    value="team"
                    title="Practice Team"
                    description={`Lead consultant + ${formData.team_members.length} member${formData.team_members.length === 1 ? '' : 's'} (max 4)`}
                    icon={Users}
                  >
                    <div className="space-y-4">
                      {/* Lead consultant card */}
                      <div className="border rounded-xl p-4 bg-primary/5 border-primary/20">
                        <div className="grid grid-cols-1 md:grid-cols-[100px_minmax(0,1fr)] gap-4">
                          <div className="aspect-square w-24 md:w-full rounded-lg border-2 border-primary/20 flex items-center justify-center bg-background relative overflow-hidden">
                            {formData.photo_url ? (
                              <img src={formData.photo_url} alt="Lead" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-7 w-7 text-muted-foreground/30" />
                            )}
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                              Change Photo
                              <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'photo')} />
                            </label>
                          </div>
                          <div className="min-w-0">
                            <Badge className="mb-2 text-[10px] uppercase">Lead Consultant</Badge>
                            <div className="text-base font-bold break-words">{formData.name.en || 'Lead Doctor'}</div>
                            <div className="text-xs text-muted-foreground">{formData.qualifications.en}</div>
                            <div className="text-xs font-medium text-primary mt-0.5">{formData.specialization.en}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-dashed border-primary/20">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-primary/70">Key Services (EN)</Label>
                                <Textarea
                                  className="h-12 text-[11px] leading-tight"
                                  placeholder="Comma separated"
                                  value={formData.lead_services_en}
                                  onChange={e => updateForm(p => ({ ...p, lead_services_en: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-primary/70">Key Services (తె)</Label>
                                <Textarea
                                  className="h-12 text-[11px] leading-tight"
                                  placeholder="కామాతో వేరు చేయండి"
                                  value={formData.lead_services_te}
                                  onChange={e => updateForm(p => ({ ...p, lead_services_te: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {formData.team_members.map((member: any, idx: number) => (
                        <div key={idx} className="border rounded-xl p-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Team Member {idx + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteTeamMember(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[100px_minmax(0,1fr)] gap-4">
                            <div className="aspect-square w-24 md:w-full rounded-lg border-2 border-dashed flex items-center justify-center bg-background relative overflow-hidden">
                              {member.photo_url ? (
                                <img src={member.photo_url} alt={member.name?.en} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="h-7 w-7 text-muted-foreground/30" />
                              )}
                              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                                Change Photo
                                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleTeamPhotoUpload(e.target.files[0], idx)} />
                              </label>
                            </div>
                            <div className="space-y-3 min-w-0">
                              <BilingualField
                                label="Name"
                                value={member.name || { en: '', te: '' }}
                                onChange={v => updateTeamMemberBilingual(idx, 'name', v)}
                                placeholderEn="Dr. Name"
                                placeholderTe="డాక్టర్ పేరు"
                                bothMode={bothLangs}
                              />
                              <BilingualField
                                label="Qualifications"
                                value={member.qualifications || { en: '', te: '' }}
                                onChange={v => updateTeamMemberBilingual(idx, 'qualifications', v)}
                                bothMode={bothLangs}
                              />
                              <BilingualField
                                label="Specialization"
                                value={member.specialization || { en: '', te: '' }}
                                onChange={v => updateTeamMemberBilingual(idx, 'specialization', v)}
                                bothMode={bothLangs}
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-dashed">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Key Services (EN)</Label>
                                  <Textarea
                                    className="h-12 text-[11px] leading-tight"
                                    placeholder="Comma separated"
                                    value={member.services_en}
                                    onChange={e => {
                                      const newMembers = [...formData.team_members];
                                      newMembers[idx].services_en = e.target.value;
                                      updateForm(p => ({ ...p, team_members: newMembers }));
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Key Services (తె)</Label>
                                  <Textarea
                                    className="h-12 text-[11px] leading-tight"
                                    placeholder="కామాతో వేరు చేయండి"
                                    value={member.services_te}
                                    onChange={e => {
                                      const newMembers = [...formData.team_members];
                                      newMembers[idx].services_te = e.target.value;
                                      updateForm(p => ({ ...p, team_members: newMembers }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed h-12"
                        onClick={addTeamMember}
                        disabled={formData.team_members.length >= 4}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Team Member
                      </Button>
                    </div>
                  </SectionAccordion>
                )}

                <SectionAccordion
                  value="services"
                  title="Specializations & Services"
                  description={`${formData.services.length} listed`}
                  icon={ListChecks}
                >
                  <div className="space-y-3">
                    {formData.services.map((service: any, idx: number) => {
                      return (
                        <div key={idx} className="border rounded-lg p-4 bg-secondary/5 relative group transition-all hover:bg-secondary/10">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/60">
                            <div className="flex-1 min-w-0 overflow-x-auto">
                              <div className="flex gap-1 w-max">
                                {iconList.map(key => {
                                  const I = iconMap[key];
                                  return (
                                    <Button
                                      key={key}
                                      type="button"
                                      variant={service.icon === key ? 'default' : 'ghost'}
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                      onClick={() => updateService(idx, 'icon', key)}
                                    >
                                      <I className="h-3.5 w-3.5" />
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveService(idx, 'up')}>
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === formData.services.length - 1} onClick={() => moveService(idx, 'down')}>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteService(idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <BilingualField
                              label="Title"
                              value={service.title}
                              onChange={v => updateServiceBilingual(idx, 'title', v)}
                              bothMode={bothLangs}
                            />
                            <BilingualField
                              label="Description"
                              value={service.description}
                              onChange={v => updateServiceBilingual(idx, 'description', v)}
                              as="textarea"
                              rows={3}
                              bothMode={bothLangs}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <Button type="button" variant="outline" className="w-full border-dashed h-12" onClick={addService}>
                      <Plus className="w-4 h-4 mr-1" /> Add Service
                    </Button>
                  </div>
                </SectionAccordion>

                <SectionAccordion
                  value="locations"
                  title="Practice Locations"
                  description={`${editableHospitals.length} location${editableHospitals.length === 1 ? '' : 's'}`}
                  icon={MapPin}
                >
                  <div className="space-y-3">
                    {editableHospitals.map((hospital, hIdx) => (
                      <div key={hospital.id} className="border rounded-lg p-4 space-y-4 bg-secondary/5">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Location {hIdx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteHospitalUI(hospital.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Location Name</Label>
                            <Input value={hospital.name} onChange={e => handleUpdateHospitalUI(hospital.id, { name: e.target.value })} />
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <Label className="text-xs">Hospital Logo</Label>
                            <div className="flex gap-2 min-w-0">
                              <Input className="min-w-0 flex-1" value={hospital.logo_url} onChange={e => handleUpdateHospitalUI(hospital.id, { logo_url: e.target.value })} placeholder="URL or upload →" />
                              <div className="relative shrink-0">
                                <Button type="button" variant="outline" size="icon" disabled={isUploading}>
                                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
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
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                          <div className="space-y-1"><Label className="text-[11px]">OP Fees (₹)</Label><Input type="number" className="h-8" value={hospital.settings?.op_fees || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, op_fees: parseInt(e.target.value) } })} /></div>
                          <div className="space-y-1"><Label className="text-[11px]">Consultant Cut (₹)</Label><Input type="number" className="h-8" value={hospital.settings?.consultant_cut || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, consultant_cut: parseInt(e.target.value) } })} /></div>
                          <div className="space-y-1"><Label className="text-[11px]">Free Visit (Days)</Label><Input type="number" className="h-8" value={hospital.settings?.free_visit_duration_days || 14} onChange={e => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, free_visit_duration_days: parseInt(e.target.value) } })} /></div>
                          <div className="space-y-1"><Label className="text-[11px]">Latitude</Label><Input type="number" step="any" className="h-8" value={hospital.lat || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lat: parseFloat(e.target.value) })} /></div>
                          <div className="space-y-1"><Label className="text-[11px]">Longitude</Label><Input type="number" step="any" className="h-8" value={hospital.lng || 0} onChange={e => handleUpdateHospitalUI(hospital.id, { lng: parseFloat(e.target.value) })} /></div>
                        </div>
                        <div className="mt-2">
                          <BilingualField
                            label="Location Specific Address"
                            value={typeof hospital.settings?.address === 'object' ? hospital.settings.address : { en: hospital.settings?.address || '', te: '' }}
                            onChange={v => handleUpdateHospitalUI(hospital.id, { settings: { ...hospital.settings, address: v } })}
                            placeholderEn="e.g. Road No. 3, RR Nagar, Kakinada-03"
                            placeholderTe="e.g. రోడ్డు నెం. 3, ఆర్ ఆర్ నగర్, కాకినాడ-03"
                            as="input"
                            bothMode={bothLangs}
                          />
                        </div>
                      </div>

                    ))}
                    <Button type="button" variant="outline" className="w-full border-dashed h-12" onClick={handleAddLocationUI}>
                      <Plus className="w-4 h-4 mr-1" /> Add Location
                    </Button>
                    {editableHospitals.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        No practice locations yet — add your first one above.
                      </div>
                    )}
                  </div>
                </SectionAccordion>
              </Accordion>
            </TabsContent>

            {/* ACCESS TAB */}
            <TabsContent value="access" className="p-4 md:p-6 m-0 outline-none w-full max-w-full">
              <Accordion type="multiple" defaultValue={['workspace']} className="space-y-3">
                <SectionAccordion value="workspace" title="Workspace Login" description="Your phone, email, and workspace password" icon={Lock}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs">Phone (Login)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" value={formData.phone} onChange={e => updateForm(p => ({ ...p, phone: e.target.value }))} className="pl-9" placeholder="9866812555" required />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Also displayed on the prescription front.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" value={formData.email} onChange={e => updateForm(p => ({ ...p, email: e.target.value }))} className="pl-9" placeholder="info@ortho.life" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Also displayed on the prescription front.</p>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="gate-password" className="text-xs">Workspace Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="gate-password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={e => updateForm(p => ({ ...p, password: e.target.value }))}
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
                </SectionAccordion>

                <SectionAccordion value="reception" title="Receptionist / Assistant Access" description="Optional separate login for staff" icon={ShieldCheck}>
                  <p className="text-xs text-muted-foreground mb-3">
                    Allow staff to log in with their own phone and password to book and manage consultations on your behalf.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reception_phone" className="text-xs">Receptionist Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reception_phone"
                          value={formData.reception_phone}
                          onChange={e => updateForm(p => ({ ...p, reception_phone: e.target.value }))}
                          className="pl-9"
                          placeholder="Reception phone number"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Displayed on the prescription back for booking.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reception_password" className="text-xs">Receptionist Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reception_password"
                          type={showReceptionPassword ? 'text' : 'password'}
                          value={formData.reception_password}
                          onChange={e => updateForm(p => ({ ...p, reception_password: e.target.value }))}
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
                </SectionAccordion>

                <div className="border rounded-xl p-4 bg-destructive/5 border-destructive/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-destructive" /> Sign Out
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        End the consultant session on this device. You will need to log in again to continue.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-1.5" /> Log Out
                    </Button>
                  </div>
                </div>
              </Accordion>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Sticky save bar */}
        <div className="border-t bg-background/95 backdrop-blur px-4 md:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isDirty ? (
              <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground hidden sm:inline">All changes saved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Discard
            </Button>
            <Button
              type="button"
              onClick={handleUnifiedSave}
              disabled={!isDirty || isSaving || isUploading}
              className="shadow-sm font-semibold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
