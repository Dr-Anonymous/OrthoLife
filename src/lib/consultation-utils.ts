import { Guide } from '@/types/consultation';

export const generateCompletionMessage = (
    patient: any,
    matchedGuides: any[],
    language: string,
    consultantName?: { en: string; te: string } | string,
    advice: string = ''
): string => {
    const isTelugu = language === 'te';
    const patientName = patient.name;
    const patientPhone = patient.phone;

    // Use provided consultant name or fallback to default
    const defaultConsultantName = {
        en: "OrthoLife",
        te: "ఆర్థోలైఫ్"
    };

    let docName = isTelugu ? defaultConsultantName.te : defaultConsultantName.en;
    if (consultantName) {
        if (typeof consultantName === 'string') {
            docName = consultantName;
        } else if (isTelugu) {
            docName = (consultantName as any).te || (consultantName as any).en || defaultConsultantName.te;
        } else {
            docName = (consultantName as any).en || (consultantName as any).te || defaultConsultantName.en;
        }
    }

    const guideLinks = matchedGuides
        .filter(mg => mg.guideLink)
        .map(mg => mg.guideLink);

    // Tracker Links Logic
    const trackerLinks: string[] = [];
    const normalizedAdvice = advice.toLowerCase();
    const patientParams = `p=${patientPhone}`;

    // Check for specific monitoring advice and add corresponding deep links
    if (normalizedAdvice.includes('sugar monitoring') || normalizedAdvice.includes('షుగర్ లెవల్స్ నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో షుగర్ లెవల్స్ నమోదు చేయండి 📍\nhttps://ortho.life/resources/sugar-tracker?${patientParams}`
            : `Log blood sugar levels at home 📍\nhttps://ortho.life/resources/sugar-tracker?${patientParams}`);
    }
    if (normalizedAdvice.includes('bp monitoring') || normalizedAdvice.includes('బీపీ నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో బీపీ (BP) నమోదు చేయండి 📍\nhttps://ortho.life/resources/bp-tracker?${patientParams}`
            : `Log BP readings at home 📍\nhttps://ortho.life/resources/bp-tracker?${patientParams}`);
    }
    if (normalizedAdvice.includes('temperature/fever monitoring') || normalizedAdvice.includes('జ్వరం/ఉష్ణోగ్రత నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో జ్వరం/ఉష్ణోగ్రత నమోదు చేయండి 📍\nhttps://ortho.life/resources/temp-tracker?${patientParams}`
            : `Log fever/temperature at home 📍\nhttps://ortho.life/resources/temp-tracker?${patientParams}`);
    }
    if (normalizedAdvice.includes('recovery progress') || normalizedAdvice.includes('రికవరీ పురోగతి')) {
        trackerLinks.push(isTelugu
            ? `మీ రికవరీ పురోగతిని నమోదు చేయండి 📍\nhttps://ortho.life/resources/recovery-tracker?${patientParams}`
            : `Log your recovery progress 📍\nhttps://ortho.life/resources/recovery-tracker?${patientParams}`);
    }
    if (normalizedAdvice.includes('pain monitoring') || normalizedAdvice.includes('నొప్పి తీవ్రతను నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో నొప్పి తీవ్రతను (Pain Score) నమోదు చేయండి 📍\nhttps://ortho.life/resources/pain-tracker?${patientParams}`
            : `Log your pain intensity score at home 📍\nhttps://ortho.life/resources/pain-tracker?${patientParams}`);
    }

    const sections = [];

    // 1. Prescription Section
    const prescriptionHeader = isTelugu ? '- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు -' : '- Download your prescription 📋 -';
    sections.push(`${prescriptionHeader}\n\nhttps://ortho.life/p/${patientPhone}`);

    // 2. Trackers Section
    if (trackerLinks.length > 0) {
        const trackerHeader = isTelugu ? '- ఆరోగ్య పర్యవేక్షణ (Health Monitoring) -' : '- Health Monitoring -';
        sections.push(`${trackerHeader}\n\n${trackerLinks.join('\n\n')}`);
    }

    // 3. Guides Section
    if (guideLinks.length > 0) {
        const guidesHeader = isTelugu ? '- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు -' : '- Read diet 🍚 & exercise 🧘 advice -';
        sections.push(`${guidesHeader}\n\n${guideLinks.join('\n\n')}`);
    }

    const greeting = isTelugu
        ? `🙏 నమస్కారం ${patientName} గారు,\n${docName}తో మీ కన్సల్టేషన్ పూర్తయింది 🎉.`
        : `👋 Hi ${patientName},\nYour consultation with ${docName} has concluded 🎉.`;

    return `${greeting}\n\n${sections.join('\n\n')}`;
};

/**
 * notifyConsultant
 * Finds the most recent consultant for a patient and sends a WhatsApp alert.
 */
export const notifyConsultant = async (supabase: any, patientPhone: string, message: string) => {
    try {
        const cleanedPhone = patientPhone.replace(/\D/g, '').slice(-10);

        // 1. Find the most recent consultation for this patient and get patient details
        const { data: consultations, error: consultError } = await supabase
            .from('consultations')
            .select(`
                consultant_id,
                patients!inner(id, name, phone)
            `)
            .eq('patients.phone', cleanedPhone)
            .order('created_at', { ascending: false })
            .limit(1);

        if (consultError || !consultations || consultations.length === 0) {
            console.error("Could not find consultant for patient:", patientPhone);
            return;
        }

        const consult = consultations[0];
        const consultantId = consult.consultant_id;
        const patient = consult.patients;

        // 2. Get consultant details
        const { data: consultant, error: consultantError } = await supabase
            .from('consultants')
            .select('phone, name')
            .eq('id', consultantId)
            .single();

        if (consultantError || !consultant) {
            console.error("Could not find consultant details:", consultantId);
            return;
        }

        const patientName = typeof patient.name === 'string' ? patient.name : (patient.name?.en || patient.name?.te || 'Patient');
        const alertBody = `🚨 *HEALTH ALERT* 🚨\n\n*Patient:* ${patientName}\n*Phone:* ${patient.phone}\n\n${message}`;

        // 3. Send WhatsApp via Edge Function
        const { data, error: functionError } = await supabase.functions.invoke('send-whatsapp', {
            body: {
                number: consultant.phone,
                message: alertBody,
                consultant_id: consultantId
            }
        });

        if (functionError) throw functionError;
        console.log("Consultant notified successfully:", data);

    } catch (err) {
        console.error("Error notifying consultant:", err);
    }
};
