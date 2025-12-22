import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}

/**
 * UnsavedChangesModal Component
 * 
 * Intercepts navigation or selection changes when form is dirty.
 * Features:
 * - Alert Dialog (Yes/No).
 * - "Yes" triggers save then proceed.
 * - "No" discards changes and proceeds.
 */
const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({ isOpen, onConfirm, onDiscard }) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to save your changes before proceeding?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>No</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Yes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesModal;
