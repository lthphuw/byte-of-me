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
  className,
  children,
}: {
  title: string;
  summary: string;
  rows: ChartPoint[];
  valueLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)}>
      <figcaption className="text-xs font-medium text-muted-foreground">
        {title}
      </figcaption>

      <div className="w-full overflow-x-auto">
        <div aria-hidden className="min-w-full">
          {children}
        </div>
      </div>

      <table className="sr-only">
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
              <td>{row.value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
