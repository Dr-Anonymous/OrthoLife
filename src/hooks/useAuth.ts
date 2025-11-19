import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const phone = user.phoneNumber.slice(-10);
        const { data: patients } = await supabase
          .from('patients')
          .select('name')
          .eq('phone', phone);

        if (patients && patients.length > 0) {
          user.displayName = patients[0].name;
        }
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await auth.signOut();
  };

  return { user, loading, signOut };
};
