import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PatientSelectionModalProps {
  isOpen: boolean;
  patients: { id: string; name: string }[];
  onSelect: (patient: { id: string; name: string }) => void;
}

const PatientSelectionModal: React.FC<PatientSelectionModalProps> = ({
  isOpen,
  patients,
  onSelect,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('patientSelectionModal.title')}</DialogTitle>
          <DialogDescription>
            {t('patientSelectionModal.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2">
          {patients.map((patient) => (
            <Button
              key={patient.id}
              onClick={() => onSelect(patient)}
              variant="outline"
            >
              {patient.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientSelectionModal;
