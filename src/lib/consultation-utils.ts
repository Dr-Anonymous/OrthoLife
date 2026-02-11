
import { Guide } from '@/types/consultation';

export const generateCompletionMessage = (
    patient: any,
    matchedGuides: any[],
    language: string
): string => {
    const isTelugu = language === 'te';
    const patientName = patient.name;
    const patientPhone = patient.phone;

    const guideLinks = matchedGuides
        .filter(mg => mg.guideLink)
        .map(mg => mg.guideLink);

    const linksText = guideLinks.join('\n\n');

    if (isTelugu) {
        if (guideLinks.length > 0) {
            return `🙏 నమస్కారం ${patientName} గారు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీరు ఇప్పుడు-\n- మీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}\n\n- ఆహారం 🍚 & వ్యాయామ 🧘‍♀️ సలహాలు తెలుసుకోవచ్చు-\n\n${linksText}`;
        } else {
            return `🙏 నమస్కారం ${patientName} గారు,\nడాక్టర్ శామ్యూల్ మనోజ్ చెరుకూరితో మీ కన్సల్టేషన్ పూర్తయింది 🎉.\n\nమీ ప్రిస్క్రిప్షన్‌ను 📋 డౌన్లోడ్ చేసుకోవచ్చు-\n\nhttps://ortho.life/p/${patientPhone}`;
        }
    } else {
        if (guideLinks.length > 0) {
            return `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nYou can now- \n- Download your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}\n\n- Read diet 🍚 & exercise 🧘 advice-\n\n${linksText}`;
        } else {
            return `👋 Hi ${patientName},\nYour consultation with Dr Samuel Manoj Cherukuri has concluded 🎉.\n\nDownload your prescription 📋-\n\nhttps://ortho.life/p/${patientPhone}`;
        }
    }
};
