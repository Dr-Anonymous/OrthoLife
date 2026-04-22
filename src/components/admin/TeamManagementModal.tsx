
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, UserPlus, Phone, Lock, User, Trash2, Shield, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const [consultants, setConsultants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newDoctor, setNewDoctor] = useState({
    name_en: '',
    name_te: '',
    phone: '',
    password: '',
    specialization_en: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchConsultants();
    }
  }, [isOpen]);

  const fetchConsultants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultants')
        .select('*')
        .order('name->>en');
      if (error) throw error;
      setConsultants(data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name_en || !newDoctor.phone || !newDoctor.password) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name, Phone and Password are required.' });
      return;
    }

    setIsAdding(true);
    try {
      // Use RPC to bypass RLS with SECURITY DEFINER
      const { data, error } = await supabase.rpc('add_doctor_with_hospital', {
        p_name: { en: newDoctor.name_en, te: newDoctor.name_te || newDoctor.name_en },
        p_phone: newDoctor.phone,
        p_password: newDoctor.password,
        p_specialization: { en: newDoctor.specialization_en, te: '' },
        p_hospital_name: 'OrthoLife'
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to add doctor.');

      toast({ title: 'Success', description: 'Doctor added with default location OrthoLife.' });
      setNewDoctor({ name_en: '', name_te: '', phone: '', password: '', specialization_en: '' });
      fetchConsultants();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleDoctorStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Use RPC for RLS bypass
      const { error } = await supabase.rpc('update_consultant_status', {
        p_id: id,
        p_is_active: !currentStatus
      });
      if (error) throw error;
      fetchConsultants();
      toast({ title: 'Updated', description: 'Doctor status changed.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const toggleGeneralNotificationHandler = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('consultants')
        .update({ handles_general_notifications: !current })
        .eq('id', id);

      if (error) throw error;
      fetchConsultants();
      toast({ title: 'Success', description: 'General notification handler status updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const toggleWhatsAutoStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('consultants')
        .update({ is_whatsauto_active: !current })
        .eq('id', id);

      if (error) throw error;
      fetchConsultants();
      toast({ title: 'Success', description: 'WhatsAuto registration updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-primary" />
            Clinic Team Management
          </DialogTitle>
          <DialogDescription>
            Add new doctors or manage existing ones. Every new doctor gets "OrthoLife" as their default practice location.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Add New Doctor Form */}
          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 shadow-sm transition-all hover:bg-primary/[0.07]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Register New Doctor
            </h3>
            <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_en">Name (English) *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name_en"
                    placeholder="Dr. John Doe"
                    className="pl-9"
                    value={newDoctor.name_en}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name_en: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_te">Name (Telugu)</Label>
                <Input
                  id="name_te"
                  placeholder="డాక్టర్ జాన్ డో"
                  value={newDoctor.name_te}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name_te: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone / Login ID *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="9876543210"
                    className="pl-9"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Set login password"
                    className="pl-9"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="spec">Specialization</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="spec"
                    placeholder="Orthopedic Surgeon"
                    className="pl-9"
                    value={newDoctor.specialization_en}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization_en: e.target.value })}
                  />
                </div>
              </div>
              <div className="md:col-span-2 pt-2">
                <Button
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
                  type="submit"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registering...</>
                  ) : (
                    <><Plus className="w-5 h-5 mr-2" /> Add Doctor to Team</>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Doctors List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Existing Consultants
            </h3>
            <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Doctor Name</TableHead>
                    <TableHead className="font-semibold">Phone/ID</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-center">Handles Gen. Notifications</TableHead>
                    <TableHead className="font-semibold text-center">Has WhatsAuto</TableHead>
                    <TableHead className="font-semibold text-right text-muted-foreground pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Loading team records...</p>
                      </TableCell>
                    </TableRow>
                  ) : consultants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No team members registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    consultants.map((c) => {
                      const name = typeof c.name === 'object' ? c.name.en : c.name;
                      return (
                        <TableRow key={c.id} className="transition-colors hover:bg-muted/30 group">
                          <TableCell>
                            <div className="font-medium text-foreground">{name}</div>
                            <div className="text-xs text-muted-foreground">{c.specialization?.en || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{c.phone}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.is_active ? 'default' : 'secondary'} className={c.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={c.handles_general_notifications}
                              onCheckedChange={() => toggleGeneralNotificationHandler(c.id, c.handles_general_notifications)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={c.is_whatsauto_active}
                              onCheckedChange={() => toggleWhatsAutoStatus(c.id, c.is_whatsauto_active)}
                            />
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 px-3 transition-all",
                                c.is_active ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"
                              )}
                              onClick={() => toggleDoctorStatus(c.id, c.is_active)}
                            >
                              {c.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose}>Close Management Panel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
