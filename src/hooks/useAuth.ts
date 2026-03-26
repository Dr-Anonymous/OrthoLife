import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      // 1. Check Firebase (Standard Patient/Consultant OTP)
      if (fbUser) {
        const phone = fbUser.phoneNumber?.slice(-10) || "";
        const { data: patients } = await supabase
          .from('patients')
          .select('name')
          .eq('phone', phone);

        if (patients && patients.length > 0) {
          setUser({
            ...fbUser,
            displayName: patients[0].name
          } as User);
        } else {
          setUser(fbUser);
        }
        setLoading(false);
        return;
      }

      // 2. Fallback to Manual Consultant Session (Phone + Password flow)
      const manualPhone = localStorage.getItem('consultant_phone');
      if (manualPhone) {
        setUser({
          phoneNumber: `+91${manualPhone}`,
          displayName: localStorage.getItem('consultant_name') || 'Consultant',
          uid: manualPhone, // Proxy UID
        } as unknown as User);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await auth.signOut();
    localStorage.removeItem('consultant_phone');
    localStorage.removeItem('consultant_name');
    setUser(null);
  };

  return { user, loading, signOut };
};
