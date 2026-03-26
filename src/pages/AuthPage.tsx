import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { auth } from '@/integrations/firebase/client';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { phone: phoneParam } = useParams();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        // Handle redirect back to where we came from
        const redirectParam = searchParams.get('redirect');
        const stateFrom = (location.state as any)?.from;
        const redirectUrl = redirectParam || stateFrom;

        console.log("[AuthPage] Auth success. Redirecting to:", redirectUrl || '/my');

        if (redirectUrl) {
          // If redirectUrl doesn't start with /, make it start with /
          const finalUrl = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
          navigate(finalUrl + location.hash);
        } else {
          navigate('/my');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, searchParams, location.hash, location.state]);

  useEffect(() => {
    const phoneFromUrl = searchParams.get('phone') || phoneParam;
    if (phoneFromUrl) {
      setPhone(phoneFromUrl);
    }
  }, [searchParams, phoneParam]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize the input to only allow digits and keep the last 10
    const sanitized = e.target.value.replace(/\D/g, '');
    setPhone(sanitized.slice(-10));
  };

  useEffect(() => {
    // Standard initialization matches lab
    if (!(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved
          }
        });
      } catch (e) {
        console.error("[AuthPage] Recaptcha init error:", e);
      }
    }

    // Cleanup on unmount to match lab
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) { /* ignore */ }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    try {
      const formattedPhone = `+91${phone}`;
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        throw new Error("Recaptcha verifier not initialized");
      }
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast.success('OTP sent successfully! Check your phone.');
    } catch (error) {
      const err = error as Error;
      console.error('Error sending OTP:', err);
      toast.error(err.message || 'Failed to send OTP. Please try again.', {
        description: err.stack,
      });
      // CRITICAL: Reset reCAPTCHA and set to null to force re-init on next click
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) { /* ignore */ }
        (window as any).recaptchaVerifier = null;
      }
      // Re-init for next attempt
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
      }
      toast.success('Successfully logged in!');
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        navigate(redirectUrl + location.hash);
      } else {
        navigate('/my');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error verifying OTP:', err);
      toast.error(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div id="recaptcha-container"></div>
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 py-24 bg-gradient-to-b from-background to-secondary/20">
        <Card className="w-full max-w-md overflow-hidden border-primary/20 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center font-bold">Patient Portal</CardTitle>
            <CardDescription className="text-center">
              {isOtpSent ? `Enter the OTP sent to +91${phone}` : 'Enter your phone number to receive a secure login OTP'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 py-2 border rounded-md bg-muted">
                        <span className="text-sm text-muted-foreground">+91</span>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={handlePhoneChange}
                        required
                        className="flex-1 h-11"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll send you an OTP to verify your number
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-lg" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Login OTP'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4" data-testid="otp-form">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                      className="text-center text-2xl tracking-widest h-14"
                    />
                  </div>
                  <div className="space-y-2">
                    <Button type="submit" className="w-full h-11 shadow-lg" disabled={isLoading}>
                      {isLoading ? 'Verifying...' : 'Verify & Continue'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-11"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtp('');
                      }}
                    >
                      Use a different number
                    </Button>
                  </div>
                </form>
              )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;