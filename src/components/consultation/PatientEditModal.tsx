import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Patient } from '@/types/consultation';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/age';

interface PatientEditModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const PatientEditModal: React.FC<PatientEditModalProps> = ({ patient, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<{
        name: string;
        phone: string;
        dob: string;
        sex: string;
        is_dob_estimated: boolean;
        secondary_phone: string;
    }>({
        name: '',
        phone: '',
        dob: '',
        sex: 'M',
        is_dob_estimated: false,
        secondary_phone: '',
    });
    const [age, setAge] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);

    useEffect(() => {
        if (patient) {
            setFormData({
                name: patient.name,
                phone: patient.phone,
                dob: patient.dob,
                sex: patient.sex || 'M',
                is_dob_estimated: patient.is_dob_estimated || false,
                secondary_phone: patient.secondary_phone || '',
            });
            if (patient.secondary_phone) {
                setShowSecondaryPhone(true);
            } else {
                setShowSecondaryPhone(false);
            }
            if (patient.dob) {
                setAge(calculateAge(new Date(patient.dob)));
            } else {
                setAge('');
            }
        }
    }, [patient]);

    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAge(val === '' ? '' : Number(val));
        if (val) {
            const estimatedYear = new Date().getFullYear() - Number(val);
            const currentDob = formData.dob ? new Date(formData.dob) : new Date();
            currentDob.setFullYear(estimatedYear);
            setFormData(prev => ({ ...prev, dob: format(currentDob, 'yyyy-MM-dd'), is_dob_estimated: true }));
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setFormData(prev => ({ ...prev, dob: date, is_dob_estimated: false }));
        if (date) {
            setAge(calculateAge(new Date(date)));
        }
    };

    const handleSave = async () => {
        if (!patient) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    dob: formData.dob,
                    sex: formData.sex,
                    is_dob_estimated: formData.is_dob_estimated,
                    secondary_phone: formData.secondary_phone,
                })
                .eq('id', patient.id);

            if (error) throw error;

            toast({
                title: 'Patient Updated',
                description: 'Patient details have been successfully updated.',
            });
            onSave();
            onClose();
        } catch (error) {
            console.error('Error updating patient:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update patient details.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Patient Details</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="col-span-3"
                        />
                        {!showSecondaryPhone && !formData.secondary_phone && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="col-start-4 justify-start p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                                onClick={() => setShowSecondaryPhone(true)}
                            >
                                + Add Alternate
                            </Button>
                        )}
                    </div>
                    {(showSecondaryPhone || formData.secondary_phone) && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="secondary_phone" className="text-right">Alt. Phone</Label>
                            <Input
                                id="secondary_phone"
                                value={formData.secondary_phone}
                                onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                                className="col-span-3"
                                placeholder="Secondary Phone"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="age" className="text-right">Age</Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="age"
                                type="number"
                                value={age}
                                onChange={handleAgeChange}
                                className="w-20"
                            />
                            {formData.is_dob_estimated && <span className="text-xs text-muted-foreground">(Est.)</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dob" className="text-right">DOB</Label>
                        <Input
                            id="dob"
                            type="date"
                            value={formData.dob}
                            onChange={handleDateChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sex" className="text-right">Sex</Label>
                        <Select
                            value={formData.sex}
                            onValueChange={(val) => setFormData({ ...formData, sex: val })}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="M">Male</SelectItem>
                                <SelectItem value="F">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
