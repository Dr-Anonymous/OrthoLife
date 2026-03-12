import React, { forwardRef } from 'react';
import { SurgicalConsentTemplate } from '@/types/inPatients';
import { CONSENT_RISKS } from '@/utils/consentConstants';

interface ConsentTemplatePrintProps {
    template: SurgicalConsentTemplate;
}

export const ConsentTemplatePrint = forwardRef<HTMLDivElement, ConsentTemplatePrintProps>(({ template }, ref) => {
    return (
        <div ref={ref} className="p-0">
            {/* English Version */}
            <div className="p-8 min-h-screen bg-white text-black font-serif">
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-tight">Surgical Consent Form</h1>
                    <p className="text-sm mt-2 font-sans font-medium text-slate-600">Patient Copy - English</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-sans border p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-2">
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">Procedure:</span> <br /><span className="text-base font-bold">{template.name}</span></p>
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">Patient Name:</span> <br /><span className="border-b border-dotted border-black inline-block w-48 h-5"></span></p>
                    </div>
                    <div className="space-y-2 text-right">
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">Date:</span> <br /><span className="border-b border-dotted border-black inline-block w-32 h-5"></span></p>
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">UHID / Age:</span> <br /><span className="border-b border-dotted border-black inline-block w-32 h-5"></span></p>
                    </div>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">1. General Surgical Risks</h3>
                        <div className="text-sm prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: CONSENT_RISKS.en.general }} />
                    </section>

                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">2. Anesthesia Risks</h3>
                        <div className="text-sm prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: CONSENT_RISKS.en.anesthesia }} />
                    </section>

                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">3. Procedure Specific Risks ({template.name})</h3>
                        <div className="text-sm prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: template.risks_procedure_en || CONSENT_RISKS.en.procedure_placeholder }} />
                    </section>

                    <section className="mt-12 pt-12 border-t border-slate-200">
                        <p className="text-xs italic leading-relaxed text-slate-600 mb-8 whitespace-pre-wrap">
                            {CONSENT_RISKS.en.declaration('..............', template.name)}
                        </p>
                        <div className="grid grid-cols-3 gap-12 mt-16 pt-8">
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">Patient Signature</p>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">Witness Signature</p>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">Doctor Signature</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Page Break for Print */}
            <div className="page-break" style={{ pageBreakBefore: 'always' }} />

            {/* Telugu Version */}
            <div className="p-8 min-h-screen bg-white text-black font-serif">
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-tight">శస్త్రచికిత్స సమ్మతి పత్రం</h1>
                    <p className="text-sm mt-2 font-sans font-medium text-slate-600">Patient Copy - Telugu</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-sans border p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-2">
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">ఆపరేషన్:</span> <br /><span className="text-base font-bold">{template.name}</span></p>
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">రోగి పేరు:</span> <br /><span className="border-b border-dotted border-black inline-block w-48 h-5"></span></p>
                    </div>
                    <div className="space-y-2 text-right">
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">తేదీ:</span> <br /><span className="border-b border-dotted border-black inline-block w-32 h-5"></span></p>
                        <p><span className="font-bold text-slate-500 uppercase text-[10px]">UHID / వయస్సు:</span> <br /><span className="border-b border-dotted border-black inline-block w-32 h-5"></span></p>
                    </div>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">1. సాధారణ శస్త్రచికిత్స ప్రమాదాలు</h3>
                        <div className="text-sm prose prose-slate max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: CONSENT_RISKS.te.general }} />
                    </section>

                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">2. అనస్థీషియా ప్రమాదాలు</h3>
                        <div className="text-sm prose prose-slate max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: CONSENT_RISKS.te.anesthesia }} />
                    </section>

                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1 mb-4 border-l-4 border-slate-900">3. శస్త్రచికిత్స నిర్దిష్ట ప్రమాదాలు ({template.name})</h3>
                        <div className="text-sm prose prose-slate max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: template.risks_procedure_te || CONSENT_RISKS.te.procedure_placeholder }} />
                    </section>

                    <section className="mt-12 pt-12 border-t border-slate-200">
                        <p className="text-xs italic leading-relaxed text-slate-600 mb-8 whitespace-pre-wrap">
                            {CONSENT_RISKS.te.declaration('..............', template.name)}
                        </p>
                        <div className="grid grid-cols-3 gap-12 mt-16 pt-8">
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">రోగి సంతకం</p>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">సాక్షి సంతకం</p>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider">డాక్టర్ సంతకం</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .page-break {
                        display: block;
                        page-break-before: always;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                    }
                    @page {
                        margin: 15mm;
                    }
                }
            `}} />
        </div>
    );
});

ConsentTemplatePrint.displayName = 'ConsentTemplatePrint'; 
