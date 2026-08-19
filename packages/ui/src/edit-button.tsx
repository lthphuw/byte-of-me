'use client';

import { Pencil } from 'lucide-react';

import { Button } from './button';

export interface EditButtonProps {
  isSubmitting?: boolean;
  onClick?: () => void;
  /**
   * Accessible name — the button is icon-only, so without it every row action
   * is announced as an unnamed "button". English default because this package
   * has no next-intl context; callers pass a translated string.
   */
  label?: string;
}

export function EditButton({
  onClick,
  isSubmitting,
  label = 'Edit',
}: EditButtonProps) {
  return (
    <Button
      size="icon"
      type={'button'}
      variant="ghost"
      className="h-8 w-8"
      disabled={isSubmitting}
      onClick={onClick}
      aria-label={label}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}
