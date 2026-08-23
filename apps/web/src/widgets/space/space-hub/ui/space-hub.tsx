import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@byte-of-me/ui';
import {
  Archive,
  ArrowRight,
  HeartPulse,
  Link2,
  NotebookPen,
} from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';

import { getSpaceStats } from '@/entities/note';
import { getOwnerDisplayName } from '@/entities/user-profile/api/get-owner-display-name';
import { Link } from '@/shared/i18n/navigation';

/**
 * The `/space` landing page: a greeting, the numbers that say how alive the
 * workspace is, the notes touched most recently, and one card per module.
 * Server component — data arrives with the HTML; `space/loading.tsx` covers
 * the wait.
 */
export async function SpaceHub({ navSlot }: { navSlot?: React.ReactNode }) {
  const t = await getTranslations('dashboard.space.hub');
  const format = await getFormatter();

  // The greeting name only. `space/layout.tsx`'s `generateMetadata` asks for
  // the same thing in the same request, and `getOwnerDisplayName` is
  // `cache()`d, so the pair costs one query rather than two full profile
  // joins — see that function's own comment.
  const [statsRes, userName] = await Promise.all([
    getSpaceStats(),
    getOwnerDisplayName(),
  ]);

  return (
    <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
        <header className="flex items-center gap-2">
          {navSlot}
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">
              {t('greeting', { name: userName })}
            </h1>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </header>

        {!statsRes.success ? (
          <p className="text-sm text-destructive">{t('errors.load')}</p>
        ) : (
          <>
            <section
              aria-label={t('stats.ariaLabel')}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <StatCard
                icon={<NotebookPen className="size-4" />}
                label={t('stats.notes')}
                value={statsRes.data.noteCount}
              />
              <StatCard
                icon={<Link2 className="size-4" />}
                label={t('stats.links')}
                value={statsRes.data.linkCount}
              />
              <StatCard
                icon={<Archive className="size-4" />}
                label={t('stats.archived')}
                value={statsRes.data.archivedCount}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('recent.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsRes.data.recentNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('recent.empty')}
                    </p>
                  ) : (
                    <ul className="flex flex-col">
                      {statsRes.data.recentNotes.map((note) => (
                        <li key={note.id}>
                          <Link
                            href={`/space/notes/${note.id}`}
                            className="flex items-baseline justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                          >
                            <span className="truncate text-sm">
                              {note.title || t('recent.untitled')}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {format.dateTime(note.updatedAt, {
                                dateStyle: 'medium',
                              })}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* One card per module — the same list, and the same test, as
                  `use-space-nav-items.ts`. Future space modules (schedule,
                  gym log) are one more card here plus a nav item.

                  The knowledge graph had a card of its own here, beside
                  Notes, which is what made it look like a third module. It is
                  a view of the notes, so the way in is the notes workspace's
                  own List ⇄ Graph switch, and the Notes card below says so
                  rather than linking there a second time. A secondary link
                  INSIDE this card was the alternative and was rejected: the
                  card is one big anchor, and an anchor inside an anchor is
                  invalid markup with no defined keyboard behaviour — the
                  stretched-link rewrite it would need buys a shortcut to a
                  destination that is now two obvious clicks away.

                  Whichever way that goes, the reason this was never an
                  embedded canvas still holds: the hub is an RSC whose whole
                  job is to be instant, and mounting a live force simulation
                  on it would ship d3 plus a running physics loop to a page
                  the author only passes through. The spec's "mini-graph card"
                  (§6.6) is satisfied by the entry point; embedding the canvas
                  is deliberately deferred. */}
              <Link
                href="/space/notes"
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <NotebookPen className="size-4" />
                        {t('modules.notesTitle')}
                      </span>
                      <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardTitle>
                    <CardDescription>
                      {t('modules.notesDescription')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link
                href="/space/health"
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <HeartPulse className="size-4" />
                        {t('modules.healthTitle')}
                      </span>
                      <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardTitle>
                    <CardDescription>
                      {t('modules.healthDescription')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
