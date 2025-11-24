import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
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
