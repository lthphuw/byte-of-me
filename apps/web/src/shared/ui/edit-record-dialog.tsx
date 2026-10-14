'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { EditRecordGate } from './edit-record-gate';
import { RecordDialog, type RecordDialogSize } from './record-dialog';

/** What a manager hands its record dialog; the dialog adds the record and `onSubmit`. */
export interface EditRecordDialogControls {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set from the list row, so the title does not flip while the record loads. */
  isEditing: boolean;
  /** The full record is loading; the form stays unmounted until it arrives. */
  isLoadingInitialData?: boolean;
  /** The full-record fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  /** A save is in flight. */
  loading?: boolean;
}

interface EditRecordDialogProps extends EditRecordDialogControls {
  /** The record's singular name, for "New {entity}" and "Edit {entity}". */
  entity: string;
  editDescription?: string;
  createDescription?: string;
  size?: RecordDialogSize;
  formId: string;
  isDirty: boolean;
  /** The record the form seeds from has arrived. */
  hasRecord: boolean;
  /** The form's own skeleton, shown while the record loads. */
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * A `RecordDialog` for a record that is loaded by id before it is edited: the
 * title follows `isEditing`, the form waits behind an `EditRecordGate`, and Save
 * is disabled until the record is in hand.
 */
export function EditRecordDialog({
  entity,
  editDescription,
  createDescription,
  isEditing,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  loading,
  hasRecord,
  skeleton,
  children,
  ...dialog
}: EditRecordDialogProps) {
  const t = useTranslations('dashboard.shared.crud');

  return (
    <RecordDialog
      {...dialog}
      title={t(isEditing ? 'editTitle' : 'newTitle', { entity })}
      description={isEditing ? editDescription : createDescription}
      isPending={loading}
      submitDisabled={
        isEditing && (isLoadingInitialData || hasLoadError || !hasRecord)
      }
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={skeleton}
      >
        {children}
      </EditRecordGate>
    </RecordDialog>
  );
}
