import React from 'react';
import {
    Stethoscope,
    Pill,
    FileText,
    NotebookText,
    Syringe,
    Share,
    Activity,
    Scale,
    Thermometer,
    AlertCircle,
    Eye,
    Microscope,
    Clock,
    Undo2
} from 'lucide-react';

export interface ConsultationData {
    bp?: string;
    weight?: string;
    temperature?: string;
    allergy?: string;
    complaints?: string;
    findings?: string;
    investigations?: string;
    diagnosis?: string;
    medications?: any[];
    procedure?: string;
    advice?: string;
    followup?: string;
    referred_to?: string;
    personalNote?: string;
    [key: string]: any;
}

interface ConsultationCardProps {
    data: ConsultationData;
    highlightKeyword?: (text: string) => string;
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({ data, highlightKeyword }) => {
    if (!data) return null;

    const renderText = (text: string) => {
        if (!text) return null;
        if (highlightKeyword) {
            return <span dangerouslySetInnerHTML={{ __html: highlightKeyword(text) }} />;
        }
        return text;
    };

    return (
        <div className="space-y-4">
            {/* Vitals Section */}
            {(data.bp || data.weight || data.temperature) && (
                <div className="flex items-start gap-3 p-3 bg-white rounded border border-border/50">
                    <Activity className="w-5 h-5 mt-0.5 text-primary" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-2">Vitals</h4>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {data.bp && (
                                <span className="flex items-center gap-1.5" title="Blood Pressure">
                                    <span className="font-medium">BP:</span> {renderText(data.bp)}
                                </span>
                            )}
                            {data.weight && (
                                <span className="flex items-center gap-1.5" title="Weight">
                                    <Scale className="w-3.5 h-3.5" /> {renderText(data.weight)}
                                </span>
                            )}
                            {data.temperature && (
                                <span className="flex items-center gap-1.5" title="Temperature">
                                    <Thermometer className="w-3.5 h-3.5" /> {renderText(data.temperature)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Allergies - Important to show prominently */}
            {data.allergy && (
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-1 text-destructive" />
                    <div>
                        <h4 className="font-semibold text-destructive">Allergies</h4>
                        <p className="text-sm text-muted-foreground">{renderText(data.allergy)}</p>
                    </div>
                </div>
            )}

            {/* Doctor's Note */}
            {data.personalNote && (
                <div className="flex items-start gap-3">
                    <NotebookText className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Doctor's Personal Note</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.personalNote)}</p>
                    </div>
                </div>
            )}

            {/* Complaints */}
            {data.complaints && (
                <div className="flex items-start gap-3">
                    <Stethoscope className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Complaints</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.complaints)}</p>
                    </div>
                </div>
            )}

            {/* Findings */}
            {data.findings && (
                <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Clinical Findings</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.findings)}</p>
                    </div>
                </div>
            )}

            {/* Investigations */}
            {data.investigations && (
                <div className="flex items-start gap-3">
                    <Microscope className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Investigations</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.investigations)}</p>
                    </div>
                </div>
            )}

            {/* Diagnosis */}
            {data.diagnosis && (
                <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Diagnosis</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.diagnosis)}</p>
                    </div>
                </div>
            )}

            {/* Medications */}
            {data.medications && data.medications.length > 0 && (
                <div className="flex items-start gap-3">
                    <Pill className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Medications</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                            {data.medications.map((med: any, index: number) => (
                                <li key={index}>
                                    {highlightKeyword ? (
                                        <span dangerouslySetInnerHTML={{ __html: highlightKeyword(`${med.name}${med.duration ? ` - ${med.duration}` : ''} - ${med.dose || ''}`) }} />
                                    ) : (
                                        `${med.name}${med.duration ? ` - ${med.duration}` : ''} - ${med.dose || ''}`
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Procedure */}
            {data.procedure && (
                <div className="flex items-start gap-3">
                    <Syringe className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Procedure Done</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.procedure)}</p>
                    </div>
                </div>
            )}

            {/* Advice */}
            {data.advice && (
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Advice</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.advice)}</p>
                    </div>
                </div>
            )}

            {/* Follow Up */}
            {data.followup && (
                <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Follow Up</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.followup)}</p>
                    </div>
                </div>
            )}

            {/* Referred To */}
            {data.referred_to && (
                <div className="flex items-start gap-3">
                    <Share className="w-5 h-5 mt-1 text-primary" />
                    <div>
                        <h4 className="font-semibold">Referred To</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{renderText(data.referred_to)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsultationCard;
