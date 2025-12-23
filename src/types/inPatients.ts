import { Medication } from './consultation';

export interface PatientSnapshot {
    id: string;
    name: string;
    dob: string | null;
    sex: string | null;
    phone: string;
}

export interface CourseDetails {
    admission_date: string;
    procedure: string;
    procedure_date: string | null;
    diagnosis: string;
    operation_notes?: string;
}

export interface DischargeData {
    medications: Medication[];
    post_op_care: string;
    review_date: string;
    clinical_notes: string;
}

export interface DischargeSummary {
    patient_snapshot: PatientSnapshot;
    course_details: CourseDetails;
    discharge_data: DischargeData;
}

export interface InPatient {
    id: string;
    created_at: string;
    patient_id: string;
    admission_date: string;
    discharge_date: string | null;
    diagnosis: string;
    procedure: string;
    procedure_date: string | null;
    status: 'admitted' | 'discharged';
    room_number?: string | null;
    discharge_summary?: DischargeSummary | null;
    language?: string | null;
    patient: {
        name: string;
        phone: string;
        dob: string | null;
        sex: string | null;
        drive_id?: string | null;
    };
}
