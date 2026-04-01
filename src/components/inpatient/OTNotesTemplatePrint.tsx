import React, { forwardRef } from 'react';
import { OTNotesTemplate } from '@/types/inPatients';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

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
}

export const OTNotesTemplatePrint = forwardRef<HTMLDivElement, OTNotesTemplatePrintProps>(
    ({ template, printInfo }, ref) => {
        const { user } = useAuth();
        const replacePlaceholders = (content: string | null) => {
            if (!content) return '';
            
            let replaced = content;
            replaced = replaced.replace(/{{PatientName}}/g, printInfo.patientName || '________________');
            replaced = replaced.replace(/{{PatientAge}}/g, printInfo.patientAge || '____');
            replaced = replaced.replace(/{{UHID}}/g, printInfo.uhid || '________________');
            replaced = replaced.replace(/{{Date}}/g, printInfo.date ? format(new Date(printInfo.date), 'dd/MM/yyyy') : '__________');
            replaced = replaced.replace(/{{LimbSide}}/g, printInfo.limbSide || '____');
            replaced = replaced.replace(/{{ImplantMaterial}}/g, printInfo.implantMaterial || '____');
            replaced = replaced.replace(/{{FixationStatus}}/g, printInfo.fixationStatus || '____');
            
            return replaced;
        };

        return (
            <div ref={ref} className="p-12 text-black bg-white min-h-screen font-serif" style={{ fontSize: '13pt' }}>
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
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Limb Side:</span>
                        <span className="font-bold uppercase text-primary print:text-black">{printInfo.limbSide}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Implant:</span>
                        <span>{printInfo.implantMaterial}</span>
                    </div>
                     <div className="flex justify-between border-b pb-1">
                        <span className="font-bold">Fixation:</span>
                        <span>{printInfo.fixationStatus}</span>
                    </div>
                </div>

                <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 print:prose-p:my-1">
                    <div 
                        dangerouslySetInnerHTML={{ __html: replacePlaceholders(template.content) }} 
                        className="ot-note-content leading-relaxed"
                    />
                </div>

                <div className="mt-20 flex justify-end gap-24">
                    <div className="text-center border-t pt-2 w-48">
                        <p className="font-bold">{user?.displayName || 'Surgeon'}</p>
                        <p className="text-xs text-muted-foreground italic">Operating Surgeon</p>
                    </div>
                    <div className="text-center border-t pt-2 w-48">
                        <p className="font-bold invisible">Signature</p>
                        <p className="text-xs text-muted-foreground italic">Assistant / Nurse</p>
                    </div>
                </div>

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
