'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  useMediaQuery,
} from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

/** `lg` — the width at which `/space` shows its icon rail. Written as a query
 *  rather than a class because JavaScript decides which container mounts. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * One form, two containers: a bottom sheet on a phone, a centred dialog at
 * `lg`.
 *
 * A sheet comes up under the thumb that opened it, dims what it interrupted,
 * and backs out on Escape or an outside tap. At `lg` a sheet stapled across
 * the bottom of a monitor is a phone pattern in a desktop's clothes, so the
 * same content becomes an ordinary dialog.
 *
 * `useMediaQuery` decides which one mounts rather than `lg:hidden`, because
 * these bodies carry field ids: two copies means a duplicate `#exercise-name`
 * and a `<label for>` bound to whichever came first. The hook cannot answer
 * before mount and starts `false`, so a desktop reader gets the sheet branch
 * for one frame — invisible, because both start closed and this component is
 * controlled.
 *
 * `footer` is rendered OUTSIDE the scrolling body in both branches. A modal
 * whose only way out scrolls away is one the reader has to hunt through, and
 * on a phone the footer is also where the thumb already is.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What the form is for. Rendered as the accessible description in both
   *  branches — Radix warns when a dialog has none. */
  description: string;
  /** Submit/cancel controls, pinned below the scroll area. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex max-h-[85vh] flex-col gap-0 rounded-3xl p-0',
            className
          )}
        >
          <div className="shrink-0 space-y-1 px-6 pb-4 pt-6 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t px-6 py-4">{footer}</div>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* `hideClose` and a grab handle instead: the built-in X sits `right-2
          top-2`, the far corner from the thumb that opened a bottom sheet.
          Escape and an overlay tap still dismiss, and the footer carries the
          explicit way out.

          `88svh` rather than `88vh` — on iOS Safari `vh` is the TALL viewport,
          so a sheet sized in `vh` puts its own footer under the browser
          toolbar, which is exactly where its controls live.

          `motion-reduce:animate-none` because the slide-up is a CSS animation
          from `tailwindcss-animate`, and `MotionConfig reducedMotion="user"`
          covers framer-motion only (§14). */}
      <SheetContent
        side="bottom"
        hideClose
        className={cn(
          'flex max-h-[88svh] flex-col gap-0 rounded-t-3xl p-0 motion-reduce:animate-none',
          className
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
        />

        <div className="shrink-0 space-y-1 px-5 pb-4 pt-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
