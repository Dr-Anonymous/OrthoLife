import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  // load translation using http -> see /public/locales
  .use(HttpBackend)
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV, // Set to false in production
    supportedLngs: ['en', 'te'],

    detection: {
      // order and from where user language should be detected
      order: ['path', 'querystring', 'localStorage', 'navigator', 'htmlTag', 'subdomain'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
      lookupFromPathIndex: 0,
    },

    ns: ['common'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false, // react already safes from xss
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;
