import React, { forwardRef } from 'react';
import { calculateAge } from '@/lib/age';
import { OTNotesTemplate } from '@/types/inPatients';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useConsultant } from '@/context/ConsultantContext';

interface OTNotesTemplatePrintProps {
    template: OTNotesTemplate;
    printInfo: {
        patientName: string;
        patientAge: string;
        uhid: string;
        date: string;
        limbSide: string;
        implantMaterial: string;
        fixationStatus: string;
    };
    specData?: Record<string, string>;
    customContent?: string;
}

export const OTNotesTemplatePrint = forwardRef<HTMLDivElement, OTNotesTemplatePrintProps>(
    ({ template, printInfo, specData = {}, customContent }, ref) => {
        const { user } = useAuth();
        const { consultant } = useConsultant();
        
        // consultant.name is an object { en: string, te: string }
        const surgeonName = consultant?.name?.en || (typeof user?.displayName === 'string' ? user.displayName : 'Surgeon');

        const getCleanValue = (val: string, fallback: string) => {
            if (!val || val === 'N/A' || val === 'None/NA' || val === 'None/NA (ACL)') return fallback;
            return val;
        };

        const replacePlaceholders = (content: string | null) => {
            if (!content) return '';
            
            let replaced = content;
            
            replaced = replaced.replace(/{{PatientName}}/g, printInfo.patientName || '________________');
            replaced = replaced.replace(/{{PatientAge}}/g, printInfo.patientAge || '____');
            replaced = replaced.replace(/{{UHID}}/g, printInfo.uhid || '________________');
            replaced = replaced.replace(/{{Date}}/g, printInfo.date ? format(new Date(printInfo.date), 'dd/MM/yyyy') : '__________');
            replaced = replaced.replace(/{{LimbSide}}/g, getCleanValue(printInfo.limbSide, '__________'));
            replaced = replaced.replace(/{{ImplantMaterial}}/g, getCleanValue(printInfo.implantMaterial, '________________'));
            replaced = replaced.replace(/{{FixationStatus}}/g, getCleanValue(printInfo.fixationStatus, '__________'));
            
            // Add dynamic spec placeholders
            replaced = replaced.replace(/{{GraftType}}/g, specData.graftType || '__________');
            replaced = replaced.replace(/{{GraftSize}}/g, specData.graftSize || '____');
            replaced = replaced.replace(/{{Levels}}/g, specData.levels || '__________');
            replaced = replaced.replace(/{{RodLength}}/g, specData.rodLength || '____');
            replaced = replaced.replace(/{{ScrewCount}}/g, specData.screwCount || '____');
            replaced = replaced.replace(/{{PlateType}}/g, specData.plateType || '__________');
            replaced = replaced.replace(/{{PlateHoles}}/g, specData.plateHoles || '____');
            replaced = replaced.replace(/{{CorticalScrews}}/g, specData.corticalScrews || '____');
            replaced = replaced.replace(/{{LockingScrews}}/g, specData.lockingScrews || '____');
            replaced = replaced.replace(/{{FemoralSize}}/g, specData.femoralSize || '____');
            replaced = replaced.replace(/{{TibialSize}}/g, specData.tibialSize || '____');
            replaced = replaced.replace(/{{PolySize}}/g, specData.polySize || '____');
            
            return replaced;
        };

        const getProcedureType = (name: string) => {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('acl')) return 'ACL';
            if (lowerName.includes('tkr') || lowerName.includes('knee replacement')) return 'TKR';
            if (lowerName.includes('thr') || lowerName.includes('hip replacement')) return 'THR';
            if (lowerName.includes('spine') || lowerName.includes('acdf') || lowerName.includes('laminectomy')) return 'SPINE';
            if (lowerName.includes('plating') || lowerName.includes('orif') || lowerName.includes('fixation')) return 'TRAUMA';
            return 'GENERAL';
        };

        const procedureType = getProcedureType(template.name);
        const showFixation = procedureType === 'TKR' || procedureType === 'THR';
        const showLimbSide = procedureType !== 'SPINE';

        const finalHtml = customContent ? customContent : replacePlaceholders(template.content);

        return (
            <div ref={ref} className="p-12 text-black bg-white min-h-screen font-serif mx-auto" style={{ width: '210mm', fontSize: '13pt' }}>
                <div className="text-center mb-8 border-b-2 pb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-tight">Operation Theater Notes</h1>
                    <p className="text-sm mt-1">Professional Medical Record | OrthoLife</p>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 text-sm border p-4 bg-gray-50/50 rounded-lg print:bg-transparent print:border-gray-200">
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Patient Name:</span>
                        <span>{printInfo.patientName || '________________'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Date:</span>
                        <span>{printInfo.date ? format(new Date(printInfo.date), 'dd MMM yyyy') : '__________'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">UHID:</span>
                        <span>{printInfo.uhid || '________________'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Age/Sex:</span>
                        <span>{printInfo.patientAge || '____'}</span>
                    </div>
                    {showLimbSide && (
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-bold">Limb Side:</span>
                            <span className="font-bold uppercase text-primary print:text-black">{getCleanValue(printInfo.limbSide, '__________')}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Implant:</span>
                        <span>{getCleanValue(printInfo.implantMaterial, '________________')}</span>
                    </div>
                    {showFixation && (
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-bold">Fixation:</span>
                            <span>{getCleanValue(printInfo.fixationStatus, '__________')}</span>
                        </div>
                    )}
                </div>

                {/* Surgical Specs Box */}
                {!customContent && Object.keys(specData).length > 0 && (
                    <div className="mb-8 border border-black p-5 rounded-md bg-gray-50/30">
                        <h3 className="text-sm font-bold uppercase mb-4 border-b border-black pb-1 leading-none">Surgical Specifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-3 text-[12pt]">
                            {Object.entries(specData).map(([key, value]) => (
                                value && (
                                    <div key={key} className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                                        <span className="capitalize text-gray-700 min-w-[120px]">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                        <span className="font-bold text-right pl-4">
                                            {value}
                                            {(key.toLowerCase().includes('size') || key.toLowerCase().includes('length')) ? ' mm' : ''}
                                        </span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 print:prose-p:my-1">
                    <div 
                        dangerouslySetInnerHTML={{ __html: finalHtml }} 
                        className="ot-note-content leading-relaxed"
                    />
                </div>

                {!customContent && (
                    <div className="mt-20 flex justify-end gap-24">
                        <div className="text-center border-t pt-2 w-48">
                            <p className="font-bold">{surgeonName}</p>
                            <p className="text-xs text-muted-foreground italic">Operating Surgeon</p>
                        </div>
                        <div className="text-center border-t pt-2 w-48">
                            <p className="font-bold invisible">Signature</p>
                            <p className="text-xs text-muted-foreground italic">Assistant / Nurse</p>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page { margin: 2cm; }
                        body { -webkit-print-color-adjust: exact; }
                        .ot-note-content { font-size: 13pt; line-height: 1.6; }
                        h2, h3, h4 { color: black !important; }
                    }
                    .ot-note-content p { margin-bottom: 0.5rem; }
                    .ot-note-content h2 { font-size: 1.25rem; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 0.25rem; margin-top: 1.5rem; }
                `}} />
            </div>
        );
    }
);

OTNotesTemplatePrint.displayName = 'OTNotesTemplatePrint';
