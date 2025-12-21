import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface Patient {
  id: number;
  name: string;
  dob: string;
  sex: string;
  phone: string;
}

interface PatientConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: 'new' | { mergeWith: number }) => void;
  offlinePatient: Patient;
  conflictingPatients: Patient[];
}

export const PatientConflictModal: React.FC<PatientConflictModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  offlinePatient,
  conflictingPatients,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resolve Patient Conflict</DialogTitle>
          <DialogDescription>
            A patient you registered offline may be a duplicate of one or more existing patients. Please choose how to proceed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <Card>
            <CardHeader>
              <CardTitle>New Patient (Offline)</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Name:</strong> {offlinePatient.name}</p>
              <p><strong>Phone:</strong> {offlinePatient.phone}</p>
              <p><strong>DOB:</strong> {offlinePatient.dob ? format(new Date(offlinePatient.dob), 'PPP') : 'N/A'}</p>
            </CardContent>
          </Card>
          <div>
            <h3 className="font-semibold mb-2">Potential Duplicates on Server</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conflictingPatients.map(p => (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto"
                  key={p.id}
                  onClick={() => onResolve({ mergeWith: p.id })}
                >
                  <div className="text-left">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.phone} - DOB: {format(new Date(p.dob), 'PPP')}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel Sync
          </Button>
          <Button onClick={() => onResolve('new')}>
            Create as New Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
