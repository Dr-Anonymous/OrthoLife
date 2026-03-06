import { Patient, Medication } from './consultation';

export interface OfflineConsultationBundle {
    schemaVersion: 2;
    timestamp: string;
    patientDetails: Patient & {
        secondary_phone?: string;
        is_dob_estimated?: boolean;
        [key: string]: unknown;
    };
    extraData: {
        complaints?: string;
        findings?: string;
        investigations?: string;
        diagnosis?: string;
        advice?: string;
        followup?: string;
        medications: Medication[];
        weight?: string;
        bp?: string;
        temperature?: string;
        allergy?: string;
        personalNote?: string;
        procedure?: string;
        [key: string]: unknown;
    };
    status: 'pending' | 'under_evaluation' | 'completed';
    visit_type: string;
    location: string;
    language: string;
    duration: number;
    procedure_fee: number | null;
    procedure_consultant_cut: number | null;
    referred_by: string | null;
    referral_amount: number | null;
}
