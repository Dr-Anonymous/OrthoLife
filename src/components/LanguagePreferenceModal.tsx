import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LanguagePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LanguagePreferenceModal: React.FC<LanguagePreferenceModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Your Language</DialogTitle>
          <DialogDescription>
            Please select your preferred language for a better experience.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-around mt-4">
          <Button onClick={() => handleLanguageChange('te')}>Telugu</Button>
          <Button onClick={() => handleLanguageChange('en')}>English</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguagePreferenceModal;
