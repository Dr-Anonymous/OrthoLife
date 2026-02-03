import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Lock, Camera, Eraser, CheckCircle2, Loader2, Syringe, Phone } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from '@/integrations/firebase/client';

interface PublicConsentData {
    id: string;
    procedure_name: string;
    surgery_date: string;
    risks_general: string;
    risks_anesthesia: string;
    risks_procedure: string;
    consent_status: string;
    patient_name: string;
    patient_phone: string;
    consent_language?: string;
    patient_signature?: string;
    signed_at?: string;
    selfie_url?: string;
}

const UI_TEXT = {
    en: {
        title: "Surgical Consent Form",
        headerTitle: "OrthoLife Secure Consent",
        disclaimer: "Please read the entire document carefully before signing.",
        patientInfo: "Patient & Procedure Details",
        procedureName: "Procedure Name",
        patientName: "Patient Name",
        surgeryDate: "Surgery Date",
        dateNotSet: "Date Not Set",
        risksTitle: "Risks & Complications",
        verificationTitle: "Patient Verification",
        selfieTitle: "1. Patient Photo Verification",
        selfieDesc: "Please take a clear photo of your face to verify your identity.",
        retake: "Retake Photo",
        capture: "Capture Photo",
        openCamera: "Open Camera",
        signatureTitle: "2. Your Signature",
        signatureDesc: "Please sign in the box below to confirm you understand the risks and consent to the procedure.",
        clearSignature: "Clear Signature",
        confirmTitle: "3. Final Confirmation",
        sendOtp: "Send Verification Code",
        otpSent: "A verification code has been sent to",
        verifySign: "Confirm Consent",
        signedTitle: "Consent Signed",
        signedDesc: "Your consent has been securely recorded.",
        closeWindow: "You can close this window.",
        footer: "Protected by OrthoLife Secure System"
    },
    te: {
        title: "శస్త్రచికిత్స సమ్మతి పత్రం",
        headerTitle: "ఆర్థోలైఫ్ సురక్షిత అంగీకారం",
        disclaimer: "దయచేసి సంతకం చేసే ముందు మొత్తం పత్రాన్ని జాగ్రత్తగా చదవండి.",
        patientInfo: "రోగి మరియు శస్త్రచికిత్స వివరాలు",
        procedureName: "శస్త్రచికిత్స పేరు",
        patientName: "రోగి పేరు",
        surgeryDate: "శస్త్రచికిత్స తేదీ",
        dateNotSet: "తేదీ నిర్ణయించబడలేదు",
        risksTitle: "ప్రమాదాలు & సమస్యలు",
        verificationTitle: "రోగి నిర్ధారణ",
        selfieTitle: "1. రోగి ఫోటో నిర్ధారణ",
        selfieDesc: "మీ గుర్తింపును నిర్ధారించడానికి దయచేసి మీ ముఖం యొక్క స్పష్టమైన ఫోటోను తీసుకోండి.",
        retake: "మళ్ళీ తీసుకోండి",
        capture: "ఫోటో తీయండి",
        openCamera: "కెమెరా తెరవండి",
        signatureTitle: "2. మీ సంతకం",
        signatureDesc: "మీరు ప్రమాదాలను అర్థం చేసుకున్నారని మరియు శస్త్రచికిత్సకు అంగీకరిస్తున్నారని నిర్ధారించడానికి దయచేసి క్రింద ఉన్న పెట్టెలో సంతకం చేయండి.",
        clearSignature: "సంతకం తొలగించండి",
        confirmTitle: "3. తుది నిర్ధారణ",
        sendOtp: "వెరిఫికేషన్ కోడ్ పంపండి",
        otpSent: "ధృవీకరణ కోడ్ పంపబడింది: ",
        verifySign: "అంగీకారాన్ని నిర్ధారించండి",
        signedTitle: "అంగీకారం పూర్తయింది",
        signedDesc: "మీ అంగీకారం సురక్షితంగా నమోదు చేయబడింది.",
        closeWindow: "మీరు ఈ విండోను మూసివేయవచ్చు.",
        footer: "Protected by OrthoLife Secure System"
    }
};

const PublicConsentVerification = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [consentData, setConsentData] = useState<PublicConsentData | null>(null);
    const [isSigned, setIsSigned] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Derived language state
    const langCode = (consentData?.consent_language === 'te') ? 'te' : 'en';
    const t = UI_TEXT[langCode];

    // Form Stats
    const patientSigRef = useRef<SignatureCanvas>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [selfieImage, setSelfieImage] = useState<string | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);

    const [isVerifying, setIsVerifying] = useState(false);
    const [justSigned, setJustSigned] = useState(false);

    // Local signature state for persistence
    const [capturedSignature, setCapturedSignature] = useState<string | null>(null);

    const handleSignatureEnd = () => {
        if (patientSigRef.current && !patientSigRef.current.isEmpty()) {
            setCapturedSignature(patientSigRef.current.toDataURL());
        }
    };

    const clearSignature = () => {
        patientSigRef.current?.clear();
        setCapturedSignature(null);
    };

    // Restore signature on mount/resize if available
    useEffect(() => {
        if (!isSigned && capturedSignature && patientSigRef.current) {
            // small delay for canvas to be ready
            setTimeout(() => {
                patientSigRef.current?.fromDataURL(capturedSignature, { ratio: 1 });
            }, 50);
        }
    }, [capturedSignature, isSigned]);

    useEffect(() => {
        const fetchConsent = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase.rpc('get_public_consent', { consent_id: id });
                if (error) throw error;
                if (data) {
                    setConsentData(data as PublicConsentData);
                    if (data.consent_status === 'signed') {
                        setIsSigned(true);
                    }
                } else {
                    toast.error("Consent not found or invalid link.");
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load consent.");
            } finally {
                setLoading(false);
            }
        };
        fetchConsent();
    }, [id]);

    // --- OTP Logic (Real) ---
    useEffect(() => {
        if (!loading && consentData && !window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-verify-container', {
                    'size': 'invisible',
                });
            } catch (e) {
                console.error("Recaptcha Init Error:", e);
            }
        }
    }, [loading, consentData]);


    // --- Camera Logic (reused) ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera. Please allow permissions.");
        }
    };

    // Cleanup camera
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    useEffect(() => {
        if (isCameraOpen && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);


    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 300, 225);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setSelfieImage(dataUrl);
                setIsCameraOpen(false);
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                }
            }
        }
    };

    // --- Submit Logic ---
    const sendOtp = async () => {
        if (patientSigRef.current?.isEmpty()) {
            toast.error("Please sign the consent first.");
            // Scroll to signature
            document.getElementById('signature-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (!selfieImage) {
            toast.error("Please take a verification selfie.");
            document.getElementById('selfie-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (!consentData?.patient_phone) return;

        try {
            const appVerifier = window.recaptchaVerifier;
            // Ensure phone format
            const phone = consentData.patient_phone.startsWith('+91')
                ? consentData.patient_phone
                : (consentData.patient_phone.length === 10 ? `+91${consentData.patient_phone}` : consentData.patient_phone);

            const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
            setConfirmationResult(confirmation);
            setIsOtpSent(true);
            toast.success(`${t.otpSent} ${phone}`);
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            toast.error("Failed to send OTP. Please try again.");
            // Reset captcha
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-verify-container', {
                    'size': 'invisible',
                });
            }
        }
    };

    const verifyAndSubmit = async () => {
        if (!consentData || !confirmationResult) return;
        setIsVerifying(true);
        try {
            // Verify OTP first
            await confirmationResult.confirm(otp);
            toast.success("OTP Verified!");

            // Upload Signature
            let finalSigUrl = patientSigRef.current?.isEmpty() ? capturedSignature : patientSigRef.current?.toDataURL();
            if (finalSigUrl && finalSigUrl.startsWith('data:')) {
                const res = await fetch(finalSigUrl);
                const blob = await res.blob();
                const fileName = `sig_${consentData.id}_${Date.now()}.png`;
                const { error: uploadError } = await supabase.storage.from('consent-evidence').upload(fileName, blob);
                if (uploadError) {
                    console.error("Sig upload failed", uploadError);
                    // Decide if we should block or continue. Continuing for now but prefer storage.
                } else {
                    const { data: pubData } = supabase.storage.from('consent-evidence').getPublicUrl(fileName);
                    finalSigUrl = pubData.publicUrl;
                }
            }

            // Upload Selfie
            let finalSelfieUrl = selfieImage;
            if (selfieImage && selfieImage.startsWith('data:')) {
                const res = await fetch(selfieImage);
                const blob = await res.blob();
                const fileName = `selfie_${consentData.id}_${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('consent-evidence').upload(fileName, blob);
                if (uploadError) {
                    console.error("Selfie upload failed", uploadError);
                } else {
                    const { data: pubData } = supabase.storage.from('consent-evidence').getPublicUrl(fileName);
                    finalSelfieUrl = pubData.publicUrl;
                }
            }

            const { data, error } = await supabase.rpc('submit_public_consent', {
                p_consent_id: consentData.id,
                p_patient_signature: finalSigUrl,
                p_selfie_url: finalSelfieUrl,
                p_otp: 'VERIFIED_BY_FIREBASE' // Backend just logs usage, validation done here
            });

            if (error) throw error;
            if (data) {
                toast.success("Consent Signed Successfully!");
                setIsSigned(true);
                setJustSigned(true);
                window.scrollTo(0, 0);
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Submission failed");
        } finally {
            setIsVerifying(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (!consentData) return <div className="p-8 text-center text-red-500">Consent not found.</div>;

    if (justSigned) {
        return (
            <div className="container mx-auto p-4 max-w-md h-screen flex flex-col justify-center items-center text-center">
                <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">{t.signedTitle}</h1>
                <p className="text-muted-foreground">{t.signedDesc}</p>
                <div className="mt-8 text-sm text-gray-400 no-print">{t.closeWindow}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-3xl bg-slate-50 min-h-screen pb-20">
            <div id="recaptcha-verify-container"></div>
            <div className="mb-6 text-center border-b pb-4">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">{t.headerTitle}</p>
                <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
                <p className="text-muted-foreground mt-2">{t.disclaimer}</p>
            </div>

            <div className="space-y-8">
                {/* 1. Patient Details */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="bg-white border-b">
                        <CardTitle className="text-lg">{t.patientInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1.5"><Syringe size={14} className="text-primary" /> {t.procedureName}</Label>
                                <p className="font-semibold text-xl text-primary pl-5">{consentData.procedure_name}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">{t.patientName}</Label>
                                <p className="font-semibold text-lg">{consentData.patient_name}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">{t.surgeryDate}</Label>
                                <p className="font-semibold text-lg">
                                    {consentData.surgery_date ? format(new Date(consentData.surgery_date), 'dd MMM yyyy') : t.dateNotSet}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Risks Sections */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg px-2">{t.risksTitle}</h3>

                    <Card className="border-l-4 border-l-red-500 shadow-sm">
                        <CardContent className="pt-6 text-sm prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: consentData.risks_general || '' }} />
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardContent className="pt-6 text-sm prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: consentData.risks_anesthesia || '' }} />
                    </Card>

                    <Card className="border-l-4 border-l-orange-500 shadow-sm">
                        <CardContent className="pt-6 text-sm prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: consentData.risks_procedure || '' }} />
                    </Card>
                </div>

                {/* 3. Verification & Signature */}
                <div className="pt-8 border-t mt-8">
                    <h3 className="font-semibold text-lg px-2 mb-4">{t.verificationTitle}</h3>

                    <Card className="shadow-md border-slate-200">
                        <CardContent className="pt-6 space-y-8">

                            {/* Selfie */}
                            <div id="selfie-section" className="space-y-3">
                                <Label className="text-base">{t.selfieTitle}</Label>
                                {isSigned && consentData.selfie_url ? (
                                    <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-slate-50">
                                        <img src={consentData.selfie_url} alt="Selfie" className="w-[300px] h-[225px] object-cover rounded-md shadow-sm" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground">{t.selfieDesc}</p>
                                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-xl bg-slate-50">
                                            {selfieImage ? (
                                                <div className="relative">
                                                    <img src={selfieImage} alt="Selfie" className="w-[300px] h-[225px] object-cover rounded-md shadow-sm" />
                                                    <Button size="sm" variant="destructive" className="absolute top-2 right-2 shadow-sm" onClick={() => setSelfieImage(null)}>{t.retake}</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    {isCameraOpen ? (
                                                        <div className="relative overflow-hidden rounded-md">
                                                            <video ref={videoRef} autoPlay playsInline className="w-[300px] h-[225px] object-cover bg-black" />
                                                            <canvas ref={canvasRef} width="300" height="225" className="hidden" />
                                                            <Button size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg" onClick={captureSelfie}>{t.capture}</Button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 w-full">
                                                            <Button variant="default" size="lg" onClick={startCamera} className="gap-2">
                                                                <Camera className="h-5 w-5" /> {t.openCamera}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Signature */}
                            <div id="signature-section" className="space-y-3">
                                <Label className="text-base">{t.signatureTitle}</Label>
                                {isSigned && consentData.patient_signature ? (
                                    <div className="border-2 border-slate-200 rounded-lg bg-white p-4">
                                        <img src={consentData.patient_signature} alt="Patient Signature" className="max-h-32 mx-auto" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground">{t.signatureDesc}</p>
                                        <div className="border-2 border-slate-200 rounded-lg bg-white touch-none shadow-inner" style={{ height: 180 }}>
                                            <SignatureCanvas
                                                ref={patientSigRef}
                                                penColor="black"
                                                backgroundColor="white"
                                                canvasProps={{ className: 'w-full h-full' }}
                                                onEnd={handleSignatureEnd}
                                            />
                                        </div>
                                        <div className="flex justify-end no-print">
                                            <Button size="sm" variant="ghost" onClick={clearSignature} className="text-muted-foreground hover:text-destructive">
                                                <Eraser className="w-4 h-4 mr-1" /> {t.clearSignature}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* OTP */}
                            {!isSigned && (
                                <div className="pt-6 border-t no-print">
                                    <Label className="text-base mb-2 block">{t.confirmTitle}</Label>
                                    {!isOtpSent ? (
                                        <Button size="lg" className="w-full text-base py-6" onClick={sendOtp} disabled={!selfieImage}>
                                            <Lock className="w-5 h-5 mr-2" /> {t.sendOtp}
                                        </Button>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm mb-4 flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                <span>{t.otpSent} {consentData.patient_phone}</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <Input
                                                    className="text-center text-lg tracking-widest"
                                                    placeholder="000000"
                                                    value={otp}
                                                    onChange={e => setOtp(e.target.value)}
                                                    maxLength={6}
                                                />
                                                <Button size="lg" className="w-[180px]" onClick={verifyAndSubmit} disabled={isVerifying}>
                                                    {isVerifying ? <Loader2 className="animate-spin w-5 h-5" /> : t.verifySign}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Signed Status Badge */}
                            {isSigned && (
                                <div className="pt-6 border-t text-center space-y-2">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">
                                        <CheckCircle2 size={20} /> Signed Successfully
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Signed on: {new Date(consentData.signed_at || '').toLocaleString()}
                                    </p>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>

            <footer className="mt-12 text-center text-xs text-muted-foreground no-print">
                <p>{t.footer}</p>
                <p>&copy; {new Date().getFullYear()} OrthoLife</p>
            </footer>
        </div>
    );
};

export default PublicConsentVerification;
