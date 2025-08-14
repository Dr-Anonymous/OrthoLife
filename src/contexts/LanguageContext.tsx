import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type Language = 'en' | 'te' | 'hi';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation data
const translations = {
  en: {
    // Common
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.learn': 'Learn',
    'nav.blog': 'Blog',
    'nav.patient-guides': 'Patient Guides',
    'nav.faqs': 'FAQs',
    'nav.resources': 'Resources',
    
    // Learn pages
    'learn.blog.title': 'Health Blog',
    'learn.blog.subtitle': 'Latest health tips and medical insights',
    'learn.guides.title': 'Patient Guides',
    'learn.guides.subtitle': 'Comprehensive guides for better health management',
    'learn.faqs.title': 'Frequently Asked Questions',
    'learn.faqs.subtitle': 'Quick answers to common health questions',
    'learn.resources.title': 'Health Resources',
    'learn.resources.subtitle': 'Useful tools and resources for your health journey',
  },
  te: {
    // Common - Telugu
    'nav.home': 'హోమ్',
    'nav.about': 'మా గురించి',
    'nav.contact': 'సంప్రదించండి',
    'nav.learn': 'నేర్చుకోండి',
    'nav.blog': 'బ్లాగ్',
    'nav.patient-guides': 'రోగుల గైడ్‌లు',
    'nav.faqs': 'తరచుగా అడిగే ప్రశ్నలు',
    'nav.resources': 'వనరులు',
    
    // Learn pages
    'learn.blog.title': 'ఆరోగ్య బ్లాగ్',
    'learn.blog.subtitle': 'తాజా ఆరోగ్య చిట్కాలు మరియు వైద్య సమాచారం',
    'learn.guides.title': 'రోగుల గైడ్‌లు',
    'learn.guides.subtitle': 'మెరుగైన ఆరోగ్య నిర్వహణ కోసం సమగ్ర గైడ్‌లు',
    'learn.faqs.title': 'తరచుగా అడిగే ప్రశ్నలు',
    'learn.faqs.subtitle': 'సాధారణ ఆరోగ్య ప్రశ్నలకు త్వరిత సమాధానాలు',
    'learn.resources.title': 'ఆరోగ్య వనరులు',
    'learn.resources.subtitle': 'మీ ఆరోగ్య ప్రయాణం కోసం ఉపయోగకరమైన సాధనాలు మరియు వనరులు',
  },
  hi: {
    // Common - Hindi
    'nav.home': 'होम',
    'nav.about': 'हमारे बारे में',
    'nav.contact': 'संपर्क करें',
    'nav.learn': 'सीखें',
    'nav.blog': 'ब्लॉग',
    'nav.patient-guides': 'मरीज़ गाइड',
    'nav.faqs': 'अक्सर पूछे जाने वाले प्रश्न',
    'nav.resources': 'संसाधन',
    
    // Learn pages
    'learn.blog.title': 'स्वास्थ्य ब्लॉग',
    'learn.blog.subtitle': 'नवीनतम स्वास्थ्य सुझाव और चिकित्सा अंतर्दृष्टि',
    'learn.guides.title': 'मरीज़ गाइड',
    'learn.guides.subtitle': 'बेहतर स्वास्थ्य प्रबंधन के लिए व्यापक गाइड',
    'learn.faqs.title': 'अक्सर पूछे जाने वाले प्रश्न',
    'learn.faqs.subtitle': 'सामान्य स्वास्थ्य प्रश्नों के त्वरित उत्तर',
    'learn.resources.title': 'स्वास्थ्य संसाधन',
    'learn.resources.subtitle': 'आपकी स्वास्थ्य यात्रा के लिए उपयोगी उपकरण और संसाधन',
  }
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  useEffect(() => {
    // Get language from URL parameter
    const langParam = searchParams.get('lang') as Language;
    if (langParam && ['en', 'te', 'hi'].includes(langParam)) {
      setCurrentLanguage(langParam);
    }
  }, [searchParams]);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
    // Update URL parameter
    const newParams = new URLSearchParams(searchParams);
    newParams.set('lang', language);
    setSearchParams(newParams);
  };

  const t = (key: string, fallback?: string): string => {
    const translation = translations[currentLanguage][key as keyof typeof translations[typeof currentLanguage]];
    return translation || fallback || key;
  };

  const value = {
    currentLanguage,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};