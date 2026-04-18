
import { Guide } from '@/types/consultation';

export const generateCompletionMessage = (
    patient: any,
    matchedGuides: any[],
    language: string,
    consultantName?: { en: string; te: string },
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

    // Check for specific monitoring advice and add corresponding deep links
    if (normalizedAdvice.includes('sugar monitoring') || normalizedAdvice.includes('షుగర్ లెవల్స్ నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో షుగర్ లెవల్స్ నమోదు చేయండి 👇\nhttps://ortho.life/resources/sugar-tracker`
            : `Log blood sugar levels at home 👇\nhttps://ortho.life/resources/sugar-tracker`);
    }
    if (normalizedAdvice.includes('bp monitoring') || normalizedAdvice.includes('బీపీ నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో బీపీ (BP) నమోదు చేయండి 👇\nhttps://ortho.life/resources/bp-tracker`
            : `Log BP readings at home 👇\nhttps://ortho.life/resources/bp-tracker`);
    }
    if (normalizedAdvice.includes('temperature/fever monitoring') || normalizedAdvice.includes('జ్వరం/ఉష్ణోగ్రత నమోదు')) {
        trackerLinks.push(isTelugu
            ? `ఇంట్లో జ్వరం/ఉష్ణోగ్రత నమోదు చేయండి 👇\nhttps://ortho.life/resources/temp-tracker`
            : `Log fever/temperature at home 👇\nhttps://ortho.life/resources/temp-tracker`);
    }
    if (normalizedAdvice.includes('recovery progress') || normalizedAdvice.includes('రికవరీ పురోగతి')) {
        trackerLinks.push(isTelugu
            ? `మీ రికవరీ పురోగతిని నమోదు చేయండి 👇\nhttps://ortho.life/resources/recovery-tracker`
            : `Log your recovery progress 👇\nhttps://ortho.life/resources/recovery-tracker`);
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
