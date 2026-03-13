import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurgicalConsent, InPatient, SurgicalConsentTemplate } from '@/types/inPatients';
import {
    Camera,
    Save,
    Eraser,
    Lock,
    AlertTriangle,
    Send,
    Calendar,
    ArrowLeft,
    FileText,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { calculateAge } from "@/lib/age";
import { supabase } from '@/integrations/supabase/client';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from '@/integrations/firebase/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import RichTextEditor from '@/components/RichTextEditor';
import { CONSENT_RISKS } from '@/utils/consentConstants';

interface SurgicalConsentFormProps {
    patient: InPatient;
    onSave: (data: Partial<SurgicalConsent>, shouldClose?: boolean) => Promise<any>;
    onCancel: () => void;
    initialData?: Partial<SurgicalConsent>;
    isReadOnly?: boolean;
}

export const SurgicalConsentForm: React.FC<SurgicalConsentFormProps> = ({
    patient,
    onSave,
    onCancel,
    initialData,
    isReadOnly = false
}) => {
    if (!patient) return null;

    const [step, setStep] = useState(1);
    const lang = patient.language === 'te' ? 'te' : 'en';
    const content = CONSENT_RISKS[lang as keyof typeof CONSENT_RISKS] || CONSENT_RISKS.en;

    const [formData, setFormData] = useState<Partial<SurgicalConsent>>({
        in_patient_id: patient.id,
        id: initialData?.id,
        procedure_name: initialData?.procedure_name || patient.procedure || '',
        surgery_date: initialData?.surgery_date || (patient.procedure_date ? new Date(patient.procedure_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        risks_general: initialData?.risks_general || (patient.language === 'te' ? CONSENT_RISKS.te.general : CONSENT_RISKS.en.general),
        risks_anesthesia: initialData?.risks_anesthesia || content.anesthesia,
        risks_procedure: initialData?.risks_procedure || content.procedure_placeholder,
        patient_phone: initialData?.patient_phone || patient.patient.phone,
        consent_status: initialData?.consent_status || 'pending',
        consent_language: initialData?.consent_language || lang,
        signed_at: initialData?.signed_at,
        patient_signature: initialData?.patient_signature,
        selfie_url: initialData?.selfie_url,
        guardian_name: initialData?.guardian_name || '',
        is_minor: initialData?.is_minor || false
    });

    // Age calculation
    const calculatePatientAge = (dob: string | null): number => {
        if (!dob) return 0;
        const dobDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
        }
        return age;
    };

    const patientAge = calculatePatientAge(patient.patient.dob);
    const isMinor = patientAge > 0 && patientAge < 18;

    // Set is_minor in formData if it changes
    useEffect(() => {
        if (isMinor !== formData.is_minor) {
            setFormData(prev => ({ ...prev, is_minor: isMinor }));
        }
    }, [isMinor]);

    // Signature Refs
    const patientSigRef = useRef<SignatureCanvas>(null);
    const doctorSigRef = useRef<SignatureCanvas>(null);
    const witnessSigRef = useRef<SignatureCanvas>(null);

    // Selfie State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [selfieImage, setSelfieImage] = useState<string | null>(initialData?.selfie_url || null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    // OTP State
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Fetch Templates
    const { data: templates } = useQuery({
        queryKey: ['surgical-consent-templates-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('surgical_consent_templates')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as SurgicalConsentTemplate[];
        },
        enabled: step === 2
    });

    // Aggressive normalization for reliable semantic HTML comparison
    const normalizeHTML = (html: string | undefined | null) => {
        if (!html) return '';
        return html
            // 1. Strip attributes from all tags
            .replace(/<([^>]+)>/g, (match, tagContents) => {
                const tagName = tagContents.split(' ')[0].toLowerCase();
                return `<${tagName}>`;
            })
            // 2. Remove "noise" tags that editors inject but don't change meaning
            .replace(/<\/?(p|span|br|div)\b[^>]*>/gi, '')
            // 3. Remove all whitespace and entities
            .replace(/&nbsp;/g, '')
            .replace(/\s+/g, '')
            // 4. Final cleanup
            .trim()
            .toLowerCase();
    };

    const handleLoadTemplate = (templateId: string) => {
        const template = templates?.find(t => t.id === templateId);
        if (template) {
            const currentLang = formData.consent_language || lang;
            const defaults = CONSENT_RISKS[currentLang as keyof typeof CONSENT_RISKS] || CONSENT_RISKS.en;
            const rawRisks = currentLang === 'te' ? template.risks_procedure_te || '' : template.risks_procedure_en || '';
            // Strip redundant <h2> headers from the template content
            const templateRisks = rawRisks.replace(/<h2[^>]*>.*?<\/h2>/gi, '').trim();

            setFormData(prev => {
                const currentRisks = prev.risks_procedure || '';
                const normalizedCurrent = normalizeHTML(currentRisks);
                const isEmpty = !normalizedCurrent || 
                                normalizedCurrent === '<p></p>' || 
                                normalizedCurrent === '<p><br></p>' || 
                                normalizedCurrent === normalizeHTML(defaults.procedure_placeholder);

                const headerEn = `Procedure Specific Risks of ${template.name}`;
                const headerTe = `${template.name} శస్త్రచికిత్స యొక్క నిర్దిష్ట ప్రమాదాలు`;
                const header = currentLang === 'te' ? headerTe : headerEn;

                const newChunk = `<div style="margin-bottom: 28px;">
                    <h4 style="font-weight: bold; text-decoration: underline; margin-bottom: 12px; font-size: 1.1em;">${header}</h4>
                    ${templateRisks}
                </div>`;

                let newRisksProcedure = '';
                if (isEmpty) {
                    newRisksProcedure = newChunk;
                } else {
                    newRisksProcedure = `${currentRisks}${newChunk}`;
                }

                return {
                    ...prev,
                    risks_procedure: newRisksProcedure
                };
            });
            toast.success(`Loaded template: ${template.name}`);
        }
    };

    // Load signatures and data if editing/viewing
    useEffect(() => {
        if (initialData?.id) {
            setFormData(prev => ({
                ...prev,
                id: initialData.id,
                // Ensure other fields are also updated if they exist in initialData
                procedure_name: initialData.procedure_name || prev.procedure_name,
                surgery_date: initialData.surgery_date ? new Date(initialData.surgery_date).toISOString().split('T')[0] : prev.surgery_date,
                patient_phone: initialData.patient_phone || prev.patient_phone,
                // If the db returns empty for general/anesthesia, use constants
                risks_general: initialData.risks_general || CONSENT_RISKS[initialData.consent_language as keyof typeof CONSENT_RISKS || 'en'].general,
                risks_anesthesia: initialData.risks_anesthesia || CONSENT_RISKS[initialData.consent_language as keyof typeof CONSENT_RISKS || 'en'].anesthesia,
                risks_procedure: initialData.risks_procedure || prev.risks_procedure,
                consent_status: initialData.consent_status || prev.consent_status,
                consent_language: initialData.consent_language || prev.consent_language,
                patient_signature: initialData.patient_signature || prev.patient_signature,
                selfie_url: initialData.selfie_url || prev.selfie_url,
                signed_at: initialData.signed_at || prev.signed_at,
                guardian_name: initialData.guardian_name || prev.guardian_name,
                is_minor: initialData.is_minor !== undefined ? initialData.is_minor : (patientAge > 0 && patientAge < 18),
            }));

            // Also update selfie state if present
            if (initialData.selfie_url) {
                setSelfieImage(initialData.selfie_url);
            }
        }
    }, [initialData]);

    // --- Optimization Helper ---
    const getOptimizedPayload = (data: Partial<SurgicalConsent>) => {
        const currentLang = data.consent_language || lang;
        const defaults = CONSENT_RISKS[currentLang as keyof typeof CONSENT_RISKS] || CONSENT_RISKS.en;

        const optimized = { ...data };
        if (normalizeHTML(data.risks_general) === normalizeHTML(defaults.general)) {
            optimized.risks_general = '';
        }
        if (normalizeHTML(data.risks_anesthesia) === normalizeHTML(defaults.anesthesia)) {
            optimized.risks_anesthesia = '';
        }
        // Also clean procedure placeholder if unchanged
        if (normalizeHTML(data.risks_procedure) === normalizeHTML(defaults.procedure_placeholder)) {
            optimized.risks_procedure = '';
        }

        return optimized;
    };

    const handleNext = () => {
        if (step === 2) {
            // Auto-save draft when moving to verification step to prevent data loss
            const draftData = getOptimizedPayload({
                ...formData,
                in_patient_id: patient.id,
                consent_status: 'pending' as const,
            });
            // Use onSave result to update ID
            onSave(draftData, false).then(res => {
                if (res?.saved?.id) {
                    setFormData(prev => ({ ...prev, id: res.saved.id }));
                }
            });
        }
        setStep(prev => prev + 1);
    };
    const handleBack = () => setStep(prev => prev - 1);

    // --- Selfie ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setIsCameraOpen(false);
        }
    };

    // Attach stream to video element when it becomes available
    useEffect(() => {
        if (isCameraOpen && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 300, 225); // Aspect ratio 4:3
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setSelfieImage(dataUrl);
                stopCamera();
            }
        }
    };

    // --- Signatures ---
    const clearSignature = (ref: React.RefObject<SignatureCanvas>) => {
        ref.current?.clear();
        if (ref === patientSigRef) {
            setFormData(prev => ({ ...prev, patient_signature: null }));
        }
    };

    const handleSignatureEnd = () => {
        if (patientSigRef.current && !patientSigRef.current.isEmpty()) {
            setFormData(prev => ({ ...prev, patient_signature: patientSigRef.current?.toDataURL() }));
        }
    };

    // Restore signature when step changes or resize happens if data exists
    useEffect(() => {
        if (step === 3 && formData.patient_signature && patientSigRef.current) {
            // slight delay to allow canvas layout to settle
            setTimeout(() => {
                patientSigRef.current?.fromDataURL(formData.patient_signature!, { ratio: 1 });
            }, 100);
        }
    }, [step, formData.patient_signature]);

    // --- OTP ---
    useEffect(() => {
        if (isReadOnly) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-consent-container', {
                'size': 'invisible',
            });
        }
    }, []);

    const sendOtp = async () => {
        if (!formData.patient_phone) return;
        try {
            const appVerifier = window.recaptchaVerifier;
            const formattedPhone = formData.patient_phone.startsWith('+91') ? formData.patient_phone : `+91${formData.patient_phone}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setIsOtpSent(true);
            toast.success("OTP sent to " + formattedPhone);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to send OTP: " + err.message);
        }
    };

    const verifyOtp = async () => {
        if (!confirmationResult) return;
        setIsVerifying(true);
        try {
            await confirmationResult.confirm(otp);
            toast.success("OTP Verified Successfully");
            handleSubmit();
        } catch (err) {
            toast.error("Invalid OTP");
        } finally {
            setIsVerifying(false);
        }
    };

    // --- Upload Helper ---
    const uploadImage = async (dataUrl: string | null | undefined, prefix: string): Promise<string | null> => {
        if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || null;

        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const fileName = `${prefix}_${patient.id}_${Date.now()}.${blob.type.split('/')[1]}`;
            const { error } = await supabase.storage.from('consent-evidence').upload(fileName, blob);

            if (error) throw error;

            const { data } = supabase.storage.from('consent-evidence').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (e) {
            console.error(`Upload failed for ${prefix}`, e);
            return null;
        }
    };

    // --- Submit ---
    const handleSaveDraft = async () => {
        toast.loading("Saving draft...");

        try {
            // Upload images first to avoid base64 storage
            // Update local state is not strictly needed if we just use the returned URLs for the save
            // but good for consistency
            let finalSelfieUrl = await uploadImage(selfieImage, 'selfie');

            // For signature, update state from ref if needed before saving
            let sigData = formData.patient_signature;
            if (patientSigRef.current && !patientSigRef.current.isEmpty()) {
                sigData = patientSigRef.current.toDataURL();
            }
            let finalSigUrl = await uploadImage(sigData, 'sig');

            if (finalSelfieUrl && finalSelfieUrl !== selfieImage) {
                setSelfieImage(finalSelfieUrl);
            }
            if (finalSigUrl && finalSigUrl !== formData.patient_signature) {
                setFormData(prev => ({ ...prev, patient_signature: finalSigUrl }));
            }

            const finalData = getOptimizedPayload({
                ...formData,
                in_patient_id: patient.id,
                consent_status: 'pending' as const,
                selfie_url: finalSelfieUrl,
                patient_signature: finalSigUrl,
            });

            const res = await onSave(finalData);
            if (res?.saved?.id) {
                setFormData(prev => ({ ...prev, id: res.saved.id, selfie_url: finalSelfieUrl, patient_signature: finalSigUrl }));
            }
            toast.dismiss();
            toast.success("Draft saved");
        } catch (e: any) {
            console.error(e);
            toast.dismiss();
            toast.error("Failed to save draft: " + e.message);
        }
    };

    const handleWhatsApp = async () => {
        const draftData = getOptimizedPayload({
            ...formData,
            in_patient_id: patient.id,
            consent_status: 'pending' as const,
        });

        try {
            toast.loading("Saving draft...");
            const result = await onSave(draftData, false);
            toast.dismiss();

            const savedId = result?.saved?.id || initialData?.id;

            if (result?.saved?.id) {
                setFormData(prev => ({ ...prev, id: result.saved.id }));
            }

            if (savedId) {
                const link = `https://ortho.life/consent-verify/${savedId}`;
                const isTelugu = formData.consent_language === 'te';

                const message = isTelugu
                    ? `🙏 నమస్కారం ${patient.patient.name} గారు,\nదయచేసి ${formData.procedure_name} కోసం మీ సమ్మతి పత్రాన్ని ఈ లింక్ ద్వారా సమీక్షించి సంతకం చేయండి:\n${link}`
                    : `👋 Hello ${patient.patient.name},\nPlease review and sign your consent for ${formData.procedure_name} here:\n${link}`;

                try {
                    const { error } = await supabase.functions.invoke('send-whatsapp', {
                        body: { number: formData.patient_phone, message: message },
                    });

                    if (error) throw error;
                    toast.success("WhatsApp sent to patient!");
                } catch (err: any) {
                    console.error("Failed to send WhatsApp:", err);
                    toast.error("Failed to send WhatsApp message automatically. Opening WhatsApp...");
                    // Fallback to manual open if function fails
                    const encodedMessage = encodeURIComponent(message);
                    window.open(`https://wa.me/${formData.patient_phone}?text=${encodedMessage}`, '_blank');
                }
            } else {
                toast.error("Could not save draft to generate link.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to save draft.");
        }
    };

    const handleSubmit = async () => {
        // Upload Selfie
        let finalSelfieUrl = await uploadImage(selfieImage, 'selfie');

        // Signature
        let sigData = formData.patient_signature;
        if (patientSigRef.current && !patientSigRef.current.isEmpty()) {
            sigData = patientSigRef.current.toDataURL();
        } else if (patientSigRef.current && patientSigRef.current.isEmpty()) {
            // Check if user cleared it? If ref is empty but we have data, keep data?
            // Actually trust ref if explicitly modifying, but if loading existing, ref might be empty if not rendered
            // But we come from a flow.
            // Safe logic: if ref is valid and not empty, use it. Else use existing.
            if (patientSigRef.current && !patientSigRef.current.isEmpty()) {
                sigData = patientSigRef.current.toDataURL();
            }
        }
        let finalSigUrl = await uploadImage(sigData, 'sig');

        const finalData = getOptimizedPayload({
            ...formData,
            in_patient_id: patient.id,
            patient_signature: finalSigUrl,
            selfie_url: finalSelfieUrl,
            consent_status: 'signed' as const,
            signed_at: new Date().toISOString(),
        });

        onSave(finalData);
    };

    const isTelugu = formData.consent_language === 'te' || patient.language === 'te';
    const RISK_LABELS = {
        en: {
            general: "General Surgical Risks",
            anesthesia: "Anesthesia Risks",
            procedure: "Procedure Specific Risks"
        },
        te: {
            general: "సాధారణ శస్త్రచికిత్స ప్రమాదాలు",
            anesthesia: "అనస్థీషియా (మత్తు) ప్రమాదాలు",
            procedure: "శస్త్రచికిత్స నిర్దిష్ట ప్రమాదాలు"
        }
    };
    const t = isTelugu ? RISK_LABELS.te : RISK_LABELS.en;

    if (isReadOnly) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                    <div className="text-center border-b pb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">Surgical Consent Form</h2>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-lg font-semibold text-primary">{formData.procedure_name}</p>
                            <p className="text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {formData.surgery_date ? format(new Date(formData.surgery_date), 'dd MMM yyyy') : ''}
                            </p>
                        </div>
                        <div className="mt-6 p-4 bg-white border rounded-xl shadow-sm inline-block text-left">
                            <p className="text-sm font-medium text-slate-700">
                                <span className="text-muted-foreground mr-2 font-normal uppercase tracking-wider text-[10px]">Patient:</span>
                                {patient.patient.name} ({calculateAge(patient.patient.dob || null)})
                            </p>
                            {formData.is_minor && (
                                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1.5 ring-1 ring-orange-100 bg-orange-50 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Minor - Guardian Consent Required
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t.general}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formData.risks_general || CONSENT_RISKS[lang as keyof typeof CONSENT_RISKS].general }} />
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t.anesthesia}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formData.risks_anesthesia || CONSENT_RISKS[lang as keyof typeof CONSENT_RISKS].anesthesia }} />
                            </CardContent>
                        </Card>
                        <Card className="col-span-full border-none shadow-sm border-l-4 border-l-primary">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">{t.procedure}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm sm:prose-base max-w-none text-slate-800 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: formData.risks_procedure || CONSENT_RISKS[lang as keyof typeof CONSENT_RISKS].procedure_placeholder }} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start border-t pt-8">
                        {formData.patient_signature && (
                            <div className="space-y-3">
                                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{formData.is_minor ? 'Guardian Signature' : 'Patient Signature'}</p>
                                <div className="bg-white border p-4 rounded-xl shadow-sm inline-block min-w-[200px]">
                                    {formData.is_minor && <p className="text-[10px] font-bold text-muted-foreground mb-2">Signed by: {formData.guardian_name}</p>}
                                    <img src={formData.patient_signature} alt="Signature" className="h-auto max-h-32 object-contain mx-auto" />
                                </div>
                            </div>
                        )}
                        {formData.selfie_url && (
                            <div className="space-y-3">
                                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{formData.is_minor ? 'Identity Verification' : 'Patient Identification'}</p>
                                <div className="relative group">
                                    <img src={formData.selfie_url} alt="Verification" className="w-full max-w-[250px] aspect-[4/3] object-cover rounded-xl shadow-md ring-4 ring-white" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] p-2 rounded-b-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        Identity Verified via Multi-Factor Auth
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-center pt-8 border-t border-dashed">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                            <CheckCircle2 className="w-4 h-4" />
                            Signed on {new Date(formData.signed_at || '').toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                        </div>
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t bg-white/80 backdrop-blur-md flex justify-between items-center">
                    <Button variant="ghost" onClick={onCancel} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to List
                    </Button>
                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        SECURE DIGITAL RECORD ID: {formData.id?.slice(0, 8).toUpperCase()}
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <div id="recaptcha-consent-container"></div>

            {/* Stepper Header */}
            <div className="flex justify-between items-center mb-6 px-2">
                {['Details', 'Risks', 'Sign & Verify'].map((s, i) => (
                    <div key={s} className={`flex items-center gap-2 ${step > i + 1 ? 'text-primary' : step === i + 1 ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= i + 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-current'}`}>
                            {i + 1}
                        </div>
                        <span className="hidden sm:inline">{s}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto px-1">
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Procedure Name</Label>
                            <Input
                                value={formData.procedure_name}
                                onChange={e => setFormData({ ...formData, procedure_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date of Surgery</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.surgery_date && "text-muted-foreground"
                                        )}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {formData.surgery_date ? format(new Date(formData.surgery_date), "dd MMM yyyy") : <span>Pick surgery date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                        mode="single"
                                        selected={formData.surgery_date ? new Date(formData.surgery_date) : undefined}
                                        onSelect={(date) => {
                                            if (date) {
                                                setFormData({ ...formData, surgery_date: format(date, "yyyy-MM-dd") });
                                            }
                                            setIsDatePickerOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Patient Phone (for OTP)</Label>
                            <Input
                                value={formData.patient_phone}
                                onChange={e => setFormData({ ...formData, patient_phone: e.target.value })}
                            />
                        </div>
                        {isMinor && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <p className="font-bold">Patient is a minor ({patientAge} years)</p>
                                    <p>Consent must be provided by a legal guardian.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                            <div className="w-full sm:w-1/2">
                                <Label className="block mb-2 text-xs uppercase text-muted-foreground">Load / Append Template</Label>
                                <Select onValueChange={handleLoadTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select one or more templates..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates?.length === 0 ? (
                                            <div className="p-2 text-sm text-muted-foreground text-center">No templates found</div>
                                        ) : (
                                            templates?.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> {t.general}</Label>
                            <RichTextEditor
                                content={formData.risks_general || ''}
                                onChange={content => setFormData({ ...formData, risks_general: content })}
                                toolbarClassName="top-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> {t.anesthesia}</Label>
                            <RichTextEditor
                                content={formData.risks_anesthesia || ''}
                                onChange={content => setFormData({ ...formData, risks_anesthesia: content })}
                                toolbarClassName="top-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> {t.procedure}</Label>
                            <RichTextEditor
                                content={formData.risks_procedure || ''}
                                onChange={content => setFormData({ ...formData, risks_procedure: content })}
                                toolbarClassName="top-0"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        {isMinor && (
                            <Card className="border-l-4 border-l-orange-500 shadow-sm">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Guardian Name</Label>
                                        <Input
                                            placeholder="Full name of guardian..."
                                            value={formData.guardian_name || ''}
                                            onChange={e => setFormData({ ...formData, guardian_name: e.target.value })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="bg-muted/30 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-2">Acknowledgement</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {content.declaration(patient.patient.name, formData.procedure_name || '')}
                            </p>
                        </div>

                        {/* Selfie Section */}
                        <div className="space-y-2">
                            <Label>{isMinor ? '1. Guardian & Patient Photo Verification' : '1. Patient Identification (Selfie)'}</Label>
                            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-card">
                                {selfieImage ? (
                                    <div className="relative w-full flex justify-center">
                                        <img src={selfieImage} alt="Selfie" className="w-full max-w-[300px] aspect-[4/3] object-cover rounded-md border" />
                                        <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setSelfieImage(null)}>Retake</Button>
                                    </div>
                                ) : (
                                    <>
                                        {isCameraOpen ? (
                                            <div className="relative w-full flex justify-center">
                                                <video ref={videoRef} autoPlay playsInline className="w-full max-w-[300px] aspect-[4/3] object-cover rounded-md bg-black" />
                                                <canvas ref={canvasRef} width="300" height="225" className="hidden" />
                                                <Button size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={captureSelfie}>Capture</Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Button variant="outline" onClick={startCamera}>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    {isMinor ? 'Open Camera (Joint Photo)' : 'Start Camera'}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            {isMinor && <p className="text-xs text-muted-foreground italic">Please take a photo containing both the patient and the guardian.</p>}
                        </div>

                        {/* Signature Section */}
                        <div className="space-y-2">
                            <Label>{isMinor ? '2. Guardian Signature' : '2. Patient Signature'}</Label>
                            <div className="border rounded-md bg-white touch-none" style={{ height: 200 }}>
                                <SignatureCanvas
                                    ref={patientSigRef}
                                    penColor="black"
                                    backgroundColor="white"
                                    clearOnResize={false}
                                    canvasProps={{ className: 'w-full h-full' }}
                                    onEnd={handleSignatureEnd}
                                />
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => clearSignature(patientSigRef)} ><Eraser className="w-4 h-4 mr-1" /> Clear</Button>
                        </div>

                        {/* OTP Verification */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary" />
                                3. Final Verification
                            </Label>
                            {!isOtpSent ? (
                                <Button className="w-full h-12 text-base" onClick={sendOtp} disabled={!selfieImage}>
                                    <Send className="w-4 h-4 mr-2" /> Send OTP to Sign
                                </Button>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        className="h-12 text-center text-lg tracking-widest sm:flex-1"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        maxLength={6}
                                    />
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button onClick={verifyOtp} disabled={isVerifying} className="flex-1 sm:w-32 h-12">
                                            {isVerifying ? <Loader2 className="animate-spin" /> : 'Verify & Sign'}
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsOtpSent(false)} className="h-12">Resend</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between pt-6 border-t mt-4 gap-4">
                {step > 1 ? (
                    <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">Back</Button>
                ) : (
                    <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
                )}

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {step === 2 && (
                        <>
                            <Button variant="secondary" onClick={handleSaveDraft} className="w-full sm:w-auto">
                                <Save className="w-4 h-4 mr-2" /> Save Draft
                            </Button>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={handleWhatsApp}>
                                <Send className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        </>
                    )}
                    {step < 3 && (
                        <Button onClick={handleNext} className="w-full sm:w-auto">Next</Button>
                    )}
                </div>
            </div>
        </div>
    );
};
