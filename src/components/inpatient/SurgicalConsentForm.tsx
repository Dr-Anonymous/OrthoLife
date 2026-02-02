import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurgicalConsent, InPatient } from '@/types/inPatients';
import {
    Camera,
    Save,
    Eraser,
    Lock,
    AlertTriangle,
    Send
} from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from '@/integrations/firebase/client';
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
    const [step, setStep] = useState(1);
    const lang = patient.language === 'te' ? 'te' : 'en';
    const content = CONSENT_RISKS[lang];

    const [formData, setFormData] = useState<Partial<SurgicalConsent>>({
        in_patient_id: patient.id,
        id: initialData?.id, // Added ID persistence
        procedure_name: initialData?.procedure_name || patient.procedure || '',
        surgery_date: initialData?.surgery_date || (patient.procedure_date ? new Date(patient.procedure_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        risks_general: initialData?.risks_general || (patient.language === 'te' ? CONSENT_RISKS.te.general : CONSENT_RISKS.en.general),
        risks_anesthesia: initialData?.risks_anesthesia || content.anesthesia,
        risks_procedure: initialData?.risks_procedure || content.procedure_placeholder,
        patient_phone: initialData?.patient_phone || patient.patient.phone,
        consent_status: initialData?.consent_status || 'pending',
        consent_language: initialData?.consent_language || lang
    });

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

    // Load signatures if editing/viewing
    useEffect(() => {
        if (initialData?.id) {
            setFormData(prev => ({ ...prev, id: initialData.id }));
        }
    }, [initialData]);

    const handleNext = () => {
        if (step === 2) {
            // Auto-save draft when moving to verification step to prevent data loss
            const draftData = {
                ...formData,
                in_patient_id: patient.id,
                consent_status: 'pending' as const,
            };
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
    };

    // --- OTP ---
    useEffect(() => {
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

    // --- Submit ---
    const handleSaveDraft = async () => {
        const finalData = {
            ...formData,
            in_patient_id: patient.id,
            consent_status: 'pending' as const,
        };
        onSave(finalData).then(res => {
            if (res?.saved?.id) {
                setFormData(prev => ({ ...prev, id: res.saved.id }));
            }
        });
    };

    const handleWhatsApp = async () => {
        const draftData = {
            ...formData,
            in_patient_id: patient.id,
            consent_status: 'pending' as const,
        };

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
                const message = `Hello ${patient.patient.name}, please review and sign your surgical consent for ${formData.procedure_name} here:\n ${link}`;

                try {
                    const { error } = await supabase.functions.invoke('send-whatsapp', {
                        body: { number: patient.patient.phone, message: message },
                    });

                    if (error) throw error;
                    toast.success("WhatsApp sent to patient!");
                } catch (err: any) {
                    console.error("Failed to send WhatsApp:", err);
                    toast.error("Failed to send WhatsApp message automatically. Opening WhatsApp...");
                    // Fallback to manual open if function fails
                    const encodedMessage = encodeURIComponent(message);
                    window.open(`https://wa.me/${patient.patient.phone}?text=${encodedMessage}`, '_blank');
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
        // Prepare data
        const patientSig = patientSigRef.current?.isEmpty() ? null : patientSigRef.current?.toDataURL();
        // const doctorSig = doctorSigRef.current?.isEmpty() ? null : doctorSigRef.current?.toDataURL(); // Optional?

        // Upload Selfie if it's base64
        let finalSelfieUrl = selfieImage;
        if (selfieImage && selfieImage.startsWith('data:')) {
            try {
                const res = await fetch(selfieImage);
                const blob = await res.blob();
                const fileName = `${patient.id}_${Date.now()}.jpg`;
                const { data, error } = await supabase.storage.from('consent-evidence').upload(fileName, blob);

                if (error) throw error;
                const publicUrl = supabase.storage.from('consent-evidence').getPublicUrl(fileName).data.publicUrl;
                finalSelfieUrl = publicUrl;
            } catch (e) {
                console.error("Upload failed", e);
                // Fallback or alert? Proceeding for now.
            }
        }

        const finalData = {
            ...formData,
            in_patient_id: patient.id,
            patient_signature: patientSig || formData.patient_signature,
            selfie_url: finalSelfieUrl,
            consent_status: 'signed' as const,
            signed_at: new Date().toISOString()
        };

        onSave(finalData);
    };

    if (isReadOnly) {
        return (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
                <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">Surgical Consent Form</h2>
                    <p className="text-muted-foreground">{formData.procedure_name} - {formData.surgery_date}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>General Risks</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: formData.risks_general || '' }} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Anesthesia Risks</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: formData.risks_anesthesia || '' }} />
                        </CardContent>
                    </Card>
                    <Card className="col-span-full">
                        <CardHeader><CardTitle>Procedure Risks</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: formData.risks_procedure || '' }} />
                        </CardContent>
                    </Card>
                </div>

                <div className="flex gap-4 items-center justify-center border-t pt-4">
                    {formData.patient_signature && (
                        <div className="text-center">
                            <p className="font-semibold mb-2">Patient Signature</p>
                            <img src={formData.patient_signature} alt="Patient Sig" className="border rounded h-24" />
                        </div>
                    )}
                    {formData.selfie_url && (
                        <div className="text-center">
                            <p className="font-semibold mb-2">Patient Verification</p>
                            <img src={formData.selfie_url} alt="Selfie" className="border rounded h-24 object-cover w-32" />
                        </div>
                    )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                    Signed on: {new Date(formData.signed_at || '').toLocaleString()}
                </div>
                <div className="flex justify-end">
                    <Button onClick={onCancel}>Close</Button>
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
                            <Input
                                type="date"
                                value={formData.surgery_date}
                                onChange={e => setFormData({ ...formData, surgery_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Patient Phone (for OTP)</Label>
                            <Input
                                value={formData.patient_phone}
                                onChange={e => setFormData({ ...formData, patient_phone: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> General Surgical Risks</Label>
                            <RichTextEditor
                                content={formData.risks_general || ''}
                                onChange={content => setFormData({ ...formData, risks_general: content })}
                                toolbarClassName="top-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> Anesthesia Risks</Label>
                            <RichTextEditor
                                content={formData.risks_anesthesia || ''}
                                onChange={content => setFormData({ ...formData, risks_anesthesia: content })}
                                toolbarClassName="top-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><AlertTriangle size={16} /> Procedure Specific Risks</Label>
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
                        <div className="bg-muted/30 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-2">Acknowledgement</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {content.declaration(patient.patient.name, formData.procedure_name || '')}
                            </p>
                        </div>

                        {/* Selfie Section */}
                        <div className="space-y-2">
                            <Label>1. Patient Identification (Selfie)</Label>
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
                                                <video ref={videoRef} autoPlay className="w-full max-w-[300px] aspect-[4/3] object-cover rounded-md bg-black" />
                                                <canvas ref={canvasRef} width="300" height="225" className="hidden" />
                                                <Button size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={captureSelfie}>Capture</Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Button variant="outline" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Start Camera</Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="space-y-2">
                            <Label>2. Patient Signature</Label>
                            <div className="border rounded-md bg-white touch-none" style={{ height: 200 }}>
                                <SignatureCanvas
                                    ref={patientSigRef}
                                    penColor="black"
                                    canvasProps={{ className: 'w-full h-full' }}
                                />
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => clearSignature(patientSigRef)} ><Eraser className="w-4 h-4 mr-1" /> Clear</Button>
                        </div>

                        {/* OTP Verification */}
                        <div className="space-y-4 pt-4 border-t">
                            <Label>3. Final Verification</Label>
                            {!isOtpSent ? (
                                <Button className="w-full" onClick={sendOtp} disabled={!selfieImage}>
                                    <Lock className="w-4 h-4 mr-2" /> Send OTP to Sign
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter OTP"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                    />
                                    <Button onClick={verifyOtp} disabled={isVerifying}>
                                        {isVerifying ? 'Verifying...' : 'Verify & Sign'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsOtpSent(false)}>Resend</Button>
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
                            <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={handleWhatsApp}>
                                <Send className="w-4 h-4 mr-2" /> Send to WhatsApp
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
