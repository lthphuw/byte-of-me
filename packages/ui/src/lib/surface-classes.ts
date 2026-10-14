// Class strings the modal family (dialog, alert-dialog, sheet, drawer) shares,
// so one edit moves all four. Merge a caller's `className` in with `cn`.

/** The dim behind a modal. The Radix overlays animate; vaul drives its own. */
export const SCRIM_FILL = 'fixed inset-0 z-50 bg-scrim/80';
export const SCRIM = `${SCRIM_FILL} data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-100 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`;

/** Centred dialog panel: enters easing out, leaves easing in and shorter. */
export const MODAL_PANEL =
  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:ease-enter data-[state=closed]:ease-exit data-[state=closed]:duration-100 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:slide-out-to-left-1/2 motion-safe:data-[state=closed]:slide-out-to-top-[48%] motion-safe:data-[state=open]:slide-in-from-left-1/2 motion-safe:data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg';

export const MODAL_HEADER = 'flex flex-col space-y-2 text-center sm:text-left';
export const MODAL_TITLE = 'text-lg font-semibold leading-none tracking-tight';
export const MODAL_DESCRIPTION = 'text-sm text-muted-foreground';
