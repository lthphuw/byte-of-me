import { BrandMark } from '@/shared/ui/brand-mark';

/**
 * The full-screen "app is booting" splash.
 *
 * Always in the tree, in both the server and the client render — nothing
 * here is conditional on `sessionStorage` or any other client-only signal.
 * Visibility is entirely driven by the `data-booting` attribute
 * `BootSplashScript` sets on `<html>` before first paint and `BootSplashReady`
 * clears once the app is ready, through the `.app-boot-splash` rules in
 * `globals.css`. No React state controls it, so there is nothing for
 * hydration to disagree about, and nothing here can flash.
 *
 * Decorative and self-dismissing: `aria-hidden` keeps it out of the
 * accessibility tree entirely, and it holds no focusable element, so it
 * cannot trap keyboard focus.
 */
export function BootSplashOverlay() {
  return (
    <div className="app-boot-splash" aria-hidden="true">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-splash-in text-foreground motion-reduce:animate-none">
          <BrandMark layer="space" size={72} />
        </div>
        <div className="h-px w-20 overflow-hidden rounded-full bg-border motion-reduce:hidden">
          <div className="h-full w-1/3 animate-splash-hairline rounded-full bg-foreground/50" />
        </div>
      </div>
    </div>
  );
}
