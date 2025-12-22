import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface VitalsFormProps {
    weight: string;
    bp: string;
    temperature: string;
    allergy: string;
    onExtraChange: (field: string, value: string) => void;
}

/**
 * VitalsForm Component
 * 
 * Captures patient vital signs including Weight, BP, Temperature, and Allergies.
 * Handles BP input splitting (systolic/diastolic) for better UX.
 */
export const VitalsForm: React.FC<VitalsFormProps> = ({
    weight,
    bp,
    temperature,
    allergy,
    onExtraChange
}) => {
    const handleBpPartChange = (part: 'systolic' | 'diastolic', value: string) => {
        const parts = bp ? bp.split('/') : ['', ''];
        const newSystolic = part === 'systolic' ? value : (parts[0] || '');
        const newDiastolic = part === 'diastolic' ? value : (parts[1] || '');

        if (!newSystolic && !newDiastolic) {
            onExtraChange('bp', '');
        } else {
            onExtraChange('bp', `${newSystolic}/${newDiastolic}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="weight" className="text-sm font-medium">Weight</Label>
                    <Input id="weight" value={weight} onChange={e => onExtraChange('weight', e.target.value)} placeholder="e.g., 70kg" />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">BP (mmHg)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Systolic"
                            value={bp ? bp.split('/')[0] : ''}
                            onChange={e => handleBpPartChange('systolic', e.target.value)}
                            className="text-center"
                        />
                        <span className="text-xl text-muted-foreground">/</span>
                        <Input
                            placeholder="Diastolic"
                            value={bp ? bp.split('/')[1] || '' : ''}
                            onChange={e => handleBpPartChange('diastolic', e.target.value)}
                            className="text-center"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-sm font-medium">Temperature</Label>
                    <Input id="temperature" value={temperature} onChange={e => onExtraChange('temperature', e.target.value)} placeholder="e.g., 98.6F" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="allergy" className="text-sm font-medium">Allergy</Label>
                    <Input id="allergy" value={allergy} onChange={e => onExtraChange('allergy', e.target.value)} placeholder="e.g., Penicillin" />
                </div>
            </div>
        </div>
    );
};
