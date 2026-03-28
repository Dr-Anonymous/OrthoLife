import React from 'react';
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    const currentPath = location.pathname;
    const lowerPath = currentPath.toLowerCase();

    // Skip switching logic for non-public paths
    if (lowerPath.includes('/op') || lowerPath.includes('/ip') || lowerPath.includes('/my')) {
      return;
    }

    let newPath = '';
    const searchParams = new URLSearchParams(location.search);

    if (lng === 'te') {
      // Only use prefix-based routing for content-heavy sections like blog and guides
      if (!lowerPath.startsWith('/te')) {
        if (lowerPath.startsWith('/blog') || lowerPath.startsWith('/guides')) {
          newPath = `/te${currentPath}`;
          // Preserve any existing search parameters (except ?lang=te parameter)
          searchParams.delete('lang');
          const qs = searchParams.toString();
          if (qs) {
            newPath += `?${qs}`;
          }
        }
      }
    } else { // lng === 'en'
      // Handle prefix-based Telugu URLs
      if (lowerPath.startsWith('/te')) {
        newPath = currentPath.substring(3); // Remove /te
        // Ensure no redundant lang param exists
        searchParams.delete('lang');
        const qs = searchParams.toString();
        if (qs) {
          newPath += `?${qs}`;
        }
      }
    }

    if (newPath) {
      navigate(newPath);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={16} className="text-muted-foreground" />
      <div className="flex bg-muted rounded-md p-1">
        {[
          { code: 'en', label: 'EN' },
          { code: 'te', label: 'తె' }
        ].map(({ code, label }) => (
          <Button
            key={code}
            size="sm"
            variant={i18n.language === code ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => changeLanguage(code)}
            type="button"
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};
