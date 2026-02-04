export interface TextShortcut {
    id: string;
    shortcut: string;
    expansion: string;
}

export interface Medication {
    id: string;
    name: string;
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
}

export interface Consultation {
    id: string;
    status: string;
    created_at: string;
    visit_type?: string;
    location?: string;
    language?: string;
    patient: Patient;
    consultation_data?: any;
    last_visit_date?: string;
    duration?: number;
    procedure_fee?: number | null;
    procedure_consultant_cut?: number | null;
    referred_by?: string | null;
    referral_amount?: number | null;
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
