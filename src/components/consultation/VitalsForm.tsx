import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Scale, Ruler, Activity, HeartPulse, Wind, Thermometer, AlertCircle, Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VitalsFormProps {
    weight: string;
    height: string;
    pulse: string;
    spo2: string;
    bp: string;
    temperature: string;
    allergy: string;
    bloodGroup?: string;
    onExtraChange: (field: string, value: string) => void;
    onPatientDetailsChange: (field: string, value: string) => void;
    initialData?: any;
    initialPatientData?: any;
    isReadOnly?: boolean;
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
    bloodGroup,
    onExtraChange,
    onPatientDetailsChange,
    initialData,
    initialPatientData,
    isReadOnly = false
}) => {
    const diastolicRef = React.useRef<HTMLInputElement>(null);

    const handleBpPartChange = (part: 'systolic' | 'diastolic', value: string) => {
        const parts = bp ? bp.split('/') : ['', ''];
        const newSystolic = part === 'systolic' ? value : (parts[0] || '');
        const newDiastolic = part === 'diastolic' ? value : (parts[1] || '');

        if (!newSystolic && !newDiastolic) {
            onExtraChange('bp', '');
        } else {
            onExtraChange('bp', `${newSystolic}/${newDiastolic}`);
        }

        // Auto-focus diastolic field if systolic has 3 digits
        if (part === 'systolic' && value.length === 3) {
            diastolicRef.current?.focus();
        }
    };

    // Helper to determine if a field is autofilled (unchanged from initial) and highlighted
    const getStyle = (field: string, value: any) => {
        if (!initialData) return "bg-background/50";

        const initialValue = (initialData as any)[field];
        // Check if value equals initial value AND value is not empty/falsy
        // We trim strings to be safe
        const isUnchanged = String(value).trim() === String(initialValue || '').trim();
        const hasContent = value && String(value).trim().length > 0;

        if (isUnchanged && hasContent) {
            return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
        }
        return "bg-background/50"; // Default style
    };

    const getAllergyStyle = (value: string) => {
        if (!initialPatientData) return "bg-background/50";

        const initialValue = initialPatientData.allergies;
        const isUnchanged = String(value).trim() === String(initialValue || '').trim();
        const hasContent = value && String(value).trim().length > 0;

        if (isUnchanged && hasContent) {
            return "bg-amber-50/80 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-900/40";
        }
        return "bg-background/50";
    };

    // Auto-calculate BMI
    const bmiValue = React.useMemo(() => {
        const w = parseFloat(weight);
        const h = parseFloat(height) / 100; // Assuming height is in cm
        if (w > 0 && h > 0) {
            return (w / (h * h)).toFixed(1);
        }
        return '';
    }, [weight, height]);

    const bmiCategory = React.useMemo(() => {
        const val = parseFloat(bmiValue);
        if (isNaN(val)) return null;
        if (val < 18.5) return { label: 'Underweight', color: 'bg-blue-50 text-blue-700 border-blue-200' };
        if (val < 25) return { label: 'Normal', color: 'bg-green-50 text-green-700 border-green-200' };
        if (val < 30) return { label: 'Overweight', color: 'bg-orange-50 text-orange-700 border-orange-200' };
        return { label: 'Obese', color: 'bg-red-50 text-red-700 border-red-200' };
    }, [bmiValue]);

    // Evaluate Blood Pressure Category (AHA/ACC Guidelines)
    const bpCategory = React.useMemo(() => {
        if (!bp || !bp.includes('/')) return null;
        const [sysStr, diaStr] = bp.split('/');
        const sys = parseInt(sysStr);
        const dia = parseInt(diaStr);

        if (isNaN(sys) || isNaN(dia) || !sys || !dia) return null;

        if (sys > 180 || dia > 120) return { label: 'Crisis', color: 'bg-red-600/10 text-red-700 border-red-300 focus-visible:ring-red-500' };
        if (sys >= 140 || dia >= 90) return { label: 'Stage 2', color: 'bg-red-50 text-red-700 border-red-200 focus-visible:ring-red-400' };
        if (sys >= 130 || dia >= 80) return { label: 'Stage 1', color: 'bg-orange-50 text-orange-700 border-orange-200 focus-visible:ring-orange-400' };
        if (sys >= 120 && dia < 80) return { label: 'Elevated', color: 'bg-amber-50 text-amber-700 border-amber-200 focus-visible:ring-amber-400' };
        if (sys < 120 && dia < 80) return { label: 'Normal', color: 'bg-green-50 text-green-700 border-green-200 focus-visible:ring-green-400' };

        return null;
    }, [bp]);

    return (
        <div className="space-y-4" id="vitals-section">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-primary/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Medical Information</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="weight" className="text-sm font-medium">Weight (kg)</Label>
                    <div className="relative">
                        <Scale className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="weight"
                            value={weight}
                            onChange={e => onExtraChange('weight', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g., 70"
                            className={cn("pl-9", getStyle('weight', weight))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="height" className="text-sm font-medium">Height (cm)</Label>
                    <div className="relative">
                        <Ruler className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="height"
                            value={height}
                            onChange={e => onExtraChange('height', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g., 170"
                            className={cn("pl-9", getStyle('height', height))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* BMI only shown if both height and weight are entered */}
                {weight && height && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">BMI</Label>
                        <div className={cn(
                            "h-10 px-3 py-2 rounded-md border flex flex-col items-center justify-center font-bold animate-in fade-in zoom-in duration-300 leading-tight",
                            bmiCategory ? bmiCategory.color : "bg-primary/5 text-primary border-primary/10"
                        )}>
                            <span className="text-sm">{bmiValue || '--'}</span>
                            {bmiCategory && <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">{bmiCategory.label}</span>}
                        </div>
                    </div>
                )}

                <div className="space-y-2 col-span-2 lg:col-span-1">
                    <Label className="text-sm font-medium text-nowrap flex items-center justify-between">
                        BP
                        {bpCategory && <span className="text-[10px] uppercase font-bold opacity-70 animate-in fade-in slide-in-from-right-1">{bpCategory.label}</span>}
                    </Label>
                    <div className="flex items-center gap-1 relative">
                        <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 z-10" />
                        <Input
                            placeholder="Sys"
                            value={bp ? bp.split('/')[0] : ''}
                            onChange={e => handleBpPartChange('systolic', e.target.value)}
                            onFocus={e => e.target.select()}
                            className={cn(
                                "text-center pl-8 pr-1 transition-colors duration-300",
                                bpCategory ? bpCategory.color : getStyle('bp', bp)
                            )}
                            disabled={isReadOnly}
                        />
                        <span className="text-muted-foreground">/</span>
                        <Input
                            placeholder="Dia"
                            ref={diastolicRef}
                            value={bp ? bp.split('/')[1] || '' : ''}
                            onChange={e => handleBpPartChange('diastolic', e.target.value)}
                            onFocus={e => e.target.select()}
                            className={cn(
                                "text-center px-1 transition-colors duration-300",
                                bpCategory ? bpCategory.color : getStyle('bp', bp)
                            )}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="pulse" className="text-sm font-medium">Pulse (bpm)</Label>
                    <div className="relative">
                        <HeartPulse className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="pulse"
                            value={pulse}
                            onChange={e => onExtraChange('pulse', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g., 72"
                            className={cn("pl-9", getStyle('pulse', pulse))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="spo2" className="text-sm font-medium">SpO2 (%)</Label>
                    <div className="relative">
                        <Wind className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="spo2"
                            value={spo2}
                            onChange={e => onExtraChange('spo2', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g., 98"
                            className={cn("pl-9", getStyle('spo2', spo2))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-sm font-medium">Temp (F)</Label>
                    <div className="relative">
                        <Thermometer className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="temperature"
                            value={temperature}
                            onChange={e => onExtraChange('temperature', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="98.6"
                            className={cn("pl-9", getStyle('temperature', temperature))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2 lg:col-span-1">
                    <Label htmlFor="allergy" className="text-sm font-medium">Allergy</Label>
                    <div className="relative">
                        <AlertCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                            id="allergy"
                            value={allergy}
                            onChange={e => onExtraChange('allergy', e.target.value)}
                            onFocus={e => e.target.select()}
                            placeholder="e.g., Penicillin"
                            className={cn("pl-9", getAllergyStyle(allergy))}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="blood_group" className="text-sm font-medium">Blood Group</Label>
                    <div className="relative">
                        <Droplet className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 z-10" />
                        <Select value={bloodGroup} onValueChange={value => onPatientDetailsChange('blood_group', value)} disabled={isReadOnly}>
                            <SelectTrigger className="bg-background/50 pl-9">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
};
