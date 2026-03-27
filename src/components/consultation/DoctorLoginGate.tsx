
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Phone, Loader2, Eye, EyeOff } from 'lucide-react';

interface DoctorLoginGateProps {
  onLogin: (phone: string, name: string, id: string) => void;
}

export const DoctorLoginGate: React.FC<DoctorLoginGateProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState(() => localStorage.getItem('last_phone_attempt') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Auto-focus password when 10 digits are reached
  useEffect(() => {
    const sanitizedPhone = phone.replace(/\D/g, '');
    if (sanitizedPhone.length >= 10 && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [phone]);

  // Auto-login when 6 digits are reached
  useEffect(() => {
    if (password.length === 6 && phone.replace(/\D/g, '').length >= 10 && !isSubmittingRef.current) {
      handleLogin();
    }
  }, [password, phone]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);
      localStorage.setItem('last_phone_attempt', sanitizedPhone);

      const { data, error } = await supabase
        .from('consultants')
        .select('*')
        .ilike('phone', `%${sanitizedPhone}`)
        .eq('password', password)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Invalid phone number or password');
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      toast.success(`Welcome back, ${data.name}!`);
      onLogin(data.phone, data.name, data.id);
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message || 'Login failed');
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 ring-8 ring-primary/5">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Doctor Workspace</CardTitle>
          <CardDescription>
            Enter your credentials to access the consultation portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="gate-phone"
                  type="tel"
                  placeholder="99 838 49 838"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="gate-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground ml-1">
                New profile default: 123456
              </p>
            </div>
            {isLoading && (
              <div className="flex justify-center py-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 text-primary font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Authenticating Doctor...</span>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorLoginGate;
