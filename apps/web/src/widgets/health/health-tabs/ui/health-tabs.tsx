'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Dumbbell,
  type LucideIcon,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * The health module's sub-navigation.
 *
 * A segmented control under the existing header rather than a bottom tab bar:
 * `/space` already has one navigation system (the rail above `lg`,
 * `SpaceNavTrigger` in each page's header below it), and a second one scoped to
 * this module would leave a phone with two.
 *
 * 44px tall — the minimum comfortable touch target, and this is a phone-first
 * surface.
 *
 * The `gym` tab arrived with phase 2a, together with the surface behind it —
 * it was deliberately absent until then, because a tab that leads to a 404 is
 * worse than one that appears when its screen does. `insights` arrived with
 * phase 3 on the same rule.
 *
 * Insights is a TOP-LEVEL tab rather than a page under sleep or gym, because
 * the whole measure is the join between the two: filing it under either would
 * say the other is its subject matter. It also has to be a tab at all — the
 * segmented control marks the current surface, and a route that no tab owns
 * leaves the control saying nothing, which is exactly what `prefixes` exists
 * to prevent for the catalogue.
 *
 * Gym owns THREE paths, not one. `/space/health/gym` is the screen, but the
 * routine editor lives under it and the exercise catalogue sits beside it at
 * `/space/health/exercises` — both are gym surfaces, and a reader standing on
 * either one has not left the module. `prefixes` exists for that: a tab is
 * current when the path starts with any of the routes it owns, so the catalogue
 * does not silently unmark every tab and leave the control saying nothing.
 */
export function HealthTabs() {
  const t = useTranslations('dashboard.health.tabs');
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLElement>(null);

  // Whether the strip actually overflows, re-measured on layout change
  // (a resize, or an orientation flip) rather than once on mount — the same
  // four tabs that scroll in portrait fit without scrolling once the phone
  // turns landscape, and the edge fade below must not linger once nothing is
  // clipped. `ResizeObserver`, not a scroll listener or a timer: it fires on
  // the CONTAINER's box changing, which is the actual condition this cares
  // about, and it needs no polling.
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The glyphs are the module's own vocabulary, not new pictures: a moon
  // already means bed/sleep on the entry form and the bedtime-variation tile,
  // and a dumbbell already means a workout on the factor grid. A tab whose
  // icon disagrees with the icon on the screen it leads to is worse than no
  // icon at all. The label stays beside every one of them (§14) — these are
  // `aria-hidden` and the text is what names the destination.
  const tabs: {
    href:
      | '/space/health'
      | '/space/health/sleep'
      | '/space/health/gym'
      | '/space/health/insights';
    label: string;
    icon: LucideIcon;
    /** Overview would otherwise match every path in the module. */
    exact?: boolean;
    /** Every route this tab stands for, when that is more than its own href. */
    prefixes?: string[];
  }[] = [
    {
      href: '/space/health',
      label: t('overview'),
      icon: Activity,
      exact: true,
    },
    { href: '/space/health/sleep', label: t('sleep'), icon: Moon },
    {
      href: '/space/health/gym',
      label: t('gym'),
      icon: Dumbbell,
      prefixes: ['/space/health/gym', '/space/health/exercises'],
    },
    {
      href: '/space/health/insights',
      label: t('insights'),
      icon: Sparkles,
    },
  ];

  // The bar SCROLLS INSIDE ITSELF rather than squeezing, and that is what the
  // fourth tab made necessary. At `text-sm` the four labels plus their icons
  // need about 360px in English and more in Vietnamese, which does not fit a
  // 375px phone once the padding and the gaps are taken off.
  //
  // `flex-[1_0_auto]` on each tab, and the BASIS is the load-bearing third of
  // it. `flex-1 shrink-0` was here first and did the opposite of what it
  // claimed: `flex-1` is `flex: 1 1 0%`, so a tab's width came from the space
  // available rather than from its own label, and `shrink-0` could not put
  // that back — nothing was shrinking, the tabs were growing up from a zero
  // basis. The explicit `min-w-[5.25rem]` then replaced the automatic
  // min-content floor that would otherwise have kept each label whole, so at
  // 371px every tab settled on exactly 84px while "Tổng quan" needed 93px: the
  // labels spilled out of their pills, ran into the 8px gaps, and the first
  // one started 5px from the screen edge — INSIDE the 12px gutter this bar
  // pads itself with. `basis: auto` measures the label instead, so a tab is
  // never narrower than its own text, `grow: 1` still shares the extra width
  // on a screen where they all fit, and `min-w` goes back to being a floor for
  // short labels ("Gym") rather than a cap on long ones. The strip now
  // genuinely overflows when it must, which is the case the scrolling and the
  // edge fade below were written for and never actually saw.
  //
  // The overflow is on this element, never on the body (§14).
  //
  // Two things a scrolling strip needs that a squeezing one does not, and
  // both used to be missing:
  //
  // A horizontally-scrolling flex container's own trailing padding is not
  // reliably part of the scrollable area on every engine — WebKit has long
  // dropped it once content overflows, so a container padded with `px-3`
  // shows its right gutter at rest but not once scrolled to the end: the
  // last tab lands flush against the edge. `pl-3` here supplies the START
  // gutter only (that side is never in question — scrollLeft 0 always shows
  // it); the END gutter is a real trailing element instead, sized so it
  // reproduces the same 12px `px-3` used to promise: `gap-2` (8px, the same
  // gap between every tab) plus this element's own `w-1` (4px). Real content
  // is unambiguously part of `scrollWidth` everywhere, so the true end
  // gutter is now the same 12px on every engine rather than depending on
  // which one keeps counting after the last tab.
  //
  // Nothing on screen said the strip scrolled at all, which is what "no
  // padding" actually looked like — the last tab flush against the edge and
  // a phone with no habit of dragging a segmented control sideways. The mask
  // fades both ends whenever `scrollable` is true, in the same black/
  // transparent gradient in both themes (masking removes paint rather than
  // adding a colour, so it needs no dark-mode variant), and only masks —
  // never captures — so it cannot intercept a tap on the tab underneath it.
  return (
    <nav
      ref={scrollerRef}
      className={cn(
        'flex shrink-0 gap-2 overflow-x-auto border-b py-2 pl-3',
        scrollable &&
          '[-webkit-mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)] [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]'
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? pathname === tab.href
          : (tab.prefixes ?? [tab.href]).some((prefix) =>
              pathname.startsWith(prefix)
            );

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              // A full pill rather than a 6px radius: the module is now a
              // page of 16–24px corners, and a squared-off tab above it reads
              // as belonging to a different screen.
              'flex h-11 min-w-[5.25rem] flex-[1_0_auto] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-sm',
              'transition-colors duration-200',
              // Fill AND weight AND text tone AND `aria-current` — §14's rule
              // that colour may not be the sole carrier of a state, and on an
              // achromatic palette there is no hue to lean on anyway. Same
              // three cues `SpaceNavRail` marks its current item with.
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {tab.label}
          </Link>
        );
      })}

      {/* The end gutter — see the block comment above. `w-1` (4px) plus the
          `gap-2` (8px) before it totals 12px, `px-3`'s own value, so this
          reads as the same trailing space as every other side of the bar. */}
      <div aria-hidden className="w-1 shrink-0" />
    </nav>
  );
}
