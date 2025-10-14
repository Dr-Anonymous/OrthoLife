import { create } from 'zustand';
import { Medication } from '@/components/SortableMedicationItem';

interface FormData {
  name: string;
  dob: Date | undefined;
  sex: string;
  phone: string;
}

interface PatientFolder {
  id: string;
  name: string;
}

interface Consultation {
  id: string;
  patient_name: string;
  patient_id: string;
}

interface AppState {
  formData: FormData;
  setFormData: (formData: FormData) => void;
  patientFolders: PatientFolder[];
  setPatientFolders: (folders: PatientFolder[]) => void;
  selectedPatient: string;
  setSelectedPatient: (patient: string) => void;
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  extraData: {
    complaints: string;
    findings: string;
    investigations: string;
    diagnosis: string;
    advice: string;
    followup: string;
    medications: Medication[];
  };
  setExtraData: (data: AppState['extraData']) => void;
  pendingConsultations: Consultation[];
  setPendingConsultations: (consultations: Consultation[]) => void;
  selectedConsultation: Consultation | null;
  setSelectedConsultation: (consultation: Consultation | null) => void;
  savedMedications: Medication[];
  setSavedMedications: (medications: Medication[]) => void;
}

export const useStore = create<AppState>((set) => ({
  formData: {
    name: '',
    dob: undefined,
    sex: 'M',
    phone: '',
  },
  setFormData: (formData) => set({ formData }),
  patientFolders: [],
  setPatientFolders: (folders) => set({ patientFolders: folders }),
  selectedPatient: '',
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  selectedFolder: '',
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  extraData: {
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: 'after 2 weeks/immediately- if worsening of any symptoms.',
    medications: [
      { id: crypto.randomUUID(), name: 'T. HIFENAC SP', dose: '1 tab', freqMorning: true, freqNoon: false, freqNight: true, duration: '1 week', instructions: 'Aft. meal' },
      { id: crypto.randomUUID(), name: 'T. PANTOVAR', dose: '40 mg', freqMorning: true, freqNoon: false, freqNight: false, duration: '1 week', instructions: 'Bef. breakfast' },
    ],
  },
  setExtraData: (data) => set({ extraData: data }),
  pendingConsultations: [],
  setPendingConsultations: (consultations) => set({ pendingConsultations: consultations }),
  selectedConsultation: null,
  setSelectedConsultation: (consultation) => set({ selectedConsultation: consultation }),
  savedMedications: [],
  setSavedMedications: (medications) => set({ savedMedications: medications }),
}));