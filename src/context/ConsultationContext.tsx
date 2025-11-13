import React, { createContext, useReducer, Dispatch } from 'react';
import { Medication } from '@/components/consultation/MedicationItem';

interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  drive_id: string | null;
}

interface Consultation {
  id: string;
  patient: Patient;
  consultation_data: any;
  status: 'pending' | 'completed';
}

interface TextShortcut {
  id: string;
  shortcut: string;
  expansion: string;
}

interface State {
  selectedConsultation: Consultation | null;
  lastVisitDate: string | null;
  initialPatientDetails: Patient | null;
  initialExtraData: any;
  isFormDirty: boolean;
  isUnsavedModalOpen: boolean;
  nextConsultation: Consultation | null;
  editablePatientDetails: Patient | null;
  isPatientDatePickerOpen: boolean;
  calendarDate: Date;
  isMedicationsModalOpen: boolean;
  isKeywordModalOpen: boolean;
  isHistoryModalOpen: boolean;
  isSaveBundleModalOpen: boolean;
  isShortcutModalOpen: boolean;
  savedMedications: Medication[];
  textShortcuts: TextShortcut[];
  extraData: any;
  suggestedMedications: Medication[];
  suggestedAdvice: string[];
  suggestedInvestigations: string[];
  suggestedFollowup: string[];
  allConsultations: Consultation[];
  pendingConsultations: Consultation[];
  completedConsultations: Consultation[];
  age: number | '';
}

type Action =
  | { type: 'SET_SELECTED_CONSULTATION'; payload: Consultation | null }
  | { type: 'SET_LAST_VISIT_DATE'; payload: string | null }
  | { type: 'SET_INITIAL_FORM_STATE'; payload: { patient: Patient | null; extraData: any | null } }
  | { type: 'SET_IS_FORM_DIRTY'; payload: boolean }
  | { type: 'SET_IS_UNSAVED_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_NEXT_CONSULTATION'; payload: Consultation | null }
  | { type: 'SET_EDITABLE_PATIENT_DETAILS'; payload: Patient | null }
  | { type: 'SET_EXTRA_DATA'; payload: any }
  | { type: 'UPDATE_EXTRA_DATA_FIELD'; payload: { field: string; value: string } }
  | { type: 'ADD_MEDICATION' }
  | { type: 'REMOVE_MEDICATION'; payload: number }
  | { type: 'UPDATE_MEDICATION'; payload: { index: number; field: keyof Medication; value: any } }
  | { type: 'SET_SUGGESTED_MEDICATIONS'; payload: Medication[] }
  | { type: 'SET_SUGGESTED_ADVICE'; payload: string[] }
  | { type: 'SET_SUGGESTED_INVESTIGATIONS'; payload: string[] }
  | { type: 'SET_SUGGESTED_FOLLOWUP'; payload: string[] }
  | { type: 'SET_SAVED_MEDICATIONS'; payload: Medication[] }
  | { type: 'SET_TEXT_SHORTCUTS'; payload: TextShortcut[] }
  | { type: 'SET_MODAL_OPEN'; payload: { modal: 'medications' | 'keyword' | 'history' | 'saveBundle' | 'shortcut'; isOpen: boolean } }
  | { type: 'SET_ALL_CONSULTATIONS'; payload: Consultation[] }
  | { type: 'UPDATE_CONSULTATION_IN_LIST'; payload: Consultation }
  | { type: 'SET_AGE'; payload: number | '' };

const initialState: State = {
  selectedConsultation: null,
  lastVisitDate: null,
  initialPatientDetails: null,
  initialExtraData: null,
  isFormDirty: false,
  isUnsavedModalOpen: false,
  nextConsultation: null,
  editablePatientDetails: null,
  isPatientDatePickerOpen: false,
  calendarDate: new Date(2000, 0, 1),
  isMedicationsModalOpen: false,
  isKeywordModalOpen: false,
  isHistoryModalOpen: false,
  isSaveBundleModalOpen: false,
  isShortcutModalOpen: false,
  savedMedications: [],
  textShortcuts: [],
  extraData: {
    complaints: '',
    findings: '',
    investigations: '',
    diagnosis: '',
    advice: '',
    followup: '',
    personalNote: '',
    medications: [],
  },
  suggestedMedications: [],
  suggestedAdvice: [],
  suggestedInvestigations: [],
  suggestedFollowup: [],
  allConsultations: [],
  pendingConsultations: [],
  completedConsultations: [],
  age: '',
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SELECTED_CONSULTATION':
      return { ...state, selectedConsultation: action.payload };
    case 'SET_LAST_VISIT_DATE':
      return { ...state, lastVisitDate: action.payload };
    case 'SET_INITIAL_FORM_STATE':
      return {
        ...state,
        initialPatientDetails: action.payload.patient,
        initialExtraData: action.payload.extraData,
      };
    case 'SET_IS_FORM_DIRTY':
      return { ...state, isFormDirty: action.payload };
    case 'SET_IS_UNSAVED_MODAL_OPEN':
      return { ...state, isUnsavedModalOpen: action.payload };
    case 'SET_NEXT_CONSULTATION':
      return { ...state, nextConsultation: action.payload };
    case 'SET_EDITABLE_PATIENT_DETAILS':
      return { ...state, editablePatientDetails: action.payload };
    case 'SET_EXTRA_DATA':
      return { ...state, extraData: action.payload };
    case 'UPDATE_EXTRA_DATA_FIELD':
      return {
        ...state,
        extraData: {
          ...state.extraData,
          [action.payload.field]: action.payload.value,
        },
      };
    case 'ADD_MEDICATION':
      return {
        ...state,
        extraData: {
          ...state.extraData,
          medications: [
            ...state.extraData.medications,
            { id: crypto.randomUUID(), name: '', dose: '', freqMorning: false, freqNoon: false, freqNight: false, frequency: '', duration: '', instructions: '', notes: '' },
          ],
        },
      };
    case 'REMOVE_MEDICATION':
      return {
        ...state,
        extraData: {
          ...state.extraData,
          medications: state.extraData.medications.filter((_: any, i: number) => i !== action.payload),
        },
      };
    case 'UPDATE_MEDICATION':
      const newMeds = [...state.extraData.medications];
      newMeds[action.payload.index] = {
        ...newMeds[action.payload.index],
        [action.payload.field]: action.payload.value,
      };
      return {
        ...state,
        extraData: {
          ...state.extraData,
          medications: newMeds,
        },
      };
    case 'SET_SUGGESTED_MEDICATIONS':
      return { ...state, suggestedMedications: action.payload };
    case 'SET_SUGGESTED_ADVICE':
      return { ...state, suggestedAdvice: action.payload };
    case 'SET_SUGGESTED_INVESTIGATIONS':
      return { ...state, suggestedInvestigations: action.payload };
    case 'SET_SUGGESTED_FOLLOWUP':
      return { ...state, suggestedFollowup: action.payload };
    case 'SET_SAVED_MEDICATIONS':
      return { ...state, savedMedications: action.payload };
    case 'SET_TEXT_SHORTCUTS':
      return { ...state, textShortcuts: action.payload };
    case 'SET_MODAL_OPEN':
      switch (action.payload.modal) {
        case 'medications':
          return { ...state, isMedicationsModalOpen: action.payload.isOpen };
        case 'keyword':
          return { ...state, isKeywordModalOpen: action.payload.isOpen };
        case 'history':
          return { ...state, isHistoryModalOpen: action.payload.isOpen };
        case 'saveBundle':
          return { ...state, isSaveBundleModalOpen: action.payload.isOpen };
        case 'shortcut':
          return { ...state, isShortcutModalOpen: action.payload.isOpen };
        default:
          return state;
      }
    case 'SET_ALL_CONSULTATIONS':
      return {
        ...state,
        allConsultations: action.payload,
        pendingConsultations: action.payload.filter(c => c.status === 'pending'),
        completedConsultations: action.payload.filter(c => c.status === 'completed'),
      };
    case 'UPDATE_CONSULTATION_IN_LIST':
      const updatedConsultations = state.allConsultations.map(c =>
        c.id === action.payload.id ? action.payload : c
      );
      return {
        ...state,
        allConsultations: updatedConsultations,
        pendingConsultations: updatedConsultations.filter(c => c.status === 'pending'),
        completedConsultations: updatedConsultations.filter(c => c.status === 'completed'),
      };
    case 'SET_AGE':
      return { ...state, age: action.payload };
    default:
      return state;
  }
};

export const ConsultationContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const ConsultationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ConsultationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConsultationContext.Provider>
  );
};
