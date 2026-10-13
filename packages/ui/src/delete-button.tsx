'use client';

import { Loader2, Trash2 } from 'lucide-react';

import { Button } from './button';

export interface DeleteButtonProps {
  isSubmitting?: boolean;
  onClick?: () => void;
  /**
   * Accessible name — the button is icon-only, so without it every row action
   * is announced as an unnamed "button". English default because this package
   * has no next-intl context; callers pass a translated string.
   */
  label?: string;
}

export function DeleteButton({
  onClick,
  isSubmitting,
  label = 'Delete',
}: DeleteButtonProps) {
  return (
    <Button
      type={'button'}
      size="icon"
      variant="ghost"
      // 44px on touch; 36px only with a fine pointer, under `can-hover:`.
      className="min-h-11 min-w-11 can-hover:min-h-9 can-hover:min-w-9 hover:text-destructive-text"
      disabled={isSubmitting}
      onClick={onClick}
      aria-label={label}
    >
      {isSubmitting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
