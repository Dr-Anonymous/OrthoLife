import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VitalsFormProps {
    weight: string;
    height: string;
    pulse: string;
    spo2: string;
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
    height,
    pulse,
    spo2,
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

    // Auto-calculate BMI
    const bmiValue = React.useMemo(() => {
        const w = parseFloat(weight);
        const h = parseFloat(height) / 100; // Assuming height is in cm
        if (w > 0 && h > 0) {
            const bmi = (w / (h * h)).toFixed(1);
            // Sync BMI to extraData if it changes? 
            // Better to just show it or let parent handle the sync.
            // For now, we'll just display it.
            return bmi;
        }
        return '';
    }, [weight, height]);

    // Sync BMI to parent state if it's calculated but doesn't match current state
    React.useEffect(() => {
        const currentBmi = String(bmiValue);
        // We only sync if it's non-empty and different to avoid infinite loops
        // But BMI in extraData is also used for persistence.
        // If the calculated BMI changes, we should update the parent.
    }, [bmiValue]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="weight" className="text-sm font-medium">Weight (kg)</Label>
                    <Input id="weight" value={weight} onChange={e => onExtraChange('weight', e.target.value)} placeholder="e.g., 70" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="height" className="text-sm font-medium">Height (cm)</Label>
                    <Input id="height" value={height} onChange={e => onExtraChange('height', e.target.value)} placeholder="e.g., 170" />
                </div>
                
                {/* BMI only shown if both height and weight are entered */}
                {weight && height && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">BMI</Label>
                        <div className={cn(
                            "h-10 px-3 py-2 rounded-md border bg-primary/5 flex items-center justify-center font-bold text-primary animate-in fade-in zoom-in duration-300",
                        )}>
                            {bmiValue || '--'}
                        </div>
                    </div>
                )}

                <div className="space-y-2 col-span-2 sm:col-span-1 md:col-span-1">
                    <Label className="text-sm font-medium text-nowrap">BP (Sys/Dia)</Label>
                    <div className="flex items-center gap-1">
                        <Input
                            placeholder="Sys"
                            value={bp ? bp.split('/')[0] : ''}
                            onChange={e => handleBpPartChange('systolic', e.target.value)}
                            className="text-center px-1"
                        />
                        <span className="text-muted-foreground">/</span>
                        <Input
                            placeholder="Dia"
                            value={bp ? bp.split('/')[1] || '' : ''}
                            onChange={e => handleBpPartChange('diastolic', e.target.value)}
                            className="text-center px-1"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="pulse" className="text-sm font-medium">Pulse (bpm)</Label>
                    <Input id="pulse" value={pulse} onChange={e => onExtraChange('pulse', e.target.value)} placeholder="e.g., 72" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="spo2" className="text-sm font-medium">SpO2 (%)</Label>
                    <Input id="spo2" value={spo2} onChange={e => onExtraChange('spo2', e.target.value)} placeholder="e.g., 98" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-sm font-medium">Temp (F)</Label>
                    <Input id="temperature" value={temperature} onChange={e => onExtraChange('temperature', e.target.value)} placeholder="98.6" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-2 md:col-span-1 lg:col-span-1">
                    <Label htmlFor="allergy" className="text-sm font-medium">Allergy</Label>
                    <Input id="allergy" value={allergy} onChange={e => onExtraChange('allergy', e.target.value)} placeholder="e.g., Penicillin" />
                </div>
            </div>
        </div>
    );
};
