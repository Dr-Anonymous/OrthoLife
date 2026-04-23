import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';
import { supabase } from '@/integrations/supabase/client';

export interface SelectedPatient {
  id: string;
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<SelectedPatient[]>([]);
  const [selectedPatient, setSelectedPatientState] = useState<SelectedPatient | null>(() => {
    try {
      const saved = localStorage.getItem('selected_patient');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const setSelectedPatient = (patient: SelectedPatient | null) => {
    setSelectedPatientState(patient);
    if (patient) {
      localStorage.setItem('selected_patient', JSON.stringify(patient));
    } else {
      localStorage.removeItem('selected_patient');
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      // 1. Check Firebase (Standard Patient/Consultant OTP)
      if (fbUser) {
        const phone = fbUser.phoneNumber?.slice(-10) || "";
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, name')
          .eq('phone', phone);

        const patientList = (patientData || []) as SelectedPatient[];
        setPatients(patientList);

        // If only one patient exists, auto-select them if none selected
        if (patientList.length === 1 && !selectedPatient) {
          setSelectedPatient(patientList[0]);
        } 
        // If the selected patient is not in the current list, clear it
        else if (selectedPatient && !patientList.some(p => p.id === selectedPatient.id)) {
          setSelectedPatient(null);
        }

        if (patientList.length > 0) {
          setUser({
            ...fbUser,
            displayName: selectedPatient?.name || patientList[0].name
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
        setPatients([]);
        setSelectedPatient(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedPatient?.id]); // Re-run effect when selected patient changes to sync user object

  const signOut = async () => {
    await auth.signOut();
    localStorage.removeItem('consultant_phone');
    localStorage.removeItem('consultant_name');
    localStorage.removeItem('selected_patient');
    setUser(null);
    setPatients([]);
    setSelectedPatient(null);
  };

  return { user, loading, patients, selectedPatient, setSelectedPatient, signOut };
};
