import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path, Polyline } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Patient, Medication, Consultant, PrintOptions } from '@/types/consultation';
import { cleanAdviceLine, calculateFollowUpDate } from '@/lib/utils';

// Import fonts with ?url suffix to get valid asset URLs that work in Web Workers
import interRegular from '@/assets/fonts/Inter-Regular.ttf?url';
import interBold from '@/assets/fonts/Inter-Bold.ttf?url';
import interItalic from '@/assets/fonts/Inter-Italic.ttf?url';
import notoRegular from '@/assets/fonts/NotoSansTelugu-Regular.ttf?url';
import notoBold from '@/assets/fonts/NotoSansTelugu-Bold.ttf?url';

// Register standard and Telugu fonts lazily to avoid race conditions during module evaluation
let fontsRegistered = false;

const ensureFontsRegistered = () => {
  if (fontsRegistered) return;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: interRegular, fontWeight: 400 },
      { src: interBold, fontWeight: 700 },
      { src: interItalic, fontWeight: 400, fontStyle: 'italic' }
    ]
  });

  Font.register({
    family: 'Noto Sans Telugu',
    fonts: [
      { src: notoRegular, fontWeight: 'normal' },
      { src: notoBold, fontWeight: 'bold' }
    ]
  });

  fontsRegistered = true;
};

// Helper to detect Telugu characters
const hasTelugu = (text: string) => /[\u0C00-\u0C7F]/.test(text);

const MixedText = ({ children, style, ...props }: any) => {
  if (typeof children !== 'string') return <Text style={style} {...props}>{children}</Text>;

  const isTelugu = hasTelugu(children);
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};

  const combinedStyle: any = {
    ...flatStyle,
    fontFamily: isTelugu ? 'Noto Sans Telugu' : 'Inter'
  };

  if (isTelugu && combinedStyle.fontStyle === 'italic') {
    combinedStyle.fontStyle = 'normal';
  }

  return <Text style={combinedStyle} {...props}>{children}</Text>;
};

const IconPhone = () => (
  <Svg width={10} height={10} style={{ marginRight: 4, position: 'relative', top: 1 }} viewBox="0 0 24 24">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="#334155" />
  </Svg>
);

const IconEmail = () => (
  <Svg width={10} height={10} style={{ marginRight: 4, position: 'relative', top: 1 }} viewBox="0 0 24 24">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,6 12,13 2,6" fill="none" stroke="#334155" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconComplaints = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="M12 21a9 9 0 0 0 9-9 9 9 0 0 0-9-9 9 9 0 0 0-9 9 9 9 0 0 0 9 9z" fill="none" stroke="#1d4ed8" strokeWidth={1.5} />
    <Path d="M8 12h8" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M12 8v8" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const IconHistory = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconAdvice = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconMedication = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="m15 7 3.5 3.5" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M6.35 12.2a4.45 4.45 0 0 1 6.3-6.3l6.05 6.05a4.45 4.45 0 0 1-6.3 6.3L6.35 12.2Z" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m11.5 11.5 3 3" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const IconFollowUp = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBraces = () => (
  <Svg width={12} height={12} style={{ marginRight: 4, position: 'relative', top: 1.5 }} viewBox="0 0 24 24">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheck = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Polyline points="20 6 9 17 4 12" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSun = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" style={{ marginBottom: 2 }}>
    <Path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconNoon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" style={{ marginBottom: 2 }}>
    <Path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M19.07 4.93l-1.41 1.41M15.94 14A5 5 0 0 0 6 12a3 3 0 0 0 0 6h9.5a3.5 3.5 0 1 0 0-7Z" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconNight = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24" style={{ marginBottom: 2 }}>
    <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    lineHeight: 1.15,
    padding: 0,
  },
  contentContainer: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#dbeafe',
    marginBottom: 8,
    paddingBottom: 6, // Added padding to move the line away from the text
  },
  logoClip: {
    width: 250,
    height: 70,
    overflow: 'hidden',
  },
  logo: {
    width: 250,
    height: 70,
    objectFit: 'contain',
  },
  doctorInfo: {
    textAlign: 'right',
    alignItems: 'flex-end',
    maxWidth: '50%',
  },
  doctorName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 1,
  },
  doctorQuals: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 0,
  },
  doctorSpec: {
    fontSize: 10,
    color: '#64748b',
  },
  contactText: {
    fontSize: 10,
    lineHeight: 1,
    marginTop: 4,
    color: '#334155',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#1d4ed8',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1d4ed8',
    alignSelf: 'center',
    paddingBottom: 2,
    lineHeight: 1,
  },
  patientBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  patientCol: {
    flex: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  patientLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    width: 50,
  },
  patientValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  vitalsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
    marginBottom: 12,
    gap: 12
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginRight: 4,
  },
  vitalValue: {
    fontSize: 10,
    color: '#0f172a',
  },
  section: {
    marginBottom: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1d4ed8',
    lineHeight: 1,
  },
  sectionText: {
    fontSize: 10,
    color: '#1e293b',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  th: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    fontSize: 9,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    textAlign: 'center',
    justifyContent: 'center',
  },
  td: {
    padding: 3,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    justifyContent: 'center',
  },
  colNo: { width: '6%', textAlign: 'center' },
  colName: { width: '28%' },
  colDose: { width: '12%' },
  colFreq: { width: '22%' },
  colDur: { width: '12%' },
  colInst: { width: '20%', borderRightWidth: 0 },
  subHeaderRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  freqCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingVertical: 3,
    paddingHorizontal: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  medNotes: {
    paddingVertical: 0,
    paddingLeft: 12,
    fontSize: 6,
    fontStyle: 'italic',
    color: '#64748b',
    flex: 1,
  },
  followupContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  followupDateBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  followupDateText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1d4ed8',
    lineHeight: 1,
    marginTop: 1,
  },
  signatureContainer: {
    position: 'absolute',
    bottom: 100,
    right: 40,
    alignItems: 'center',
  },
  signImage: {
    height: 50,
    width: 120,
    objectFit: 'contain',
    zIndex: 10,
  },
  sealImage: {
    position: 'absolute',
    height: 80,
    width: 80,
    opacity: 0.4,
    top: -15,
    zIndex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  qrCode: {
    width: 55,
    height: 55,
  },
  footerMask: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    opacity: 1,
  }
});

const TRANSLATIONS = {
  en: {
    'prescription.advice': 'Advice',
    'prescription.medication': 'Medication',
    'prescription.med_name': 'Name',
    'prescription.med_dose': 'Dose',
    'prescription.med_frequency': 'Frequency',
    'prescription.med_duration': 'Duration',
    'prescription.med_instructions': 'Instructions',
    'prescription.med_morning': 'Morning',
    'prescription.med_noon': 'Noon',
    'prescription.med_night': 'Night',
    'prescription.followup': 'Follow-up',
    'prescription.footer_text': 'Visit ortho.life/my to access your prescriptions, diets, and exercises anytime.'
  },
  te: {
    'prescription.advice': 'సలహా',
    'prescription.medication': 'మందులు',
    'prescription.med_name': 'పేరు',
    'prescription.med_dose': 'మోతాదు',
    'prescription.med_frequency': 'తరచుదనం',
    'prescription.med_duration': 'వ్యవధి',
    'prescription.med_instructions': 'సూచనలు',
    'prescription.med_morning': 'ఉదయం',
    'prescription.med_noon': 'మధ్యాహ్నం',
    'prescription.med_night': 'రాత్రి',
    'prescription.followup': 'తదుపరి',
    'prescription.footer_text': 'మీ ప్రిస్క్రిప్షన్లు, డైట్, మరియు వ్యాయామాలను ఎప్పుడైనా చూడటానికి ortho.life/my సందర్శించండి.'
  }
};

interface ConsultationData {
  complaints: string;
  medicalHistory?: string;
  findings: string;
  investigations: string;
  diagnosis: string;
  advice: string;
  followup: string;
  medications: Medication[];
  procedure?: string;
  referred_to?: string;
  referred_by?: string;
  bp?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  pulse?: string;
  spo2?: string;
  orthotics?: string;
}

interface PrescriptionPDFProps {
  patient: Patient;
  consultation: ConsultationData;
  consultationDate: Date;
  age: number | '';
  language: string;
  logoUrl: string;
  hospitalName?: string;
  qrCodeUrl?: string;
  noBackground?: boolean;
  visitType?: string;
  showDoctorProfile?: boolean;
  showSignSeal?: boolean;
  printOptions?: PrintOptions;
  showMargins?: boolean;
  consultant?: Consultant | null;
}

export const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({
  patient, consultation, consultationDate, age, language, logoUrl,
  qrCodeUrl, visitType, showDoctorProfile = false, showSignSeal = false, printOptions, showMargins = true, consultant
}) => {
  ensureFontsRegistered();

  const effectivePrintOptions: PrintOptions = {
    vitals: true,
    clinicalNotes: true,
    diagnosis: true,
    investigations: true,
    medications: true,
    advice: true,
    followup: true,
    procedure: true,
    referrals: true,
    orthotics: true,
    letterheadMode: false,
    fontSize: 'standard',
    signatureAlignment: 'right',
    footerMask: false,
    ...printOptions,
    footerMaskCoords: {
      bottom: 1.6,
      right: 4.22,
      width: 3.6,
      height: 0.4,
      ...(printOptions?.footerMaskCoords || {})
    }
  };

  const t = (key: keyof typeof TRANSLATIONS.en) => {
    const langObj = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    return langObj[key] || TRANSLATIONS.en[key] || key;
  };

  const hasMedications = consultation.medications && consultation.medications.length > 0;

  const cName = typeof consultant?.name === 'object' ? (consultant?.name?.[language === 'te' ? 'te' : 'en'] || consultant?.name?.en) : (consultant?.name || '');
  const cQuals = typeof consultant?.qualifications === 'object' ? (consultant?.qualifications?.[language === 'te' ? 'te' : 'en'] || consultant?.qualifications?.en) : (consultant?.qualifications || '');
  const cSpec = typeof consultant?.specialization === 'object' ? (consultant?.specialization?.[language === 'te' ? 'te' : 'en'] || consultant?.specialization?.en) : (consultant?.specialization || '');

  // Font scale logic
  const fScale = effectivePrintOptions.fontSize === 'compact' ? 0.85 : effectivePrintOptions.fontSize === 'large' ? 1.15 : 1;

  const renderText = (str: string) => str || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[
          styles.contentContainer,
          !showMargins && { paddingLeft: 10, paddingRight: 10 }
        ]}>

          {/* Header */}
          {effectivePrintOptions.letterheadMode ? (
            <View style={{ height: 100 }} />
          ) : (
            <View style={styles.header}>
              <View style={styles.logoClip}>
                {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
              </View>
              <View style={styles.doctorInfo}>
                <MixedText style={styles.doctorName}>{cName || 'Dr. Samuel Manoj Cherukuri'}</MixedText>
                <MixedText style={styles.doctorQuals}>{cQuals || 'MBBS, MS Ortho (Manipal)'}</MixedText>
                <MixedText style={styles.doctorSpec}>{cSpec || 'Ortho, Joint Replacement & Spine Surgeon'}</MixedText>
                <View style={styles.contactText}>
                  <IconPhone />
                  <Text style={{ marginRight: 8 }}>{consultant?.phone || '98668 12555'}</Text>
                  <Text style={{ marginRight: 8, opacity: 0.3 }}>|</Text>
                  <IconEmail />
                  <Text>{consultant?.email || 'info@ortho.life'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Title */}
          <View style={{ alignItems: 'center' }}>
            <MixedText style={styles.title}>
              {(!effectivePrintOptions.clinicalNotes && !effectivePrintOptions.diagnosis) ? "Prescription" : "Out-Patient Summary"}
            </MixedText>
          </View>

          {/* Patient Info */}
          <View style={styles.patientBox} wrap={false}>
            <View style={styles.patientCol}>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>Name:</Text>
                <MixedText style={styles.patientValue}>{patient.name}</MixedText>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>Age/Sex:</Text>
                <Text style={styles.patientValue}>{age}/{patient.sex}</Text>
              </View>
            </View>
            <View style={styles.patientCol}>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>Phone:</Text>
                <Text style={styles.patientValue}>{patient.phone}</Text>
              </View>
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>Date:</Text>
                <Text style={styles.patientValue}>{format(consultationDate, 'dd MMM yyyy')}</Text>
              </View>
            </View>
          </View>

          {/* Vitals */}
          {(consultation.bp || consultation.temperature || consultation.weight || consultation.height || consultation.pulse || consultation.spo2 || patient.allergies || patient.blood_group) && effectivePrintOptions.vitals ? (
            <View style={styles.vitalsSection} wrap={false}>
              {patient.blood_group ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Blood:</Text>
                  <Text style={[styles.vitalValue, { color: '#1d4ed8', fontWeight: 'bold' }]}>{patient.blood_group}</Text>
                </View>
              ) : null}
              {consultation.bp ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>BP:</Text>
                  <Text style={styles.vitalValue}>{consultation.bp}</Text>
                </View>
              ) : null}
              {consultation.temperature ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Temp:</Text>
                  <Text style={styles.vitalValue}>{consultation.temperature}</Text>
                </View>
              ) : null}
              {consultation.height ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Height:</Text>
                  <Text style={styles.vitalValue}>{consultation.height} cm</Text>
                </View>
              ) : null}
              {consultation.weight ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Weight:</Text>
                  <Text style={styles.vitalValue}>{consultation.weight} kg</Text>
                </View>
              ) : null}
              {consultation.pulse ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Pulse:</Text>
                  <Text style={styles.vitalValue}>{consultation.pulse} bpm</Text>
                </View>
              ) : null}
              {consultation.spo2 ? (
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>SpO2:</Text>
                  <Text style={styles.vitalValue}>{consultation.spo2} %</Text>
                </View>
              ) : null}
              {patient.allergies ? (
                <View style={styles.vitalItem}>
                  <Text style={[styles.vitalLabel, { color: '#ef4444' }]}>Allergies:</Text>
                  <Text style={[styles.vitalValue, { color: '#ef4444', fontWeight: 'bold' }]}>{patient.allergies}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Clinical Info Sections */}
          {consultation.complaints && effectivePrintOptions.clinicalNotes ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <IconComplaints />
                <MixedText style={styles.sectionTitle}>Complaints:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.complaints)}</MixedText>
            </View>
          ) : null}

          {consultation.medicalHistory && effectivePrintOptions.clinicalNotes ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <IconHistory />
                <MixedText style={styles.sectionTitle}>Past History:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.medicalHistory)}</MixedText>
            </View>
          ) : null}

          {consultation.findings && effectivePrintOptions.clinicalNotes ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <MixedText style={styles.sectionTitle}>Findings:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.findings)}</MixedText>
            </View>
          ) : null}

          {consultation.investigations && effectivePrintOptions.investigations ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <MixedText style={styles.sectionTitle}>Investigations:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.investigations)}</MixedText>
            </View>
          ) : null}

          {consultation.diagnosis && effectivePrintOptions.diagnosis ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <MixedText style={styles.sectionTitle}>Diagnosis:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.diagnosis)}</MixedText>
            </View>
          ) : null}

          {consultation.advice && effectivePrintOptions.advice ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <IconAdvice />
                <MixedText style={styles.sectionTitle}>{t('prescription.advice')}:</MixedText>
              </View>
              <View style={styles.sectionText}>
                {consultation.advice.split('\n').map((line, i) => {
                  if (!line.trim()) return <Text key={i}>{"\n"}</Text>;
                  return <MixedText key={i} style={{ fontSize: 10 * fScale }}>{renderText(line)}</MixedText>;
                })}
              </View>
            </View>
          ) : null}

          {/* Medications Table */}
          {hasMedications && effectivePrintOptions.medications ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconMedication />
                <MixedText style={styles.sectionTitle}>{t('prescription.medication')}:</MixedText>
              </View>
              <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={[styles.th, styles.colNo]}><Text>#</Text></View>
                  <View style={[styles.th, styles.colName]}><Text>{t('prescription.med_name')}</Text></View>
                  <View style={[styles.th, styles.colDose]}><Text>{t('prescription.med_dose')}</Text></View>
                  <View style={[styles.th, styles.colFreq, { padding: 0 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                      <Svg width={10} height={10} viewBox="0 0 24 24" style={{ marginRight: 4, position: 'relative', top: 2.5 }}>
                        <Path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" fill="none" stroke="#000" strokeWidth={2} />
                        <Path d="M12 6v6l4 2" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
                      </Svg>
                      <MixedText style={{ lineHeight: 1 }}>{t('prescription.med_frequency')}</MixedText>
                    </View>
                    <View style={styles.subHeaderRow}>
                      <View style={styles.freqCol}>
                        <Text style={{ fontSize: 7, lineHeight: 1 }}>Morning</Text>
                        <IconSun />
                      </View>
                      <View style={styles.freqCol}>
                        <Text style={{ fontSize: 7, lineHeight: 1 }}>A.Noon</Text>
                        <IconNoon />
                      </View>
                      <View style={[styles.freqCol, { borderRightWidth: 0 }]}>
                        <Text style={{ fontSize: 7, lineHeight: 1 }}>Night</Text>
                        <IconNight />
                      </View>
                    </View>
                  </View>
                  <View style={[styles.th, styles.colDur]}><MixedText>{t('prescription.med_duration')}</MixedText></View>
                  <View style={[styles.th, styles.colInst]}><MixedText>{t('prescription.med_instructions')}</MixedText></View>
                </View>

                {/* Rows */}
                {consultation.medications.map((med, index) => (
                  <View key={index} wrap={false}>
                    <View style={styles.tableRow}>
                      <View style={[styles.td, styles.colNo, { alignItems: 'center' }]}><Text>{index + 1}</Text></View>
                      <View style={[styles.td, styles.colName]}>
                        <MixedText>{(med as any).brandName || (med as any).composition || (med as any).name || ''}</MixedText>
                      </View>
                      <View style={[styles.td, styles.colDose]}><MixedText>{med.dose}</MixedText></View>

                      <View style={[styles.td, styles.colFreq, { padding: 0, flexDirection: 'row' }]}>
                        <View style={styles.freqCol}>
                          {med.freqMorning ? <IconCheck /> : null}
                        </View>
                        <View style={styles.freqCol}>
                          {med.freqNoon ? <IconCheck /> : null}
                        </View>
                        <View style={[styles.freqCol, { borderRightWidth: 0 }]}>
                          {med.freqNight ? <IconCheck /> : null}
                        </View>
                      </View>

                      <View style={[styles.td, styles.colDur]}><Text>{med.duration}</Text></View>
                      <View style={[styles.td, styles.colInst]}><Text>{med.instructions}</Text></View>
                    </View>
                    {med.notes ? (
                      <View style={styles.tableRow}>
                        <MixedText style={styles.medNotes}>{med.notes}</MixedText>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Followup */}
          {consultation.orthotics && effectivePrintOptions.orthotics ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.sectionHeader}>
                <IconBraces />
                <MixedText style={styles.sectionTitle}>Braces / Splints / Plaster:</MixedText>
              </View>
              <MixedText style={[styles.sectionText, { fontSize: 10 * fScale }]}>{renderText(consultation.orthotics)}</MixedText>
            </View>
          ) : null}

          {consultation.followup && effectivePrintOptions.followup ? (
            <View minPresenceAhead={40}>
              <View style={styles.followupContainer}>
                <IconFollowUp />
                <MixedText style={styles.sectionTitle}>{t('prescription.followup')}:</MixedText>
                {(() => {
                  const dueDate = calculateFollowUpDate(consultation.followup, consultationDate);
                  if (!dueDate) return null;
                  const dateObj = new Date(dueDate);
                  const isTelugu = language === 'te';
                  const dayName = dateObj.toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', { weekday: 'long' });
                  return (
                    <View style={styles.followupDateBox}>
                      <Text style={styles.followupDateText}>
                        {dateObj.toLocaleDateString(isTelugu ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} ({dayName})
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <MixedText style={styles.sectionText}>{renderText(consultation.followup)}</MixedText>
            </View>
          ) : null}

        </View>

        {/* Signature & Seal */}
        {showSignSeal && (consultant?.sign_url || consultant?.seal_url) ? (
          <View style={[
            styles.signatureContainer,
            effectivePrintOptions.signatureAlignment === 'left' ? { left: 40, right: 'auto' } :
              effectivePrintOptions.signatureAlignment === 'center' ? { left: 0, right: 0 } : {}
          ]} fixed>
            {consultant?.seal_url ? (
              <Image src={consultant.seal_url} style={styles.sealImage} />
            ) : null}
            {consultant?.sign_url ? (
              <Image src={consultant.sign_url} style={styles.signImage} />
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        {!effectivePrintOptions.letterheadMode ? (
          <View style={styles.footer} fixed>
            <View style={{ flex: 1 }}>
              <MixedText style={styles.footerText}>
                {language === 'te'
                  ? 'మీ ప్రిస్క్రిప్షన్లు, డైట్, మరియు వ్యాయామాలను ఎప్పుడైనా చూడటానికి ortho.life/my సందర్శించండి.'
                  : 'Visit ortho.life/my to access your prescriptions, diets, and exercises anytime.'}
              </MixedText>
            </View>
            {qrCodeUrl ? <Image src={qrCodeUrl} style={styles.qrCode} /> : null}
          </View>
        ) : null}

      </Page>

      {/* Doctor Profile Page */}
      {showDoctorProfile && consultant && (
        <Page size="A4" style={[styles.page, { backgroundColor: '#f0f9ff' }]}>
          <View style={{
            margin: 24,
            flex: 1,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#bae6fd',
            padding: 30,
            position: 'relative'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
              <View style={{ flex: 1, paddingRight: 20 }}>
                <MixedText style={{ fontSize: 24, fontWeight: 700, color: '#0369a1', marginBottom: 16 }}>
                  Know Your Doctor
                </MixedText>
                <MixedText style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  {cName}
                </MixedText>
                <MixedText style={{ fontSize: 14, color: '#0369a1', fontWeight: 700, marginBottom: 20 }}>
                  {cQuals}
                </MixedText>
                <MixedText style={{ fontSize: 18, fontWeight: 700, color: '#334155', lineHeight: 1.4 }}>
                  {cSpec}
                </MixedText>
              </View>
              
              {consultant.photo_url ? (
                <View style={{ 
                  width: 160, 
                  height: 180, 
                  borderRadius: 12, 
                  borderWidth: 4, 
                  borderColor: '#e0f2fe',
                  overflow: 'hidden'
                }}>
                  <Image 
                    src={consultant.photo_url} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </View>
              ) : null}
            </View>

            {consultant.bio?.[language === 'te' ? 'te' : 'en'] ? (
              <View style={{ marginBottom: 30 }}>
                <MixedText style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                  {consultant.bio[language === 'te' ? 'te' : 'en']}
                </MixedText>
              </View>
            ) : null}

            {/* Experience Banner */}
            <View style={{ 
              backgroundColor: '#0369a1', 
              padding: 12, 
              borderRadius: 4, 
              alignItems: 'center',
              marginBottom: 30 
            }}>
              <MixedText style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                8+ years and 5000+ successful surgeries
              </MixedText>
            </View>

            {consultant.services && consultant.services.length > 0 ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <IconHistory />
                  <MixedText style={{ fontSize: 16, fontWeight: 700, color: '#0369a1' }}>
                    Specialized Services
                  </MixedText>
                </View>
                
                <View style={{ gap: 10 }}>
                  {consultant.services.map((service, idx) => (
                    <View key={idx} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      backgroundColor: '#f8fafc', 
                      padding: 12, 
                      borderRadius: 8, 
                      borderWidth: 1, 
                      borderColor: '#e2e8f0',
                      gap: 12
                    }}>
                      <IconBraces />
                      <View style={{ flex: 1 }}>
                        <MixedText style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                          {service.title[language === 'te' ? 'te' : 'en']}
                        </MixedText>
                        <MixedText style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                          {service.description[language === 'te' ? 'te' : 'en']}
                        </MixedText>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Profile Footer */}
            <View style={{ 
              position: 'absolute', 
              bottom: 30, 
              left: 30, 
              right: 30, 
              alignItems: 'center',
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
              paddingTop: 20
            }}>
              <MixedText style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, marginBottom: 4 }}>
                OrthoLife, Road No. 3, R R Nagar, Near RTO office, Kakinada - 03
              </MixedText>
              <MixedText style={{ fontSize: 10, color: '#475569' }}>
                For Appointments, Contact: 99838 49838
              </MixedText>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
};
