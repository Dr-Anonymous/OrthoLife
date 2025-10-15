import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Add +91 prefix if not present
    if (digits.length > 0 && !digits.startsWith('91')) {
      return '+91' + digits;
    }
    if (digits.length > 0) {
      return '+' + digits;
    }
    return '';
  };

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      if (formattedPhone.length < 13) {
        toast.error('Please enter a valid 10-digit phone number');
        setIsLoading(false);
        return;
      }

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
      // Reset reCAPTCHA
      window.recaptchaVerifier?.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if(confirmationResult) {
        await confirmationResult.confirm(otp);
      }
      toast.success('Successfully logged in!');
      navigate('/');
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
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Patient Login</CardTitle>
            <CardDescription className="text-center">
              {isOtpSent
                ? 'Enter the OTP sent to your phone'
                : 'Enter your phone number to receive an OTP'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      placeholder="9876543210"
                      value={phone.replace('+91', '')}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      required
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you an OTP to verify your number
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4" data-testid="otp-form">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    OTP sent to +91{phone.replace('+91', '')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp('');
                    }}
                  >
                    Change Phone Number
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
