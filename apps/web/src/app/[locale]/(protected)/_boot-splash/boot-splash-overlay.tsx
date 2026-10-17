import { BrandMark } from '@/shared/ui/brand-mark';

/**
 * The "app is booting" splash, always in the tree on server and client. Visibility comes only from the
 * `data-booting` attribute (set by BootSplashScript, cleared by BootSplashReady) via `.app-boot-splash`
 * in globals.css, so hydration has nothing to disagree about. `aria-hidden` and no focusable element.
 */
export function BootSplashOverlay() {
  return (
    <div className="app-boot-splash" aria-hidden="true">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-splash-in text-foreground motion-reduce:animate-none">
          <BrandMark layer="cms" size={72} />
        </div>
        <div className="h-px w-20 overflow-hidden rounded-full bg-border motion-reduce:hidden">
          <div className="h-full w-1/3 animate-splash-hairline rounded-full bg-foreground/50" />
        </div>
      </div>
    </div>
  );
}
