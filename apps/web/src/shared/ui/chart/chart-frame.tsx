import { cn } from '@/shared/lib/utils';

export interface ChartPoint {
  /** Human-readable x label. Also the screen-reader row header. */
  label: string;
  /** null renders as a gap, which is not the same as zero. */
  value: number | null;
}

/**
 * The shell every chart in this module sits in.
 *
 * Two things it exists to guarantee, both of which are easy to forget per
 * chart and impossible to forget here:
 *
 * 1. **A non-visual equivalent.** The SVG is `aria-hidden` and the same data is
 *    emitted as a real `<table>`, visually hidden. A `role="img"` with a label
 *    can only ever summarise; a reader who wants Tuesday's number needs the
 *    numbers.
 * 2. **Its own horizontal scroll.** Wide content scrolls INSIDE this box, so
 *    the page body never scrolls sideways on a phone.
 */
export function ChartFrame({
  title,
  summary,
  rows,
  valueLabel,
  formatValue,
  footer,
  className,
  children,
}: {
  title: string;
  summary: string;
  rows: ChartPoint[];
  valueLabel: string;
  /**
   * Formats a value for the ACCESSIBLE table. Without it the table reported
   * raw model units — `450` where the chart itself says `7h 30m` — which makes
   * the non-visual equivalent worse than the visual one it stands in for.
   */
  formatValue?: (value: number) => string;
  /**
   * A key, a scale, a caveat — anything that explains the marks above it.
   *
   * OUTSIDE the `aria-hidden` wrapper, deliberately: a legend is words, and
   * words that say what a shade means are exactly the part a reader who cannot
   * see the shades still needs. Inside `children` it would be hidden along
   * with the drawing it explains.
   */
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={cn('relative m-0 flex flex-col gap-3', className)}>
      <figcaption className="text-xs font-medium text-muted-foreground">
        {title}
      </figcaption>

      <div className="w-full overflow-x-auto">
        <div aria-hidden className="min-w-full">
          {children}
        </div>
      </div>

      {footer}

      {/* The `sr-only` goes on a WRAPPER, not on the table.
          `sr-only` hides by shrinking to 1×1 and clipping — and a `<table>`
          cannot be shrunk that way: under automatic table layout `width` is a
          MINIMUM, so the table stays as wide as its widest row and, being
          absolutely positioned, escapes every `overflow-x-clip` between here
          and the body. Measured on `/space/health/sleep` (now `/space/daily`)
          at a 386px viewport: the document's scrollWidth was 446px against a
          371px client width — a page that scrolled sideways on a phone
          because of an element nobody can see. A plain `div` clips its
          contents properly, and the
          table inside it is untouched, so screen readers still get the
          numbers. */}
      {/* `relative` on the figure above is load-bearing for THIS block.
          `sr-only` positions absolutely, and with no positioned ancestor the
          table resolved against the initial containing block: its static
          position sits deep inside a scrolled region, so the DOCUMENT grew to
          contain it and the whole page gained a second vertical scrollbar.
          Measured on the sleep screen: documentElement.scrollHeight 975
          against a 813px viewport, and hiding the sr-only blocks alone
          returned it to exactly 813.

          `clip` hides it from sight but changes nothing about layout
          geometry, which is why this is invisible until you measure the
          scroll height. Same family as the bug that put `sr-only` on a
          wrapping div instead of the <table>. */}
      <div className="sr-only">
        <table>
          <caption>{summary}</caption>
          <thead>
            <tr>
              <th scope="col">{title}</th>
              <th scope="col">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>
                  {row.value === null
                    ? '—'
                    : formatValue?.(row.value) ?? String(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
