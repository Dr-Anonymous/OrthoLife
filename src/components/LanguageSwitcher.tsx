import React from 'react';
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      <Globe size={16} className="text-muted-foreground" />
      <div className="flex bg-muted rounded-md p-1">
        {[
          { code: 'en', label: 'EN' },
          { code: 'te', label: 'తె' },
          { code: 'hi', label: 'हि' }
        ].map(({ code, label }) => (
          <Button
            key={code}
            size="sm"
            variant={currentLanguage === code ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => setLanguage(code as any)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};
