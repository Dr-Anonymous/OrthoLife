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

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: 'local' | 'server') => void;
  localData: any;
  serverData: any;
}

const DataField = ({ label, value }: { label: string; value: any }) => (
  <div className="mb-2">
    <p className="font-semibold">{label}:</p>
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</p>
  </div>
);

/**
 * ConflictResolutionModal Component
 * 
 * Handles data synchronization conflicts (Offline vs Online edits).
 * Features:
 * - Side-by-side comparison of Local vs Server data.
 * - Choice to "Keep Local" (Overwrite server) or "Discard Local" (Fetch server).
 */
export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  localData,
  serverData,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resolve Data Conflict</DialogTitle>
          <DialogDescription>
            The consultation you edited offline was also changed on the server. Please choose which version to keep.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 my-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Local Version</CardTitle>
            </CardHeader>
            <CardContent>
              <DataField label="Last Saved" value={new Date(localData.timestamp).toLocaleString()} />
              <DataField label="Complaints" value={localData.extraData.complaints} />
              <DataField label="Diagnosis" value={localData.extraData.diagnosis} />
              <DataField label="Medications" value={`${localData.extraData.medications.length} items`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Server Version</CardTitle>
            </CardHeader>
            <CardContent>
              <DataField label="Last Saved" value={new Date(serverData.updated_at).toLocaleString()} />
              <DataField label="Complaints" value={serverData.consultation_data.complaints} />
              <DataField label="Diagnosis" value={serverData.consultation_data.diagnosis} />
              <DataField label="Medications" value={`${serverData.consultation_data.medications.length} items`} />
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve('server')}>
            Discard Local Changes
          </Button>
          <Button onClick={() => onResolve('local')}>
            Keep My Local Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
