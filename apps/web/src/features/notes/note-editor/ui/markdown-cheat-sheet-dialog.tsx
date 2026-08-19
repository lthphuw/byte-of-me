'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * Syntax strings are LITERALS, deliberately outside i18n: `**bold**` is
 * markdown, not English, and a translator "fixing" it would break the row.
 * Only the descriptions translate. Row ids double as i18n keys under
 * `dashboard.note.cheatSheet.rows.*`.
 */
const SECTIONS = [
  {
    id: 'basics',
    rows: [
      { id: 'heading', syntax: '# … ######' },
      { id: 'bold', syntax: '**bold**' },
      { id: 'italic', syntax: '*italic*' },
      { id: 'strike', syntax: '~~strike~~' },
      { id: 'code', syntax: '`code`' },
    ],
  },
  {
    id: 'blocks',
    rows: [
      { id: 'quote', syntax: '> ' },
      { id: 'list', syntax: '- item / 1. item' },
      { id: 'fence', syntax: '```lang' },
      { id: 'rule', syntax: '---' },
    ],
  },
  {
    id: 'linksMedia',
    rows: [
      { id: 'noteLink', syntax: '[[' },
      { id: 'image', syntax: '' },
    ],
  },
  {
    id: 'tables',
    rows: [{ id: 'table', syntax: '| a | b |' }],
  },
  {
    id: 'math',
    rows: [
      { id: 'mathInline', syntax: '$x^2$' },
      { id: 'mathBlock', syntax: '$$ … $$' },
    ],
  },
] as const;

/**
 * The "how do I type that?" reference for non-technical writing — every
 * markdown shortcut the notes editor understands, in one dialog. Controlled
 * by the widget so the command palette can open it even with no note open.
 */
export function MarkdownCheatSheetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('dashboard.note.cheatSheet');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <section key={section.id}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(`sections.${section.id}`)}
              </h3>
              <dl className="flex flex-col gap-1.5">
                {section.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,140px)_1fr] items-baseline gap-3"
                  >
                    <dt>
                      {row.syntax ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {row.syntax}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('noSyntax')}
                        </span>
                      )}
                    </dt>
                    <dd className="text-sm text-muted-foreground">
                      {t(`rows.${row.id}`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
