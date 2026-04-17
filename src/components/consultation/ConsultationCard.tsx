import React from 'react';
import {
    User,
    Stethoscope,
    Pill,
    FileText,
    NotebookText,
    Syringe,
    Activity,
    Scale,
    Thermometer,
    AlertCircle,
    Eye,
    Microscope,
    Clock,
    Undo2,
    ArrowRightCircle,
    Calendar,
    MapPin,
    Tag,
    CheckCircle2,
    Briefcase,
    Droplets
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { calculateAge } from '@/lib/age';

export interface ConsultationData {
    created_at?: string;
    location?: string;
    visit_type?: string;
    status?: string;
    bp?: string;
    weight?: string;
    temperature?: string;
    allergy?: string;
    allergies?: string;
    blood_group?: string;
    occupation?: string;
    hometown?: string;
    sex?: string;
    age?: number | string;
    dob?: string;
    name?: string;
    phone?: string;
    secondary_phone?: string;
    complaints?: string;
    findings?: string;
    investigations?: string;
    diagnosis?: string;
    medications?: any[];
    procedure?: string;
    advice?: string;
    followup?: string;
    referred_to?: string;
    referred_to_list?: string[];
    referred_by?: string;
    personalNote?: string;
    consultant_name?: string;
    [key: string]: any;
}

interface ConsultationCardProps {
    data: ConsultationData;
    highlightKeyword?: (text: string) => React.ReactNode;
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({ data, highlightKeyword }) => {
    if (!data) return null;

    const renderText = (text: string) => {
        if (!text) return null;
        return highlightKeyword ? highlightKeyword(text) : text;
    };

    return (
        <div className="space-y-4">
            {/* Header / Identity Section */}
            {(data.name || data.sex || data.age || data.dob || data.phone) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                        {data.name && <h3 className="text-xl font-bold text-primary">{renderText(data.name)}</h3>}
                        {(data.sex || data.age || data.dob) && (
                            <span className="text-sm font-semibold text-muted-foreground bg-muted/80 backdrop-blur-sm px-2 py-0.5 rounded flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {data.sex === 'M' ? 'M' : data.sex === 'F' ? 'F' : data.sex}
                                {((data.sex && (data.age || data.dob)) ? ' / ' : '')}
                                {data.age || calculateAge(data.dob)}
                                {(data.age || data.dob) ? 'Y' : ''}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Meta Information Section */}
            {(data.created_at || data.location || data.visit_type || data.status) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 bg-primary/5 rounded-lg border border-primary/10 mb-2 shadow-sm">
                    {data.created_at && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <p className="font-semibold text-sm">
                                {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })} ({format(new Date(data.created_at), 'PPP')})
                            </p>
                        </div>
                    )}
                    {data.location && (
                        <div className="flex items-center gap-2 border-l pl-4 border-border/50 first:border-0 first:pl-0">
                            <MapPin className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium">
                                {renderText(data.location)}
                            </p>
                        </div>
                    )}
                    {data.visit_type && (
                        <div className="flex items-center gap-2 border-l pl-4 border-border/50">
                            <Tag className="w-4 h-4 text-primary" />
                            <p className="text-sm capitalize font-medium">
                                {renderText(data.visit_type)}
                            </p>
                        </div>
                    )}
                    {data.status && (
                        <div className="flex items-center gap-2 border-l pl-4 border-border/50">
                            <CheckCircle2 className={`w-4 h-4 ${data.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`} />
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${data.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {data.status}
                            </span>
                        </div>
                    )}
                    {data.consultant_name && (
                        <div className="flex items-center gap-2 border-l pl-4 border-border/50">
                            <Briefcase className="w-4 h-4 text-primary" />
                            <p className="text-sm font-semibold text-primary/80">
                                {renderText(data.consultant_name)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Vitals Section */}
            {(data.bp || data.weight || data.temperature || data.blood_group || data.occupation || data.hometown) && (
                <div className="flex items-start gap-3 p-3 bg-white rounded border border-border/50 shadow-sm">
                    <Activity className="w-5 h-5 mt-0.5 text-primary" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Vitals & Info</h4>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                            {data.bp && (
                                <span className="flex items-center gap-1.5" title="Blood Pressure">
                                    <span className="font-medium">BP:</span> {renderText(data.bp)}
                                </span>
                            )}
                            {data.weight && (
                                <span className="flex items-center gap-1.5" title="Weight">
                                    <Scale className="w-3.5 h-3.5 text-primary/70" /> {renderText(data.weight)}
                                </span>
                            )}
                            {data.temperature && (
                                <span className="flex items-center gap-1.5" title="Temperature">
                                    <Thermometer className="w-3.5 h-3.5 text-primary/70" /> {renderText(data.temperature)}
                                </span>
                            )}
                            {data.blood_group && (
                                <span className="flex items-center gap-1.5" title="Blood Group">
                                    <Droplets className="w-3.5 h-3.5 text-red-600/70" /> {renderText(data.blood_group)}
                                </span>
                            )}
                            {data.occupation && (
                                <span className="flex items-center gap-1.5" title="Occupation">
                                    <Briefcase className="w-3.5 h-3.5 text-primary/70" /> {renderText(data.occupation)}
                                </span>
                            )}
                            {data.hometown && (
                                <span className="flex items-center gap-1.5" title="Hometown">
                                    <MapPin className="w-3.5 h-3.5 text-primary/70" /> {renderText(data.hometown)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Sections */}
            {[
                { label: "Allergies", value: data.allergies || data.allergy, icon: AlertCircle, color: "text-destructive" },
                { label: "Doctor's Note", value: data.personalNote || data.personal_note, icon: NotebookText },
                { label: "Complaints", value: data.complaints, icon: Stethoscope },
                { label: "Clinical Findings", value: data.findings, icon: Eye },
                { label: "Investigations", value: data.investigations, icon: Microscope },
                { label: "Diagnosis", value: data.diagnosis, icon: Activity },
            ].map((section, idx) => section.value && (
                <div key={idx} className="flex items-start gap-3 p-1">
                    <section.icon className={`w-5 h-5 mt-1 ${section.color || 'text-primary'}`} />
                    <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${section.color || ''}`}>{section.label}</h4>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5 leading-relaxed">{renderText(section.value)}</p>
                    </div>
                </div>
            ))}

            {/* Medications */}
            {data.medications && data.medications.length > 0 && (
                <div className="flex items-start gap-3 p-1">
                    <Pill className="w-5 h-5 mt-1 text-primary" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">Medications</h4>
                        <div className="mt-2 space-y-2">
                            {data.medications.map((med: any, index: number) => {
                                // Format frequency from structured data or custom string
                                const getFrequencyDisplay = () => {
                                    const parts = [];
                                    if (med.freqMorning !== undefined || med.freqNoon !== undefined || med.freqNight !== undefined) {
                                        const m = med.freqMorning ? '1' : '0';
                                        const n = med.freqNoon ? '1' : '0';
                                        const ni = med.freqNight ? '1' : '0';
                                        // Only show if at least one is true
                                        if (med.freqMorning || med.freqNoon || med.freqNight) {
                                            parts.push(`${m}-${n}-${ni}`);
                                        }
                                    }
                                    if (med.frequency && !parts.includes(med.frequency)) {
                                        parts.push(med.frequency);
                                    }
                                    return parts.join(' ');
                                };

                                const freqDisplay = getFrequencyDisplay();

                                return (
                                    <div key={index} className="text-sm bg-muted/40 p-2.5 rounded border border-border/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 group hover:bg-muted/60 transition-colors">
                                        <div className="flex-1">
                                            <span className="font-medium text-primary/90">
                                                {renderText(med.brandName || med.composition || med.name || '')}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {freqDisplay && (
                                                <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20" title="Frequency">
                                                    {freqDisplay}
                                                </span>
                                            )}
                                            {med.dose && (
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50" title="Dose">
                                                    {med.dose}
                                                </span>
                                            )}
                                            {med.duration && (
                                                <span className="text-xs text-muted-foreground italic font-medium" title="Duration">
                                                    {med.duration}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Sections */}
            {[
                { label: "Procedure Done", value: data.procedure, icon: Syringe },
                { label: "Advice", value: data.advice, icon: FileText },
                { label: "Follow Up", value: data.followup, icon: Clock },
                { label: "Referred By", value: data.referred_by, icon: Undo2 },
            ].map((section, idx) => section.value && (
                <div key={idx} className="flex items-start gap-3 p-1">
                    <section.icon className="w-5 h-5 mt-1 text-primary" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">{section.label}</h4>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5 leading-relaxed">{renderText(section.value)}</p>
                    </div>
                </div>
            ))}

            {/* Referred To */}
            {(data.referred_to_list?.length > 0 || (!('referred_to_list' in data) && data.referred_to)) && (
                <div className="flex items-start gap-3 p-1">
                    <ArrowRightCircle className="w-5 h-5 mt-1 text-primary" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">Referred To</h4>
                        <div className="mt-2">
                            {data.referred_to_list && data.referred_to_list.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {data.referred_to_list.map((name, i) => (
                                        <span key={i} className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">
                                            {renderText(name)}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{renderText(data.referred_to)}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationCard;
