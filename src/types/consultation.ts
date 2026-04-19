export interface TextShortcut {
    id: string;
    shortcut: string;
    expansion: string;
}

export interface BrandMetadata {
    name: string;
    cost?: number;
    packSize?: number;
    locations?: string[];
}

export interface Medication {
    id: string;
    composition: string;
    brand_metadata?: BrandMetadata[];
    savedMedicationId?: string;
    brandName?: string;
    dose: string;
    freqMorning: boolean;
    freqNoon: boolean;
    freqNight: boolean;
    frequency: string;
    duration: string;
    instructions: string;
    notes: string;
    instructions_te?: string;
    frequency_te?: string;
    duration_te?: string;
    notes_te?: string;
}

export interface Patient {
    id: string;
    name: string;
    dob: string;
    sex: string | null;
    phone: string;
    drive_id: string | null;
    is_dob_estimated?: boolean;
    secondary_phone?: string;
    occupation?: string;
    blood_group?: string;
    hometown?: string;
    allergies?: string;
}

export interface ConsultantBio {
    en: string;
    te: string;
}

export type ConsultantText = ConsultantBio;

export interface ConsultantService {
    title: { en: string; te: string };
    description: { en: string; te: string };
    icon: string;
}

export interface Consultant {
    id: string;
    phone: string;
    name: ConsultantText;
    qualifications?: ConsultantText;
    specialization?: ConsultantText;
    address?: ConsultantText;
    experience?: ConsultantText;
    email?: string;
    photo_url?: string;
    sign_url?: string;
    seal_url?: string;
    logo_url?: string;
    bio?: ConsultantBio;
    services?: ConsultantService[];
    is_admin: boolean;
    is_active: boolean;
    password?: string;
    reception_phone?: string;
    reception_password?: string;
    is_legacy_handler?: boolean;
    is_whatsauto_active?: boolean;
}

export interface Consultation {
    id: string;
    status: string;
    created_at: string;
    visit_type?: string;
    location?: string;
    language?: string;
    patient: Patient;
    patient_id: string;
    consultant_id?: string;
    consultant?: { name: any };
    consultation_data?: ExtraData;
    last_visit_date?: string;
    duration?: number;
    procedure_fee?: number | null;
    procedure_consultant_cut?: number | null;
    referred_by?: string | null;
    referral_amount?: number | null;
    next_review_date?: string | null;
}

export interface Guide {
    id: number;
    title: string;
    description: string;
    categories: { name: string };
    guide_translations: {
        language: string;
        title: string;
        description: string;
    }[];
}

export interface MatchedGuide {
    query: string;
    guide?: Guide;
    guideLink?: string;
}

export interface InvestigationReport {
    fileId: string;
    fileName: string;
    gist: string;
    mimeType?: string;
}

export interface CertificateData {
    restPeriodDays: number;
    restPeriodStartDate: string | Date;
    treatmentFromDate: string | Date;
    rejoinDate?: string | Date;
    rejoinActivity?: string;
    certificateDate: string | Date;
    consultationDate: string | Date;
    customContent?: string;
}

export interface ReceiptData {
    amountPaid: number;
    serviceName: string;
    id?: string;
    created_at?: string;
}

export interface ExtraData {
    complaints: string;
    medicalHistory: string;
    findings: string;
    investigations: string;
    diagnosis: string;
    advice: string;
    advice_te?: string;
    followup: string;
    followup_te?: string;
    medications: Medication[];
    weight: string;
    bp: string;
    temperature: string;
    height: string;
    pulse: string;
    spo2: string;
    bmi: string;
    allergy?: string;
    personalNote: string;
    procedure: string;
    procedure_fee: string;
    procedure_consultant_cut: string;
    referred_to: string;
    referred_to_list: string[];
    referred_by: string;
    referral_amount: string;
    visit_type: string;
    affordabilityPreference: string;
    orthotics?: string;
    investigation_reports?: InvestigationReport[];
    certificates?: CertificateData[];
    receipts?: ReceiptData[];
}

export interface AutofillProtocol {
    id: number;
    keywords: string[];
    medication_ids: number[];
    advice?: string;
    advice_te?: string;
    investigations?: string;
    followup?: string;
    followup_te?: string;
    orthotics?: string;
    orthotics_te?: string;
}
