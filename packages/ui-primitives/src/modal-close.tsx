'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * The corner close button of a dialog or sheet: a 44px box around a 16px glyph.
 * `focus-visible`, not `focus` — Radix focuses it on open, and a plain ring
 * drew a hard square on every mouse open.
 */
export function ModalClose({ label }: { label: string }) {
  return (
    <DialogPrimitive.Close className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
      <X className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </DialogPrimitive.Close>
  );
}
