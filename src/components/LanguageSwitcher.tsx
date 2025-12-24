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
    if (currentPath.includes('/op') || currentPath.includes('/ip') || currentPath.includes('/my')) {
      return;
    }
    let newPath;

    if (lng === 'te') {
      if (!currentPath.startsWith('/te')) {
        newPath = `/te${currentPath}`;
      }
    } else { // lng === 'en'
      if (currentPath.startsWith('/te')) {
        newPath = currentPath.substring(3);
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
