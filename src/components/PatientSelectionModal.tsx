import React from 'react';
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
  onClose: () => void;
  patients: { id: string; name: string }[];
  onSelect: (patient: { id: string; name: string }) => void;
}

const PatientSelectionModal: React.FC<PatientSelectionModalProps> = ({
  isOpen,
  onClose,
  patients,
  onSelect,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Patient</DialogTitle>
          <DialogDescription>
            Multiple patients are associated with this phone number. Please select one to view their prescription.
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
