'use client';

import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The confirmed action is in flight: both buttons lock and the dialog stays. */
  isLoading?: boolean;
  /** The action cannot be undone (a delete). Others keep the primary style. */
  destructive?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
  destructive = false,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      // Escape and a scrim tap must not abandon an action that is in flight.
      onOpenChange={(next) => {
        if (!next && !isLoading) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            // Radix would close the dialog on its own; the caller decides when.
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
