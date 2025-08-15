import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranslatedContent {
  text: string;
  isLoading: boolean;
  error: string | null;
}

export const useTranslatedContent = (originalText: string): TranslatedContent => {
  const { translateText, currentLanguage, isTranslating } = useLanguage();
  const [translatedText, setTranslatedText] = useState(originalText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const translateContent = async () => {
      if (!originalText.trim()) {
        setTranslatedText(originalText);
        return;
      }

      if (currentLanguage === 'en') {
        setTranslatedText(originalText);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const translated = await translateText(originalText, currentLanguage);
        setTranslatedText(translated);
      } catch (err) {
        console.error('Translation error:', err);
        setError('Translation failed');
        setTranslatedText(originalText); // Fallback to original
      } finally {
        setIsLoading(false);
      }
    };

    translateContent();
  }, [originalText, currentLanguage, translateText]);

  return {
    text: translatedText,
    isLoading: isLoading || isTranslating,
    error
  };
};